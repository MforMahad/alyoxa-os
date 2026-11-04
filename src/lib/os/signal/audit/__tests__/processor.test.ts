import { processAuditBatch } from '../processor'
import type { AuditClaim, AuditRepository } from '../contracts'

const claim: AuditClaim = { audit_id: 'audit', page_id: 'page', lease_token: 'token', url: 'https://fixture.example.org/', origin: 'https://fixture.example.org', depth: 0, redirect_count: 0, robots_body: '' }
function repository(): jest.Mocked<AuditRepository> {
  return { claim: jest.fn().mockResolvedValue(claim), finish: jest.fn().mockResolvedValue(undefined), finalize: jest.fn().mockResolvedValue(null) }
}
it('processes at most two work items and finalizes only after retained outcomes', async () => {
  const db = repository()
  const fetchPage = jest.fn().mockResolvedValue({ kind: 'skipped', reason: 'robots_disallow' })
  expect(await processAuditBatch(db, { fetchPage, now: () => 0 })).toEqual({ processed: 2, finalized: null })
  expect(db.claim).toHaveBeenCalledTimes(2)
  expect(db.finish).toHaveBeenCalledWith(claim, { kind: 'skipped', reason: 'robots_disallow' })
})
it('stops claiming when the remaining deadline cannot safely fit another fetch/commit', async () => {
  const db = repository()
  let clock = 0
  await processAuditBatch(db, { now: () => clock, fetchPage: async () => { clock = 6000; return { kind: 'skipped', reason: 'blocked' } } })
  expect(db.claim).toHaveBeenCalledTimes(1)
})
it('does not mask an uncertain page commit by issuing another write', async () => {
  const db = repository()
  db.finish.mockRejectedValue(new Error('Commit response lost'))
  await expect(processAuditBatch(db, { fetchPage: async () => ({ kind: 'failed', reason: 'http_404' }), now: () => 0 })).rejects.toThrow('Commit response lost')
  expect(db.claim).toHaveBeenCalledTimes(1)
  expect(db.finish).toHaveBeenCalledTimes(1)
  expect(db.finalize).not.toHaveBeenCalled()
})
