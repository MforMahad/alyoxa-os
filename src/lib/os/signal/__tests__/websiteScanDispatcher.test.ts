import { jest } from '@jest/globals'
import {
  dispatchOldestQueuedWebsiteScan,
  dispatchCoordinatedQueuedWebsiteScan,
  WebsiteScanDispatchBudget,
  type QueuedWebsiteScan,
  type WebsiteScanDispatchFailureUpdate,
  type WebsiteScanQueueClient,
} from '../websiteScanDispatcher'

interface RecordedUpdate {
  values: WebsiteScanDispatchFailureUpdate
  eqCalls: Array<[string, string]>
}

function createQueueClient(scans: QueuedWebsiteScan[]) {
  let selectedScans = [...scans]
  const maybeSingle = jest.fn(async () => ({
    data: selectedScans[0] ?? null,
    error: null,
  }))
  const selectQuery = {
    eq: jest.fn((_column: 'status', value: 'queued') => {
      expect(value).toBe('queued')
      return selectQuery
    }),
    order: jest.fn((
      _column: 'created_at',
      options: { ascending: boolean }
    ) => {
      expect(options).toEqual({ ascending: true })
      selectedScans = [...selectedScans].sort((left, right) =>
        left.created_at.localeCompare(right.created_at)
      )
      return selectQuery
    }),
    limit: jest.fn((count: 1) => {
      expect(count).toBe(1)
      selectedScans = selectedScans.slice(0, count)
      return selectQuery
    }),
    maybeSingle,
    abortSignal: jest.fn(() => selectQuery),
  }

  const updateCalls: RecordedUpdate[] = []
  const updateMaybeSingle = jest.fn(async () => ({
    data: { id: 'updated' },
    error: null,
  }))

  const update = jest.fn((values: WebsiteScanDispatchFailureUpdate) => {
    const eqCalls: Array<[string, string]> = []
    const updateQuery = {
      eq: jest.fn((column: string, value: string) => {
        eqCalls.push([column, value])
        return updateQuery
      }),
      select: jest.fn((columns: 'id') => {
        expect(columns).toBe('id')
        const resultQuery = { maybeSingle: updateMaybeSingle, abortSignal: jest.fn(() => resultQuery) }
        return resultQuery
      }),
    }
    updateCalls.push({ values, eqCalls })
    return updateQuery
  })

  const queueClient: WebsiteScanQueueClient = {
    from: jest.fn(() => ({
      select: jest.fn(() => selectQuery),
      update,
    })),
  }

  return { queueClient, selectQuery, update, updateCalls, updateMaybeSingle }
}

