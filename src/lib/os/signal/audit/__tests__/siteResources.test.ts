jest.mock('../../websiteFetch', () => ({ resolvePublicAddress: jest.fn(), requestPage: jest.fn(), WebsiteHttpError: class extends Error { constructor(public statusCode: number, public retryAfter?: string) { super(`Website returned HTTP ${statusCode}.`) } } }))
import { requestPage, resolvePublicAddress, WebsiteHttpError } from '../../websiteFetch'
import { fetchAuditPage } from '../transport'
import type { AuditClaim } from '../contracts'

const origin = 'https://resources.example.org'
const claim: AuditClaim = { audit_id: 'audit', page_id: 'page', lease_token: 'token', url: origin + '/', origin, depth: 0, redirect_count: 0, robots_body: '', site_checks: [], site_resource: { url: origin + '/sitemap.xml', fetch_url: origin + '/sitemap.xml', redirect_count: 0, visited: [] } }
beforeEach(() => { jest.clearAllMocks(); jest.mocked(resolvePublicAddress).mockResolvedValue({ address: '93.184.215.14', family: 4 }) })

it('records robots status and declarations on the existing policy request in both modes', async () => {
  jest.mocked(requestPage).mockResolvedValue({ body: Buffer.from(`User-agent: *\nSitemap: ${origin}/pages.xml`), statusCode: 200, contentType: 'text/plain', headers: {} })
  for (const quick of [true, false]) {
    expect(await fetchAuditPage({ ...claim, robots_body: null, site_resource: undefined }, { quick })).toMatchObject({ kind: 'policy', site_check: { http_status: 200, sitemap_refs: [origin + '/pages.xml'] } })
  }
  expect(requestPage).toHaveBeenCalledTimes(2)
})

it.each([404, 403, 503])('keeps optional sitemap HTTP %s as a resource finding, never a failed page', async code => {
  jest.mocked(requestPage).mockRejectedValue(new WebsiteHttpError(code))
  expect(await fetchAuditPage(claim)).toMatchObject({ kind: 'site_resource', resource: { http_status: code, status: code === 404 ? 'missing' : code === 403 ? 'restricted' : 'unavailable' } })
  expect(requestPage).toHaveBeenCalledTimes(1)
})

it('uses the pinned, bounded XML transport and does not add locations to page discovery', async () => {
  jest.mocked(requestPage).mockResolvedValue({ body: Buffer.from(`<urlset><url><loc>${origin}/not-discovered</loc></url></urlset>`), statusCode: 200, contentType: 'application/xml', headers: {} })
  const result = await fetchAuditPage(claim)
  expect(result).toMatchObject({ kind: 'site_resource', resource: { status: 'parsed', url_count: 1 } })
  expect(result).not.toHaveProperty('links')
  expect(resolvePublicAddress).toHaveBeenCalledWith('resources.example.org', 8000)
  expect(requestPage).toHaveBeenCalledWith(new URL(origin + '/sitemap.xml'), { address: '93.184.215.14', family: 4 }, expect.any(Number), 'sitemap')
})

it('requires a new leased step for redirects and retains multi-hour Retry-After', async () => {
  jest.mocked(requestPage).mockResolvedValue({ redirectLocation: '/maps.xml', statusCode: 302, retryAfter: '7200' })
  expect(await fetchAuditPage(claim)).toMatchObject({ kind: 'site_resource', next_url: origin + '/maps.xml', not_before: expect.any(String), resource: { http_status: 302 } })
  expect(requestPage).toHaveBeenCalledTimes(1)
  jest.mocked(requestPage).mockResolvedValue({ redirectLocation: 'http://127.0.0.1/', statusCode: 302 })
  expect(await fetchAuditPage(claim)).toMatchObject({ resource: { status: 'outside_origin_redirect' } })
  jest.mocked(requestPage).mockResolvedValue({ redirectLocation: '/sitemap.xml', statusCode: 302 })
  expect(await fetchAuditPage(claim)).toMatchObject({ resource: { status: 'redirect_limit_or_loop' } })
})

it('does not fetch disallowed resources or resolve an unsafe IP', async () => {
  expect(await fetchAuditPage({ ...claim, robots_body: 'User-agent: *\nDisallow: /sitemap.xml' })).toMatchObject({ resource: { status: 'robots_restricted' } })
  expect(resolvePublicAddress).not.toHaveBeenCalled()
  jest.mocked(resolvePublicAddress).mockRejectedValue(new Error('non-public network'))
  expect(await fetchAuditPage(claim)).toMatchObject({ resource: { status: 'unavailable', http_status: null } })
  expect(requestPage).not.toHaveBeenCalled()
})

it('bounds stalled resource requests without failing the content page', async () => {
  jest.useFakeTimers()
  try {
    jest.mocked(requestPage).mockImplementation(() => new Promise(() => {}))
    const result = fetchAuditPage(claim)
    await jest.advanceTimersByTimeAsync(8000)
    expect(await result).toMatchObject({ kind: 'site_resource', resource: { status: 'unavailable', http_status: null } })
  } finally { jest.useRealTimers() }
})

it('persists cached SEO evidence on content results without another resource request', async () => {
  jest.mocked(requestPage).mockResolvedValue({ body: Buffer.from('<html><title>Measured page</title></html>'), statusCode: 200, contentType: 'text/html', headers: {} })
  const checks = [{ kind: 'sitemap' as const, url: origin + '/sitemap.xml', final_url: origin + '/sitemap.xml', http_status: 404, status: 'missing' }]
  expect(await fetchAuditPage({ ...claim, site_resource: undefined, site_checks: checks })).toMatchObject({ kind: 'completed', metadata: { site_checks: checks, evidence: expect.arrayContaining([expect.objectContaining({ value: 'missing' })]) } })
  expect(requestPage).toHaveBeenCalledTimes(1)
})
