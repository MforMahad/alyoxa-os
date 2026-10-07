export interface QueuedWebsiteScan {
  id: string
  created_at: string
}

interface QueueSelectResult {
  data: QueuedWebsiteScan | null
  error: { code?: string } | null
}

interface QueueSelectQuery {
  eq(column: 'status', value: 'queued'): QueueSelectQuery
  order(
    column: 'created_at',
    options: { ascending: true }
  ): QueueSelectQuery
  limit(count: 1): QueueSelectQuery
  maybeSingle(): Promise<QueueSelectResult>
}

export interface WebsiteScanDispatchFailureUpdate {
  status: 'failed'
  completed_at: string
  error_message: string
}

interface QueueUpdateResult {
  data: { id: string } | null
  error: { code?: string } | null
}

interface QueueUpdateQuery {
  eq(column: 'id' | 'status', value: string): QueueUpdateQuery
  select(columns: 'id'): {
    maybeSingle(): Promise<QueueUpdateResult>
  }
}

export interface WebsiteScanQueueClient {
  from(table: 'website_scans'): {
    select(columns: 'id, created_at'): QueueSelectQuery
    update(values: WebsiteScanDispatchFailureUpdate): QueueUpdateQuery
  }
}

export type WebsiteScanDispatchResult =
  | { status: 'idle' }
  | { status: 'queue_error'; code?: string }
  | { status: 'dispatched'; scanId: string; httpStatus: number }
  | { status: 'dispatch_failed'; scanId: string; httpStatus?: number }

type DispatchFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Pick<Response, 'ok' | 'status'>>

interface DispatchOldestQueuedWebsiteScanOptions {
  queueClient: WebsiteScanQueueClient
  appUrl: string
  triggerSecret: string
  fetchImpl?: DispatchFetch
}

const DISPATCH_FAILURE_MESSAGE_MAX_LENGTH = 1000

export async function dispatchOldestQueuedWebsiteScan({
  queueClient,
  appUrl,
  triggerSecret,
  fetchImpl = fetch,
}: DispatchOldestQueuedWebsiteScanOptions): Promise<WebsiteScanDispatchResult> {
  const { data: scan, error } = await queueClient
    .from('website_scans')
    .select('id, created_at')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { status: 'queue_error', code: error.code }
  }

  if (!scan) {
    return { status: 'idle' }
  }

  try {
    const endpoint = new URL(
      `/api/internal/website-scans/${encodeURIComponent(scan.id)}`,
      appUrl
    )
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${triggerSecret}` },
    })

    if (response.ok) {
      return { status: 'dispatched', scanId: scan.id, httpStatus: response.status }
    }

    // The dispatch genuinely reached the endpoint and was rejected/failed.
    // Leaving the scan `queued` would make it the permanent head of the
    // queue, blocking every scan behind it on every future run. Transition
    // it out of `queued` so the next run can move on, and record why.
    await markQueuedScanFailed(
      queueClient,
      scan.id,
      `Website scan dispatch failed with HTTP ${response.status}.`
    )

    return { status: 'dispatch_failed', scanId: scan.id, httpStatus: response.status }
  } catch {
    // The dispatch attempt itself failed (network error, timeout, etc.)
    // before a response was ever received. Same head-of-line reasoning
    // applies: this scan must not block the queue forever.
    await markQueuedScanFailed(
      queueClient,
      scan.id,
      'Website scan dispatch request failed before reaching the scan processor.'
    )

    return { status: 'dispatch_failed', scanId: scan.id }
  }
}

async function markQueuedScanFailed(
  queueClient: WebsiteScanQueueClient,
  scanId: string,
  message: string
): Promise<void> {
  try {
    // Conditioned on status = 'queued' (same optimistic-concurrency
    // pattern as the processor's claim/complete/fail updates) so this
    // can never overwrite a scan that was claimed, completed, or already
    // failed by the processor in the meantime.
    const { error } = await queueClient
      .from('website_scans')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: message.slice(0, DISPATCH_FAILURE_MESSAGE_MAX_LENGTH),
      })
      .eq('id', scanId)
      .eq('status', 'queued')
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[WebsiteScanDispatcher] Failed marking scan as failed after dispatch failure.', {
        scanId,
        code: error.code,
      })
    }
  } catch {
    console.error('[WebsiteScanDispatcher] Failed marking scan as failed after dispatch failure.', {
      scanId,
    })
  }
}
