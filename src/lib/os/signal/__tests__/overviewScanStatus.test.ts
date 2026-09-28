import {
  createSingleFlightRequestByKey,
  createSingleFlightRequest,
  createSubmissionLock,
  canStartWebsiteAnalysis,
  getOverviewScanStatusLabel,
  getActiveTrackedWebsiteScans,
  getTrackedWebsiteScan,
  isActiveWebsiteScanStatus,
  normalizeWebsiteDomain,
  startRecursivePolling,
  toOverviewScanStatus,
} from '../overviewScanStatus'

describe('Overview website scan status mapping', () => {
  it('treats only queued and processing scans as active', () => {
    expect(isActiveWebsiteScanStatus('queued')).toBe(true)
    expect(isActiveWebsiteScanStatus('processing')).toBe(true)
    expect(isActiveWebsiteScanStatus('waiting')).toBe(false)
    expect(isActiveWebsiteScanStatus('completed')).toBe(false)
    expect(isActiveWebsiteScanStatus('failed')).toBe(false)
    expect(isActiveWebsiteScanStatus('unavailable')).toBe(false)
  })

  it('blocks resubmitting the same active website but allows a different domain', () => {
    const activeDomain = normalizeWebsiteDomain('https://maadyz.com/')

    expect(canStartWebsiteAnalysis(activeDomain, activeDomain, 'queued')).toBe(false)
    expect(canStartWebsiteAnalysis(activeDomain, activeDomain, 'processing')).toBe(false)
    expect(canStartWebsiteAnalysis('newsite.example', activeDomain, 'processing')).toBe(true)
    expect(canStartWebsiteAnalysis(activeDomain, activeDomain, 'completed')).toBe(true)
    expect(normalizeWebsiteDomain('http://MAADYZ.com/path')).toBe('maadyz.com')
  })

  it('keeps an active scan while another domain is selected and restores it when switched back', () => {
    const scanA = {
      id: 'scan-a',
      websiteDomain: 'maadyz.com',
      status: 'processing' as const,
      errorMessage: null,
    }
    const scanB = {
      id: 'scan-b',
      websiteDomain: 'newsite.example',
      status: 'queued' as const,
      errorMessage: null,
    }
    const scansByDomain = {
      [scanA.websiteDomain]: scanA,
      [scanB.websiteDomain]: scanB,
    }

    expect(getTrackedWebsiteScan(scansByDomain, 'newsite.example')).toBe(scanB)
    expect(getActiveTrackedWebsiteScans(scansByDomain)).toEqual([scanA, scanB])
    expect(getTrackedWebsiteScan(scansByDomain, 'maadyz.com')).toBe(scanA)
    expect(scanA.id).toBe('scan-a')
  })

  it('maps no scan to Waiting', () => {
    expect(toOverviewScanStatus(null)).toBe('waiting')
    expect(getOverviewScanStatusLabel(toOverviewScanStatus(null))).toBe('Waiting')
  })

  it('maps queued to Queued', () => {
    expect(toOverviewScanStatus('queued')).toBe('queued')
    expect(getOverviewScanStatusLabel(toOverviewScanStatus('queued'))).toBe('Queued')
  })

  it('maps processing to Analyzing', () => {
    expect(toOverviewScanStatus('processing')).toBe('processing')
    expect(getOverviewScanStatusLabel(toOverviewScanStatus('processing'))).toBe('Analyzing')
  })

  it('maps completed to Completed', () => {
    expect(toOverviewScanStatus('completed')).toBe('completed')
    expect(getOverviewScanStatusLabel(toOverviewScanStatus('completed'))).toBe('Completed')
  })

  it('maps failed to Failed', () => {
    expect(toOverviewScanStatus('failed')).toBe('failed')
    expect(getOverviewScanStatusLabel(toOverviewScanStatus('failed'))).toBe('Failed')
  })

  it('shares an in-flight status request across effect restarts', async () => {
    let resolveRequest: (value: string) => void = () => undefined
    const request = jest.fn(
      () => new Promise<string>((resolve) => { resolveRequest = resolve })
    )
    const requestOnce = createSingleFlightRequest(request)

    const first = requestOnce()
    const restartedEffect = requestOnce()

    expect(request).toHaveBeenCalledTimes(1)
    expect(restartedEffect).toBe(first)

    resolveRequest('processing')
    await expect(first).resolves.toBe('processing')

    const nextPoll = requestOnce()
    expect(request).toHaveBeenCalledTimes(2)
    resolveRequest('completed')
    await expect(nextPoll).resolves.toBe('completed')
  })

  it('shares requests for the same exact scan ID only while that request is in flight', async () => {
    let resolveRequest: (value: string) => void = () => undefined
    const request = jest.fn(
      () => new Promise<string>((resolve) => { resolveRequest = resolve })
    )
    const requestOnce = createSingleFlightRequestByKey(request)

    const first = requestOnce('scan-a')
    expect(requestOnce('scan-a')).toBe(first)
    expect(request).toHaveBeenCalledTimes(1)

    resolveRequest('processing')
    await expect(first).resolves.toBe('processing')

    const second = requestOnce('scan-a')
    expect(request).toHaveBeenCalledTimes(2)
    resolveRequest('completed')
    await expect(second).resolves.toBe('completed')
  })

  it('polls after the delay, waits for completion before the next delay, and stops on terminal state', async () => {
    jest.useFakeTimers()
    try {
      let finishPoll: (status: string) => void = () => undefined
      const poll = jest.fn(
        () => new Promise<string>((resolve) => { finishPoll = resolve })
      )
      const onResult = jest.fn()
      const stop = startRecursivePolling({
        intervalMs: 5000,
        poll,
        shouldContinue: (status) => status === 'queued' || status === 'processing',
        onResult,
        onError: jest.fn(),
      })

      await jest.advanceTimersByTimeAsync(4999)
      expect(poll).not.toHaveBeenCalled()

      await jest.advanceTimersByTimeAsync(1)
      expect(poll).toHaveBeenCalledTimes(1)
      await jest.advanceTimersByTimeAsync(15000)
      expect(poll).toHaveBeenCalledTimes(1)

      finishPoll('processing')
      await Promise.resolve()
      await jest.advanceTimersByTimeAsync(5000)
      expect(poll).toHaveBeenCalledTimes(2)

      finishPoll('completed')
      await Promise.resolve()
      expect(onResult).toHaveBeenLastCalledWith('completed')
      await jest.advanceTimersByTimeAsync(15000)
      expect(poll).toHaveBeenCalledTimes(2)
      stop()
    } finally {
      jest.useRealTimers()
    }
  })

  it('clears its pending poll on cleanup', async () => {
    jest.useFakeTimers()
    try {
      const poll = jest.fn(async () => 'queued')
      const stop = startRecursivePolling({
        intervalMs: 5000,
        poll,
        shouldContinue: () => true,
        onResult: jest.fn(),
        onError: jest.fn(),
      })

      stop()
      await jest.advanceTimersByTimeAsync(5000)
      expect(poll).not.toHaveBeenCalled()
      expect(jest.getTimerCount()).toBe(0)
    } finally {
      jest.useRealTimers()
    }
  })

  it('synchronously locks duplicate submissions until the first completes', () => {
    const lock = createSubmissionLock()

    expect(lock.acquire()).toBe(true)
    expect(lock.acquire()).toBe(false)
    lock.release()
    expect(lock.acquire()).toBe(true)
  })
})