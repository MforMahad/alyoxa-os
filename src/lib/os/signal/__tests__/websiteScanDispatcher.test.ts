import { jest } from '@jest/globals'
import {
  dispatchOldestQueuedWebsiteScan,
  type QueuedWebsiteScan,
  type WebsiteScanQueueClient,
} from '../websiteScanDispatcher'

function createQueueClient(scans: QueuedWebsiteScan[]) {
  let selectedScans = [...scans]
  const maybeSingle = jest.fn(async () => ({
    data: selectedScans[0] ?? null,
    error: null,
  }))
  const query = {
    eq: jest.fn((_column: 'status', value: 'queued') => {
      expect(value).toBe('queued')
      return query
    }),
    order: jest.fn((
      _column: 'created_at',
      options: { ascending: boolean }
    ) => {
      expect(options).toEqual({ ascending: true })
      selectedScans = [...selectedScans].sort((left, right) =>
        left.created_at.localeCompare(right.created_at)
      )
      return query
    }),
    limit: jest.fn((count: 1) => {
      expect(count).toBe(1)
      selectedScans = selectedScans.slice(0, count)
      return query
    }),
    maybeSingle,
  }
  const queueClient: WebsiteScanQueueClient = {
    from: jest.fn(() => ({
      select: jest.fn(() => query),
    })),
  }

  return { queueClient, query, maybeSingle }
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
    const { queueClient } = createQueueClient([
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
  })

  it('dispatches only the oldest of multiple queued scans', async () => {
    const { queueClient, query } = createQueueClient([
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
    expect(query.limit).toHaveBeenCalledWith(1)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][0]).toEqual(
      new URL('https://alyoxa.example/api/internal/website-scans/oldest')
    )
  })

  it('does not mutate scan state when endpoint dispatch fails', async () => {
    const scan = { id: 'scan-1', created_at: '2026-09-28T10:00:00Z' }
    const { queueClient } = createQueueClient([scan])
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
    expect(scan).toEqual({ id: 'scan-1', created_at: '2026-09-28T10:00:00Z' })
    expect(queueClient.from).toHaveBeenCalledTimes(1)
  })
})