jest.mock('../../websiteFetch', () => ({ resolvePublicAddress: jest.fn(), requestPage: jest.fn(), WebsiteHttpError: class extends Error { constructor(public statusCode: number, public retryAfter?: string) { super(`Website returned HTTP ${statusCode}.`) } } }))
import { requestPage, resolvePublicAddress, WebsiteHttpError } from '../../websiteFetch'
import { fetchAuditPage } from '../transport'
import type { AuditClaim } from '../contracts'
const claim: AuditClaim = { audit_id: 'audit', page_id: 'page', lease_token: 'token', url: 'https://fixture.example.org/', origin: 'https://fixture.example.org', depth: 0, redirect_count: 0, robots_body: '' }
beforeEach(() => { jest.clearAllMocks(); jest.mocked(resolvePublicAddress).mockResolvedValue({ address: '93.184.215.14', family: 4 }) })
it('does not request blocked robots content or invent measurements', async () => {
  expect(await fetchAuditPage({ ...claim, robots_body: 'User-agent: *\nDisallow: /' })).toEqual({ kind: 'skipped', reason: 'robots_disallow' })
  expect(requestPage).not.toHaveBeenCalled()
})
it('makes robots discovery separate durable work and preserves crawl delay', async () => {
  jest.mocked(requestPage).mockResolvedValue({ body: Buffer.from('User-agent: *\nCrawl-delay: 60'), contentType: 'text/plain', statusCode: 200, headers: {} })
  expect(await fetchAuditPage({ ...claim, robots_body: null })).toEqual({ kind: 'policy', robots_body: 'User-agent: *\nCrawl-delay: 60', delay_ms: 60000 })
  expect(requestPage).toHaveBeenCalledTimes(1)
})
it('rounds fractional crawl delays up to the RPC integer-millisecond contract', async () => {
  const body = 'User-agent: *\nCrawl-delay: 2.0001'
  jest.mocked(requestPage).mockResolvedValue({ body: Buffer.from(body), contentType: 'text/plain', statusCode: 200, headers: {} })
  expect(await fetchAuditPage({ ...claim, robots_body: null })).toEqual({ kind: 'policy', robots_body: body, delay_ms: 2001 })
})
it('does not follow an external redirect or private DNS destination', async () => {
  jest.mocked(requestPage).mockResolvedValue({ redirectLocation: 'http://127.0.0.1/' })
  expect(await fetchAuditPage(claim)).toMatchObject({ kind: 'skipped', reason: 'outside_audit_origin_redirect' })
  expect(requestPage).toHaveBeenCalledTimes(1)
  jest.clearAllMocks(); jest.mocked(resolvePublicAddress).mockRejectedValue(new Error('non-public network address'))
  expect(await fetchAuditPage(claim)).toMatchObject({ kind: 'skipped' })
  expect(requestPage).not.toHaveBeenCalled()
})
it('persists same-origin redirects for a later invocation rather than looping in a request', async () => {
  jest.mocked(requestPage).mockResolvedValue({ redirectLocation: '/next' })
  expect(await fetchAuditPage(claim)).toEqual({ kind: 'redirect', url: claim.origin + '/next' })
  expect(requestPage).toHaveBeenCalledTimes(1)
})
it('honors Retry-After and distinguishes terminal HTTP errors', async () => {
  jest.mocked(requestPage).mockRejectedValue(new WebsiteHttpError(429, '600'))
  expect(await fetchAuditPage(claim)).toMatchObject({ kind: 'retry', reason: 'http_429', delay_ms: 600000, not_before: expect.any(String) })
  jest.mocked(requestPage).mockRejectedValue(new WebsiteHttpError(404))
  expect(await fetchAuditPage(claim)).toEqual({ kind: 'failed', reason: 'http_404' })
})
it('bounds a transport promise that never settles', async () => {
  jest.useFakeTimers()
  try {
    jest.mocked(requestPage).mockImplementation(() => new Promise(() => {}))
    const result = fetchAuditPage(claim)
    await jest.advanceTimersByTimeAsync(8000)
    expect(await result).toMatchObject({ kind: 'retry', reason: 'fetch_unavailable' })
  } finally { jest.useRealTimers() }
})
it('retains missing title and description evidence independently of display fallbacks', async () => {
  jest.mocked(requestPage).mockResolvedValue({ body: Buffer.from('<html><body><h1>Actual heading</h1></body></html>'), contentType: 'text/html', statusCode: 200, headers: {} })
  const result = await fetchAuditPage(claim)
  expect(result).toMatchObject({ kind: 'completed', metadata: { evidence: expect.arrayContaining([
    { id: 'title', label: 'HTML title', value: '' },
    { id: 'description', label: 'Meta description', value: '' },
  ]) } })
  if (result.kind === 'completed') expect(result.title).not.toBe('')
})
it('terminates redirects at the durable hop cap without following the destination', async () => {
  jest.mocked(requestPage).mockResolvedValue({ redirectLocation: '/again' })
  expect(await fetchAuditPage({ ...claim, redirect_count: 4 })).toEqual({ kind: 'failed', reason: 'redirect_limit' })
  expect(requestPage).toHaveBeenCalledTimes(1)
})
it('retains long Retry-After on both scanners and on redirects', async () => {
  jest.mocked(requestPage).mockRejectedValue(new WebsiteHttpError(429, '7200'))
  for (const quick of [false, true]) {
    const result = await fetchAuditPage(claim, { quick })
    expect(result).toMatchObject({ kind: 'retry', delay_ms: 3600000, not_before: expect.any(String) })
    expect(Date.parse(result.not_before!) - Date.now()).toBeGreaterThan(7190000)
  }
  jest.mocked(requestPage).mockResolvedValue({ redirectLocation: '/next', retryAfter: '7200' })
  expect(await fetchAuditPage(claim)).toMatchObject({ kind: 'redirect', not_before: expect.any(String) })
})
it('continues safe cross-origin Quick redirects and redirected robots as durable work', async () => {
  jest.mocked(requestPage).mockResolvedValue({ redirectLocation: 'https://other.example.org/' })
  expect(await fetchAuditPage(claim, { quick: true })).toEqual({ kind: 'redirect', url: 'https://other.example.org/' })
  expect(await fetchAuditPage({ ...claim, robots_body: null }, { quick: true })).toEqual({ kind: 'policy_redirect', url: 'https://other.example.org/' })
  jest.mocked(requestPage).mockResolvedValue({ body: Buffer.from('User-agent: *\nCrawl-delay: 7200'), contentType: 'text/plain', statusCode: 200, headers: {} })
  expect(await fetchAuditPage({ ...claim, robots_body: null })).toMatchObject({ kind: 'policy', delay_ms: 7200000 })
})
