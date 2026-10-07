import { jest } from '@jest/globals'
import {
  dispatchOldestQueuedWebsiteScan,
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
        return { maybeSingle: updateMaybeSingle }
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

  return { queueClient, selectQuery, update, updateCalls }
}

describe('dispatchOldestQueuedWebsiteScan', () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }))

  beforeEach(() => {
    jest.clearAllMocks()
  })

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

  it('marks the scan failed when the dispatch request throws before a response is received', async () => {
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

    expect(result).toEqual({ status: 'dispatch_failed', scanId: 'scan-1' })
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].values.status).toBe('failed')
    expect(updateCalls[0].eqCalls).toEqual([
      ['id', 'scan-1'],
      ['status', 'queued'],
    ])
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
    const { queueClient, update } = createQueueClient([])
    queueClient.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              maybeSingle: jest.fn(async () => ({
                data: null,
                error: { code: '500' },
              })),
            })),
          })),
        })),
      })),
      update,
    }))

    const result = await dispatchOldestQueuedWebsiteScan({
      queueClient,
      appUrl: 'https://alyoxa.example',
      triggerSecret: 'test-secret',
      fetchImpl,
    })

    expect(result).toEqual({ status: 'queue_error', code: '500' })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
