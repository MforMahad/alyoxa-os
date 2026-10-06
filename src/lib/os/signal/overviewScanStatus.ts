export type OverviewScanStatus =
  | 'waiting'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'unavailable'

export interface TrackedWebsiteScan {
  id: string
  websiteDomain: string
  status: OverviewScanStatus
  errorMessage: string | null
}

export function getTrackedWebsiteScan(
  scansByDomain: Record<string, TrackedWebsiteScan>,
  websiteDomain: string | null
): TrackedWebsiteScan | undefined {
  return websiteDomain ? scansByDomain[websiteDomain] : undefined
}

export function getActiveTrackedWebsiteScans(
  scansByDomain: Record<string, TrackedWebsiteScan>
): TrackedWebsiteScan[] {
  return Object.values(scansByDomain).filter((scan) =>
    isActiveWebsiteScanStatus(scan.status)
  )
}

export function normalizeWebsiteDomain(value: string): string | null {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.hostname.toLowerCase().replace(/\.$/, '') || null
  } catch {
    return null
  }
}

export function canStartWebsiteAnalysis(
  inputDomain: string | null,
  activeScanDomain: string | null,
  activeScanStatus: OverviewScanStatus | null
): boolean {
  return !(
    inputDomain &&
    activeScanDomain === inputDomain &&
    activeScanStatus &&
    isActiveWebsiteScanStatus(activeScanStatus)
  )
}

export function createSingleFlightRequest<T>(
  request: () => Promise<T>
): () => Promise<T> {
  let inFlight: Promise<T> | null = null

  return () => {
    if (inFlight) {
      return inFlight
    }

    const currentRequest = request()
    inFlight = currentRequest

    void currentRequest.then(
      () => {
        if (inFlight === currentRequest) inFlight = null
      },
      () => {
        if (inFlight === currentRequest) inFlight = null
      }
    )

    return currentRequest
  }
}

export function createSingleFlightRequestByKey<T>(
  request: (key: string) => Promise<T>
): (key: string) => Promise<T> {
  const inFlight = new Map<string, Promise<T>>()

  return (key) => {
    const existing = inFlight.get(key)
    if (existing) return existing

    const currentRequest = request(key)
    inFlight.set(key, currentRequest)

    void currentRequest.then(
      () => {
        if (inFlight.get(key) === currentRequest) inFlight.delete(key)
      },
      () => {
        if (inFlight.get(key) === currentRequest) inFlight.delete(key)
      }
    )

    return currentRequest
  }
}

export function createSubmissionLock() {
  let locked = false

  return {
    acquire() {
      if (locked) return false
      locked = true
      return true
    },
    release() {
      locked = false
    },
  }
}

interface RecursivePollingOptions<T> {
  intervalMs: number
  poll: () => Promise<T>
  shouldContinue: (result: T) => boolean
  onResult: (result: T) => void
  onError: (error: unknown) => void
}

export function startRecursivePolling<T>({
  intervalMs,
  poll,
  shouldContinue,
  onResult,
  onError,
}: RecursivePollingOptions<T>): () => void {
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined

  async function runPoll() {
    let result: T
    try {
      result = await poll()
    } catch (error) {
      if (!stopped) onError(error)
      return
    }

    if (stopped) return
    onResult(result)

    if (shouldContinue(result)) {
      timer = setTimeout(() => {
        timer = undefined
        void runPoll()
      }, intervalMs)
    }
  }

  timer = setTimeout(() => {
    timer = undefined
    void runPoll()
  }, intervalMs)

  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}

export function toOverviewScanStatus(
  status: string | null | undefined
): OverviewScanStatus {
  switch (status) {
    case 'queued':
    case 'processing':
    case 'completed':
    case 'failed':
      return status
    case null:
    case undefined:
      return 'waiting'
    default:
      return 'unavailable'
  }
}


export function isActiveWebsiteScanStatus(
  status: OverviewScanStatus
): boolean {
  return status === 'queued' || status === 'processing'
}

export function getOverviewScanStatusLabel(status: OverviewScanStatus): string {
  switch (status) {
    case 'waiting':
      return 'Waiting'
    case 'queued':
      return 'Queued'
    case 'processing':
      return 'Analyzing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'unavailable':
      return 'Unavailable'
  }
}