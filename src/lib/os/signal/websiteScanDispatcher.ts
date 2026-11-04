export interface QueuedWebsiteScan { id: string; created_at: string }
interface QueueError { code?: string }
interface QueueSelectResult { data: QueuedWebsiteScan | null; error: QueueError | null }
interface QueueSelectQuery {
  eq(column: 'status', value: 'queued'): QueueSelectQuery
  order(column: 'created_at', options: { ascending: true }): QueueSelectQuery
  limit(count: 1): QueueSelectQuery
  abortSignal(signal: AbortSignal): QueueSelectQuery
  maybeSingle(): Promise<QueueSelectResult>
}
export interface WebsiteScanDispatchFailureUpdate { status: 'failed'; completed_at: string; error_message: string }
interface QueueUpdateResult { data: { id: string } | null; error: QueueError | null }
interface QueueUpdateResultQuery {
  abortSignal(signal: AbortSignal): QueueUpdateResultQuery
  maybeSingle(): Promise<QueueUpdateResult>
}
interface QueueUpdateQuery {
  eq(column: 'id' | 'status', value: string): QueueUpdateQuery
  select(columns: 'id'): QueueUpdateResultQuery
}
export interface WebsiteScanQueueClient {
  from(table: 'website_scans'): {
    select(columns: 'id, created_at'): QueueSelectQuery
    update(values: WebsiteScanDispatchFailureUpdate): QueueUpdateQuery
  }
}
export interface CoordinatedScanQueueClient {
  rpc(name: 'next_website_quick_scan'): {
    abortSignal(signal: AbortSignal): PromiseLike<{ data: string | null; error: QueueError | null }>
  }
}
export type WebsiteScanDispatchResult =
  | { status: 'idle' }
  | { status: 'queue_error'; code?: string }
  | { status: 'dispatched'; scanId: string; httpStatus: number }
  | { status: 'dispatch_failed'; scanId: string; httpStatus?: number }
  | { status: 'dispatch_uncertain'; scanId?: string; stage: 'queue' | 'http' | 'cleanup'; reason: 'timeout' | 'request_error' }

type DispatchFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status'>>
class DispatchTimeout extends Error {}

/** One deadline for queue lookup, HTTP response and any failure bookkeeping. */
export class WebsiteScanDispatchBudget {
  private readonly deadline = Date.now() + 25000

  async run<T>(operation: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
    const remaining = this.deadline - Date.now()
    if (remaining <= 0) throw new DispatchTimeout('Dispatch budget exhausted.')
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        Promise.resolve().then(() => {
          if (this.deadline <= Date.now()) throw new DispatchTimeout('Dispatch budget exhausted.')
          return operation(controller.signal)
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const error = new DispatchTimeout('Dispatch budget exhausted.')
            controller.abort(error)
            reject(error)
          }, remaining)
        }),
      ])
    } finally { if (timer) clearTimeout(timer) }
  }
}

function uncertain(error: unknown, stage: 'queue' | 'http' | 'cleanup', scanId?: string): WebsiteScanDispatchResult {
  const timeout = error instanceof DispatchTimeout || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))
  const result = { status: 'dispatch_uncertain' as const, ...(scanId ? { scanId } : {}), stage, reason: timeout ? 'timeout' as const : 'request_error' as const }
  // Whitelist metadata: no URL, credentials or raw network error is logged.
  console.warn('[WebsiteScanDispatcher] Dispatch outcome uncertain; no additional failure update.', result)
  return result
}

interface DispatchOptions {
  appUrl: string
  triggerSecret: string
  fetchImpl?: DispatchFetch
  budget?: WebsiteScanDispatchBudget
}

export async function dispatchOldestQueuedWebsiteScan({ queueClient, appUrl, triggerSecret, fetchImpl = fetch, budget = new WebsiteScanDispatchBudget() }:
  DispatchOptions & { queueClient: WebsiteScanQueueClient }): Promise<WebsiteScanDispatchResult> {
  let selected: QueueSelectResult
  try {
    selected = await budget.run(signal => queueClient.from('website_scans').select('id, created_at')
      .eq('status', 'queued').order('created_at', { ascending: true }).limit(1).abortSignal(signal).maybeSingle())
  } catch (error) { return uncertain(error, 'queue') }
  if (selected.error) return { status: 'queue_error', code: selected.error.code }
  if (!selected.data) return { status: 'idle' }
  return dispatchScan(selected.data.id, appUrl, triggerSecret, fetchImpl, budget, queueClient)
}

export async function dispatchCoordinatedQueuedWebsiteScan({ queueClient, appUrl, triggerSecret, fetchImpl = fetch, budget = new WebsiteScanDispatchBudget() }:
  DispatchOptions & { queueClient: CoordinatedScanQueueClient }): Promise<WebsiteScanDispatchResult> {
  let selected: { data: string | null; error: QueueError | null }
  try { selected = await budget.run(signal => queueClient.rpc('next_website_quick_scan').abortSignal(signal)) }
  catch (error) { return uncertain(error, 'queue') }
  if (selected.error) return { status: 'queue_error', code: selected.error.code }
  if (!selected.data) return { status: 'idle' }
  return dispatchScan(selected.data, appUrl, triggerSecret, fetchImpl, budget)
}

async function dispatchScan(scanId: string, appUrl: string, triggerSecret: string, fetchImpl: DispatchFetch, budget: WebsiteScanDispatchBudget, failureClient?: WebsiteScanQueueClient): Promise<WebsiteScanDispatchResult> {
  let stage: 'http' | 'cleanup' = 'http'
  try {
    const endpoint = new URL(`/api/internal/website-scans/${encodeURIComponent(scanId)}`, appUrl)
    const response = await budget.run(signal => fetchImpl(endpoint, {
      method: 'POST', headers: { authorization: `Bearer ${triggerSecret}` }, signal,
    }))
    if (response.ok) return { status: 'dispatched', scanId, httpStatus: response.status }
    // A gateway/request timeout cannot prove the processor did not receive it.
    if ([408, 504].includes(response.status)) return uncertain(new DispatchTimeout('Upstream timeout.'), 'http', scanId)
    if (failureClient) {
      stage = 'cleanup'
      await markQueuedScanFailed(failureClient, scanId, `Website scan dispatch failed with HTTP ${response.status}.`, budget)
    }
    return { status: 'dispatch_failed', scanId, httpStatus: response.status }
  } catch (error) {
    // Missing response is uncertain; never issue a compensating failure write.
    return uncertain(error, stage, scanId)
  }
}

async function markQueuedScanFailed(queueClient: WebsiteScanQueueClient, scanId: string, message: string, budget: WebsiteScanDispatchBudget): Promise<void> {
  const { error } = await budget.run(signal => queueClient.from('website_scans').update({
    status: 'failed', completed_at: new Date().toISOString(), error_message: message.slice(0, 1000),
  }).eq('id', scanId).eq('status', 'queued').select('id').abortSignal(signal).maybeSingle())
  if (error) console.error('[WebsiteScanDispatcher] Failed recording HTTP dispatch rejection.', { scanId, code: error.code })
}