describe('dispatchOldestQueuedWebsiteScan', () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }))

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('does not dispatch when the queue is empty', async () => {
    const { queueClient } = createQueueClient([])

    const result = await dispatchOldestQueuedWebsiteScan({
      queueClient,
      appUrl: 'https://alyoxa.example',
      triggerSecret: 'test-secret',
      fetchImpl,
    })

    expect(result).toEqual({ status: 'idle' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('dispatches a queued scan to the existing protected endpoint', async () => {
    const { queueClient, update } = createQueueClient([
      { id: 'scan-1', created_at: '2026-09-28T10:00:00Z' },
    ])

    const result = await dispatchOldestQueuedWebsiteScan({
      queueClient,
      appUrl: 'https://alyoxa.example',
      triggerSecret: 'test-secret',
      fetchImpl,
    })

    expect(result).toEqual({
      status: 'dispatched',
      scanId: 'scan-1',
      httpStatus: 200,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('https://alyoxa.example/api/internal/website-scans/scan-1'),
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-secret' },
        signal: expect.any(AbortSignal),
      }
    )
    // A successful dispatch must never touch scan state itself - the
    // processor owns the queued -> processing -> completed transitions.
    expect(update).not.toHaveBeenCalled()
  })

  it('dispatches only the oldest of multiple queued scans (queue selection remains oldest-first)', async () => {
    const { queueClient, selectQuery } = createQueueClient([
      { id: 'newest', created_at: '2026-09-28T12:00:00Z' },
      { id: 'oldest', created_at: '2026-09-28T09:00:00Z' },
      { id: 'middle', created_at: '2026-09-28T10:00:00Z' },
    ])

    const result = await dispatchOldestQueuedWebsiteScan({
      queueClient,
      appUrl: 'https://alyoxa.example',
      triggerSecret: 'test-secret',
      fetchImpl,
    })

    expect(result).toEqual({
      status: 'dispatched',
      scanId: 'oldest',
      httpStatus: 200,
    })
    expect(selectQuery.limit).toHaveBeenCalledWith(1)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][0]).toEqual(
      new URL('https://alyoxa.example/api/internal/website-scans/oldest')
    )
  })

  it('marks the scan failed (with a diagnosable message) when the endpoint rejects the dispatch', async () => {
    const scan = { id: 'scan-1', created_at: '2026-09-28T10:00:00Z' }
    const { queueClient, updateCalls } = createQueueClient([scan])
    const rejectingFetch = jest.fn(async () => ({ ok: false, status: 503 }))

    const result = await dispatchOldestQueuedWebsiteScan({
      queueClient,
      appUrl: 'https://alyoxa.example',
      triggerSecret: 'test-secret',
      fetchImpl: rejectingFetch,
    })

    expect(result).toEqual({
      status: 'dispatch_failed',
      scanId: 'scan-1',
      httpStatus: 503,
    })
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].values).toMatchObject({
      status: 'failed',
      error_message: expect.stringContaining('HTTP 503'),
    })
    // Conditioned on id + still-queued, same optimistic-concurrency shape
    // as the processor's own claim/complete/fail updates.
    expect(updateCalls[0].eqCalls).toEqual([
      ['id', 'scan-1'],
      ['status', 'queued'],
    ])
  })

  it('preserves queued work when a request fails without a response', async () => {
    const scan = { id: 'scan-1', created_at: '2026-09-28T10:00:00Z' }
    const { queueClient, updateCalls } = createQueueClient([scan])
    const failingFetch = jest.fn(async () => {
      throw new Error('connection refused')
    })

    const result = await dispatchOldestQueuedWebsiteScan({
      queueClient,
      appUrl: 'https://alyoxa.example',
      triggerSecret: 'test-secret',
      fetchImpl: failingFetch,
    })

    expect(result).toEqual({ status: 'dispatch_uncertain', scanId: 'scan-1', stage: 'http', reason: 'request_error' })
    expect(updateCalls).toHaveLength(0)
  })

  it('does not permanently block newer queued scans behind a failing oldest scan', async () => {
    // Run 1: the oldest scan is still queued and dispatch fails - it
    // should be transitioned to failed, not left queued.
    const runOne = createQueueClient([
      { id: 'oldest-broken', created_at: '2026-09-28T09:00:00Z' },
      { id: 'newer', created_at: '2026-09-28T10:00:00Z' },
    ])
    const rejectingFetch = jest.fn(async () => ({ ok: false, status: 500 }))

    const firstResult = await dispatchOldestQueuedWebsiteScan({
      queueClient: runOne.queueClient,
      appUrl: 'https://alyoxa.example',
      triggerSecret: 'test-secret',
      fetchImpl: rejectingFetch,
    })

    expect(firstResult).toEqual({
      status: 'dispatch_failed',
      scanId: 'oldest-broken',
      httpStatus: 500,
    })
    expect(runOne.updateCalls).toHaveLength(1)
    expect(runOne.updateCalls[0].values.status).toBe('failed')

    // Run 2: reflects the resulting DB state - 'oldest-broken' is no
    // longer queued (it is now failed), so the real query would no
    // longer return it. Only 'newer' remains eligible.
    const runTwo = createQueueClient([
      { id: 'newer', created_at: '2026-09-28T10:00:00Z' },
    ])
    const succeedingFetch = jest.fn(async () => ({ ok: true, status: 200 }))

    const secondResult = await dispatchOldestQueuedWebsiteScan({
      queueClient: runTwo.queueClient,
      appUrl: 'https://alyoxa.example',
      triggerSecret: 'test-secret',
      fetchImpl: succeedingFetch,
    })

    expect(secondResult).toEqual({
      status: 'dispatched',
      scanId: 'newer',
      httpStatus: 200,
    })
  })

  it('still returns queue_error without attempting a dispatch when the queue query fails', async () => {
    const broken = createQueueClient([])
    broken.selectQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: '500' } } as never)

    const result = await dispatchOldestQueuedWebsiteScan({
      queueClient: broken.queueClient,
      appUrl: 'https://alyoxa.example',
      triggerSecret: 'test-secret',
      fetchImpl,
    })

    expect(result).toEqual({ status: 'queue_error', code: '500' })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(broken.update).not.toHaveBeenCalled()
  })
})

