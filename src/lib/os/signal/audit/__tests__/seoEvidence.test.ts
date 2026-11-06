jest.mock('../../websiteFetch', () => ({ resolvePublicAddress: jest.fn(), requestPage: jest.fn(), WebsiteHttpError: class extends Error {} }))
import { requestPage, resolvePublicAddress } from '../../websiteFetch'
import { fetchAuditPage } from '../transport'
import { buildWebsiteIssueReport, type IssuePage } from '../../websiteIssues'
import type { AuditClaim } from '../contracts'
const origin = 'https://seo-fixture.example.org'
const claim: AuditClaim = { audit_id: 'audit', page_id: 'page', lease_token: 'token', url: origin + '/', origin, depth: 0, redirect_count: 0, robots_body: '' }
beforeEach(() => { jest.clearAllMocks(); jest.mocked(resolvePublicAddress).mockResolvedValue({ address: '93.184.215.14', family: 4 }) })
it.each([true, false])('reuses Quick=%s extraction and requires no additional network calls for SEO findings', async quick => {
  jest.mocked(requestPage).mockResolvedValue({ body: Buffer.from('<html lang="en"><head><title>Retained title</title><meta name="description" content="Retained description"><meta name="viewport" content="width=device-width"><link rel="canonical" href="javascript:void(0)"></head><body><h1>Page</h1><a href="/other">Other page</a></body></html>'), contentType: 'text/html', statusCode: 200, headers: {} })
  const outcomes = [await fetchAuditPage(claim, { quick }), ...(!quick ? [await fetchAuditPage({ ...claim, url: origin + '/other' })] : [])]
  const pages: IssuePage[] = outcomes.map((outcome, index) => {
    if (outcome.kind !== 'completed') throw new Error('Expected retained HTML')
    expect(outcome.links).toHaveLength(quick ? 0 : 1)
    return { url: outcome.url, final_url: outcome.url, status: 'completed', observation_id: 'obs-' + index,
      metadata: quick ? outcome.metadata : { ...outcome.metadata, audit_id: claim.audit_id, record_kind: 'audit_page' } }
  })
  const saved = JSON.stringify(pages), report = buildWebsiteIssueReport(pages)
  expect(report.groups.find(g => g.ruleId === 'invalid_canonical')?.issues).toHaveLength(quick ? 1 : 2)
  expect(report.groups.find(g => g.ruleId === 'duplicate_title')?.issues).toHaveLength(quick ? 0 : 2)
  expect(report.groups.find(g => g.ruleId === 'duplicate_description')?.issues).toHaveLength(quick ? 0 : 2)
  expect(requestPage).toHaveBeenCalledTimes(2)
  expect(JSON.stringify(pages)).toBe(saved)
})
