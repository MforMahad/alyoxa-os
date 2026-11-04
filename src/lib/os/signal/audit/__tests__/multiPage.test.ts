jest.mock('../../websiteFetch', () => ({ resolvePublicAddress: jest.fn(), requestPage: jest.fn(), WebsiteHttpError: class extends Error {} }))
import { requestPage, resolvePublicAddress } from '../../websiteFetch'
import { processAuditBatch } from '../processor'
import type { AuditClaim, AuditOutcome, AuditRepository } from '../contracts'

it.each([[5, 100, 5], [30, 100, 30], [50, 50, 50], [125, 100, 100]])('processes %i available pages with cap %i into %i real results without padding', async (available, cap, expected) => {
  const origin = 'https://navigation-fixture.example.org'
  jest.mocked(resolvePublicAddress).mockResolvedValue({ address: '93.184.215.14', family: 4 })
  jest.mocked(requestPage).mockImplementation(async url => ({
    body: Buffer.from(url.pathname === '/robots.txt' ? 'User-agent: *\nAllow: /' : `<html><title>${url.pathname}</title><body><h1>Measured content</h1>${url.pathname === '/' ? Array.from({ length: available - 1 }, (_, i) => `<nav><a href="/page-${i + 1}">Page</a></nav>`).join('') : ''}</body></html>`),
    contentType: url.pathname === '/robots.txt' ? 'text/plain' : 'text/html', statusCode: 200, headers: {},
  }))
  // Worker/discovery integration double; real database invariants live in SQL.
  const queue = [origin + '/'], known = new Set(queue), observations: AuditOutcome[] = []
  let robots: string | null = null, clock = 0, ready = 0, summaries = 0
  const db: AuditRepository = {
    claim: async () => !queue.length || clock < ready ? null : ({ audit_id: 'audit', page_id: queue[0], lease_token: 'lease', url: queue[0], origin, depth: 0, redirect_count: 0, robots_body: robots } satisfies AuditClaim),
    finish: async (_claim, outcome) => {
      ready = clock + 2000
      if (outcome.kind === 'policy') { robots = outcome.robots_body; return }
      queue.shift(); observations.push(outcome)
      if (outcome.kind === 'completed') for (const link of outcome.links) if (!known.has(link.url) && known.size < cap) { known.add(link.url); queue.push(link.url) }
    },
    finalize: async () => { if (!queue.length && !summaries) summaries++; return null },
  }
  for (let tick = 0; tick < 110 && !summaries; tick++) {
    const batch = await processAuditBatch(db, { now: () => clock })
    expect(batch.processed).toBeLessThanOrEqual(2); clock += 60000
  }
  expect(observations).toHaveLength(expected)
  expect(observations.every(o => o.kind === 'completed')).toBe(true)
  expect(summaries).toBe(1)
})
