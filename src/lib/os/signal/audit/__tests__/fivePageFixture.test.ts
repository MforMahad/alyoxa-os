jest.mock('../../websiteFetch', () => ({ resolvePublicAddress: jest.fn(), requestPage: jest.fn(), WebsiteHttpError: class extends Error {} }))
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { requestPage, resolvePublicAddress } from '../../websiteFetch'
import { processAuditBatch } from '../processor'
import type { AuditClaim, AuditOutcome, AuditRepository } from '../contracts'

it('extracts all five controlled pages across bounded invocations without an LLM or database connection', async () => {
  const origin = 'https://audit-fixture.example.org'
  const fixture = (name: string) => readFileSync(resolve(process.cwd(), 'tests/fixtures/website-audit', name))
  jest.mocked(resolvePublicAddress).mockResolvedValue({ address: '93.184.215.14', family: 4 })
  jest.mocked(requestPage).mockImplementation(async url => ({ body: fixture(url.pathname === '/' ? 'index.html' : url.pathname.slice(1)), contentType: url.pathname === '/robots.txt' ? 'text/plain' : 'text/html', statusCode: 200, headers: {} }))
  // Contract double only: PostgreSQL leases/RLS/transactions are tested separately in SQL.
  const pending = [origin + '/'], known = new Set(pending), outcomes = new Map<string, AuditOutcome>()
  let policy: string | null = null, clock = 0, hostReady = 0, summaries = 0
  const repository: AuditRepository = {
    claim: async () => clock < hostReady || !pending.length ? null : ({ audit_id: 'audit', page_id: pending[0], lease_token: 'lease', url: pending[0], origin, depth: 0, redirect_count: 0, robots_body: policy } satisfies AuditClaim),
    finish: async (page, outcome) => {
      hostReady = clock + 2000
      if (outcome.kind === 'policy') { policy = outcome.robots_body; return }
      pending.shift(); outcomes.set(page.url, outcome)
      if (outcome.kind === 'completed') for (const link of outcome.links) if (!known.has(link.url) && known.size < 5) { known.add(link.url); pending.push(link.url) }
    },
    finalize: async () => { if (!pending.length && summaries === 0) summaries++; return null },
  }
  let batches = 0
  for (; batches < 12 && summaries === 0; batches++) { await processAuditBatch(repository, { now: () => clock }); clock += 60000 }
  expect(batches).toBeGreaterThan(1)
  expect(outcomes.size).toBe(5)
  expect(summaries).toBe(1)
  expect([...outcomes.values()].every(result => result.kind === 'completed')).toBe(true)
  const about = outcomes.get(origin + '/about.html')
  expect(about).toMatchObject({ kind: 'completed', metadata: { evidence: expect.arrayContaining([{ id: 'missing_alt', label: 'Images without an alt attribute', value: 1 }]) } })
  expect(outcomes.get(origin + '/contact.html')).toMatchObject({ kind: 'completed', metadata: { evidence: expect.arrayContaining([{ id: 'description', label: 'Meta description', value: '' }]) } })
})
