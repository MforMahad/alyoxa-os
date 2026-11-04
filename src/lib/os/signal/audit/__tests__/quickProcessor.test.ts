jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/serviceRole', () => ({ createServiceRoleClient: jest.fn() }))
jest.mock('../transport', () => ({ fetchAuditPage: jest.fn() }))
jest.mock('../../websiteRecommendations', () => ({ recommendWebsiteImprovements: jest.fn() }))
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'
import { fetchAuditPage } from '../transport'
import { processCoordinatedQuickScan } from '../quickProcessor'
import { recommendWebsiteImprovements } from '../../websiteRecommendations'

const claim = { audit_id: 'scan', page_id: 'scan', lease_token: 'lease', url: 'https://fixture.example.org/', origin: 'https://fixture.example.org', depth: 0, redirect_count: 0, robots_body: '' }
function harness(claimed: unknown = claim, failure = false) {
  const rpc = jest.fn((operation: string) => ({ abortSignal: jest.fn().mockResolvedValue({
    data: operation === 'claim_website_quick_scan' ? claimed : { status: 'completed', scanId: 'scan', observationPublicId: 'obs' },
    error: failure && operation === 'finish_website_quick_scan' ? { code: 'STALE', message: 'Lease is stale' } : null,
  }) }))
  jest.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never)
  return rpc
}
beforeEach(() => jest.clearAllMocks())
it('defers host contention without fetching or failing the queue item', async () => {
  const rpc = harness(null)
  expect(await processCoordinatedQuickScan('scan')).toEqual({ status: 'deferred', scanId: 'scan' })
  expect(fetchAuditPage).not.toHaveBeenCalled(); expect(rpc).toHaveBeenCalledTimes(1)
})
it('passes lease fencing and retained evidence to a single atomic finish', async () => {
  const rpc = harness()
  jest.mocked(fetchAuditPage).mockResolvedValue({ kind: 'completed', url: claim.url, title: 'Real page', description: 'Measured', links: [{ url: claim.url + 'other', priority: 10 }], discovery_truncated: false, metadata: { evidence: [], limitations: ['HTML only'], excluded_from_ai: true } })
  jest.mocked(recommendWebsiteImprovements).mockResolvedValue({ status: 'excluded', recommendations: [] })
  expect(await processCoordinatedQuickScan('scan')).toMatchObject({ status: 'completed' })
  expect(fetchAuditPage).toHaveBeenCalledWith(claim, { quick: true })
  expect(rpc).toHaveBeenLastCalledWith('finish_website_quick_scan', expect.objectContaining({ p_scan_id: 'scan', p_lease_token: 'lease', p_result: expect.objectContaining({ links: [], metadata: expect.objectContaining({ ai: { status: 'excluded', recommendations: [] } }) }) }))
})
it('propagates stale/uncertain commits without compensating unfenced updates', async () => {
  const rpc = harness(claim, true)
  jest.mocked(fetchAuditPage).mockResolvedValue({ kind: 'retry', reason: 'http_429', not_before: '2026-10-30T02:00:00Z' })
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  try { await expect(processCoordinatedQuickScan('scan')).rejects.toThrow('could not be confirmed'); expect(rpc).toHaveBeenCalledTimes(2) }
  finally { log.mockRestore() }
})