describe('total Quick Scan dispatch budget', () => {
  const scan = { id: 'scan-budget', created_at: '2026-11-04T00:00:00Z' }
  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

  it.each([false, true])('bounds lookup plus HTTP to 25 seconds (coordinated=%s)', async coordinated => {
    const started = Date.now()
    const queue = createQueueClient([scan])
    queue.selectQuery.maybeSingle.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ data: scan, error: null }), 7000)))
    const rpc = jest.fn(() => ({ abortSignal: jest.fn(() => new Promise<{ data: string; error: null }>(resolve => setTimeout(() => resolve({ data: scan.id, error: null }), 7000))) }))
    let signal: AbortSignal | undefined
    const fetchImpl = jest.fn((_input: string | URL | Request, init?: RequestInit) => { signal = init?.signal as AbortSignal; return new Promise<never>(() => {}) })
    const options = { appUrl: 'https://dispatch.example.org', triggerSecret: 'must-not-log', fetchImpl }
    let settled = false
    const pending = (coordinated ? dispatchCoordinatedQueuedWebsiteScan({ ...options, queueClient: { rpc } }) : dispatchOldestQueuedWebsiteScan({ ...options, queueClient: queue.queueClient })).then(result => { settled = true; return result })
    await jest.advanceTimersByTimeAsync(7000)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(signal?.aborted).toBe(false)
    await jest.advanceTimersByTimeAsync(17999)
    expect(settled).toBe(false)
    await jest.advanceTimersByTimeAsync(1)
    expect(await pending).toEqual({ status: 'dispatch_uncertain', scanId: scan.id, stage: 'http', reason: 'timeout' })
    expect(Date.now() - started).toBe(25000)
    expect(signal?.aborted).toBe(true)
    expect(queue.update).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
    expect(JSON.stringify(jest.mocked(console.warn).mock.calls)).not.toContain('must-not-log')
    expect(JSON.stringify(jest.mocked(console.warn).mock.calls)).not.toContain('https://')
  })

  it.each([false, true])('aborts a stalled queue lookup without dispatching (coordinated=%s)', async coordinated => {
    const queue = createQueueClient([scan])
    queue.selectQuery.maybeSingle.mockImplementationOnce(() => new Promise<never>(() => {}))
    let rpcSignal: AbortSignal | undefined
    const rpc = jest.fn(() => ({ abortSignal: jest.fn((signal: AbortSignal) => { rpcSignal = signal; return new Promise<never>(() => {}) }) }))
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }))
    const options = { appUrl: 'https://dispatch.example.org', triggerSecret: 'test-only', fetchImpl }
    const pending = coordinated ? dispatchCoordinatedQueuedWebsiteScan({ ...options, queueClient: { rpc } }) : dispatchOldestQueuedWebsiteScan({ ...options, queueClient: queue.queueClient })
    await jest.advanceTimersByTimeAsync(25000)
    expect(await pending).toEqual({ status: 'dispatch_uncertain', stage: 'queue', reason: 'timeout' })
    expect(coordinated ? rpcSignal?.aborted : queue.selectQuery.abortSignal.mock.calls[0][0].aborted).toBe(true)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(queue.update).not.toHaveBeenCalled()
  })

  it('shares the same deadline with legacy rejection bookkeeping', async () => {
    const queue = createQueueClient([scan])
    queue.selectQuery.maybeSingle.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ data: scan, error: null }), 7000)))
    queue.updateMaybeSingle.mockImplementationOnce(() => new Promise<never>(() => {}))
    const fetchImpl = jest.fn(() => new Promise<{ ok: boolean; status: number }>(resolve => setTimeout(() => resolve({ ok: false, status: 500 }), 10000)))
    const pending = dispatchOldestQueuedWebsiteScan({ queueClient: queue.queueClient, appUrl: 'https://dispatch.example.org', triggerSecret: 'test-only', fetchImpl })
    await jest.advanceTimersByTimeAsync(25000)
    expect(await pending).toEqual({ status: 'dispatch_uncertain', scanId: scan.id, stage: 'cleanup', reason: 'timeout' })
    // One conditional write follows a definitive HTTP rejection; no second write
    // is issued when that write's own response becomes uncertain.
    expect(queue.update).toHaveBeenCalledTimes(1)
  })

  it('does not begin lookup or HTTP after the function budget has expired', async () => {
    const budget = new WebsiteScanDispatchBudget()
    await jest.advanceTimersByTimeAsync(25000)
    const queue = createQueueClient([scan])
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }))
    expect(await dispatchOldestQueuedWebsiteScan({ budget, queueClient: queue.queueClient, appUrl: 'https://dispatch.example.org', triggerSecret: 'test-only', fetchImpl })).toMatchObject({ status: 'dispatch_uncertain', stage: 'queue', reason: 'timeout' })
    expect(queue.queueClient.from).not.toHaveBeenCalled()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it.each([408, 504])('preserves queued work on an HTTP %s timeout response', async status => {
    const queue = createQueueClient([scan])
    expect(await dispatchOldestQueuedWebsiteScan({ queueClient: queue.queueClient, appUrl: 'https://dispatch.example.org', triggerSecret: 'test-only', fetchImpl: async () => ({ ok: false, status }) })).toMatchObject({ status: 'dispatch_uncertain', reason: 'timeout' })
    expect(queue.update).not.toHaveBeenCalled()
  })
})
