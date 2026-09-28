export interface QueuedWebsiteScan {
  id: string
  created_at: string
}

interface QueueQueryResult {
  data: QueuedWebsiteScan | null
  error: { code?: string } | null
}

interface QueueQuery {
  eq(column: 'status', value: 'queued'): QueueQuery
  order(
    column: 'created_at',
    options: { ascending: true }
  ): QueueQuery
  limit(count: 1): QueueQuery
  maybeSingle(): Promise<QueueQueryResult>
}

export interface WebsiteScanQueueClient {
  from(table: 'website_scans'): {
    select(columns: 'id, created_at'): QueueQuery
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

    return response.ok
      ? { status: 'dispatched', scanId: scan.id, httpStatus: response.status }
      : { status: 'dispatch_failed', scanId: scan.id, httpStatus: response.status }
  } catch {
    return { status: 'dispatch_failed', scanId: scan.id }
  }
}