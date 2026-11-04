import { parseWebsiteUrl, extractWebsitePage } from '../websiteScanUtils'
import { requestPage, resolvePublicAddress, WebsiteHttpError } from '../websiteFetch'
import { analyzeWebsiteHtml, evaluateRobotsPolicy } from '../websiteIntelligence'
import { auditUrl, discoverAuditLinks } from './discovery'
import type { AuditClaim, AuditOutcome } from './contracts'
import { canonicalizeWebsiteUrl } from '../websiteScanUrl'
import { retryAfterDeadline } from './backoff'
import { robotsSiteCheck, sitemapSiteCheck, siteCheckEvidence, type SiteResourceCheck } from '../websiteSiteChecks'

async function beforeDeadline<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Audit request timed out.')), timeoutMs)
    })])
  } finally { if (timer) clearTimeout(timer) }
}

/** One network request per leased work item, including robots and redirects.
 * Host spacing is persisted by the finish RPC, never bypassed by an in-process loop.
 */
export async function fetchAuditPage(claim: AuditClaim, options: { quick?: boolean } = {}): Promise<AuditOutcome> {
  if (claim.site_resource) return fetchSitemapResource(claim)
  const policyRequest = claim.robots_body === null
  const url = parseWebsiteUrl(options.quick && policyRequest && claim.robots_url
    ? canonicalizeWebsiteUrl(claim.robots_url).canonicalUrl
    : auditUrl(policyRequest ? '/robots.txt' : claim.url, claim.origin))
  const robotsResult = (outcome: AuditOutcome, body: string, httpStatus: number | null, state: string): AuditOutcome => claim.site_checks === undefined ? outcome : {
    ...outcome, site_check: robotsSiteCheck(body, claim.origin + '/robots.txt', httpStatus === null ? null : url.toString(), httpStatus, state),
  }
  if (!policyRequest && !evaluateRobotsPolicy(claim.robots_body!, url).allowed) return { kind: 'skipped', reason: 'robots_disallow' }
  const deadline = Date.now() + 8000
  try {
    const address = await resolvePublicAddress(url.hostname, 8000)
    const remaining = Math.max(1, deadline - Date.now())
    const response = await beforeDeadline(requestPage(url, address, remaining, policyRequest), remaining)
    const retryHeader = 'redirectLocation' in response ? response.retryAfter : response.headers['retry-after']
    const responseBackoff = retryAfterDeadline(Array.isArray(retryHeader) ? retryHeader[0] : retryHeader)
    if ('redirectLocation' in response) {
      // Phase 1 fails closed on redirected policy files; HTML redirects are durable work.
      if (policyRequest) {
        if (options.quick) {
          try { return robotsResult({ kind: 'policy_redirect', url: canonicalizeWebsiteUrl(new URL(response.redirectLocation, url).toString()).canonicalUrl, ...responseBackoff }, '', response.statusCode ?? null, 'redirect') }
          catch { return robotsResult({ kind: 'skipped', reason: 'unsafe_robots_redirect', ...responseBackoff }, '', response.statusCode ?? null, 'unsafe_redirect') }
        }
        return robotsResult({ kind: 'skipped', reason: 'robots_redirect_unsupported', ...responseBackoff }, '', response.statusCode ?? null, 'redirect_not_followed')
      }
      if (claim.redirect_count >= 4) return { kind: 'failed', reason: 'redirect_limit', ...responseBackoff }
      try { return { kind: 'redirect', url: options.quick ? canonicalizeWebsiteUrl(new URL(response.redirectLocation, url).toString()).canonicalUrl : auditUrl(response.redirectLocation, claim.origin, url.toString()), ...responseBackoff } }
      catch { return { kind: 'skipped', reason: 'outside_audit_origin_redirect', ...responseBackoff } }
    }
    const html = response.body.toString('utf8')
    if (policyRequest) {
      if (response.body.length > 64000 || response.contentType.includes('text/html') || /^\s*</.test(html)) return robotsResult({ kind: 'skipped', reason: 'robots_policy_unreadable', ...responseBackoff }, '', response.statusCode, 'unreadable')
      const policy = evaluateRobotsPolicy(html, parseWebsiteUrl(claim.url))
      if (!Number.isFinite(policy.crawlDelaySeconds) || policy.crawlDelaySeconds > 86400) return robotsResult({ kind: 'skipped', reason: 'robots_delay_exceeds_audit_support', host_blocked: true }, html, response.statusCode, 'unsupported_crawl_delay')
      // The RPC accepts integer milliseconds. Round up so fractional directives
      // neither fail PostgreSQL's integer cast nor shorten the site's delay.
      return robotsResult({ kind: 'policy', robots_body: html, delay_ms: Math.max(2000, Math.ceil(policy.crawlDelaySeconds * 1000)), ...responseBackoff }, html, response.statusCode, 'available')
    }
    const extracted = extractWebsitePage(html)
    const analysis = analyzeWebsiteHtml(html, url, response.headers)
    const discovered = options.quick ? { links: [], truncated: false, excluded: 0 } : discoverAuditLinks(html, url.toString(), claim.origin)
    return { kind: 'completed', url: url.toString(), title: extracted.title, description: extracted.description || extracted.text || 'HTML fetched with limited readable content.',
      links: discovered.links, discovery_truncated: discovered.truncated, ...responseBackoff,
      metadata: { version: 1, fetched_url: url.toString(), coverage: 'partial', http_status: response.statusCode,
        response_bytes: response.body.length, content_type: response.contentType,
        evidence: [...analysis.evidence, ...siteCheckEvidence(claim.site_checks ?? [])], limitations: analysis.limitations, excluded_from_ai: analysis.excludedFromAI,
        ...(claim.site_checks ? { site_checks: claim.site_checks } : {}),
        page_description: extracted.description, headings: extracted.headings,
        excluded_links: discovered.excluded, text_excerpt: extracted.text } }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = error instanceof WebsiteHttpError ? error.statusCode : Number(message.match(/HTTP (\d+)/)?.[1])
    const retryHeader = error instanceof WebsiteHttpError ? error.retryAfter : undefined
    const retryNow = Date.now()
    const backoff = retryAfterDeadline(Array.isArray(retryHeader) ? retryHeader[0] : retryHeader, retryNow)
    const failure = (outcome: AuditOutcome): AuditOutcome => policyRequest
      ? robotsResult(outcome, '', Number.isFinite(status) && status > 0 ? status : null,
        [404, 410].includes(status) ? 'missing' : [401, 403].includes(status) ? 'restricted' : 'unavailable') : outcome
    if (policyRequest && [404, 410].includes(status)) return failure({ kind: 'policy', robots_body: '', delay_ms: 2000, ...backoff })
    if ([401, 403].includes(status)) return failure({ kind: 'skipped', reason: policyRequest ? 'robots_access_restricted' : 'access_restricted', ...backoff })
    if ([404, 410].includes(status)) return failure({ kind: 'failed', reason: `http_${status}`, ...backoff })
    if (status >= 400 && status < 500 && status !== 429) return failure({ kind: 'failed', reason: `http_${status}`, ...backoff })
    if (/non-public|invalid URL|not HTML|size limit|encoding is not supported/i.test(message)) return failure({ kind: 'skipped', reason: 'unsafe_or_unsupported_response' })
    const retryMs = backoff.not_before ? Math.max(0, Date.parse(backoff.not_before) - retryNow) : 0
    return failure({ kind: 'retry', reason: status ? `http_${status}` : 'fetch_unavailable', delay_ms: Math.min(3600000, Math.max(retryMs, status === 429 ? 300000 : 60000)), ...backoff })
  }
}

/** Optional sitemap evidence: never feeds the navigation queue or fails a page. */
async function fetchSitemapResource(claim: AuditClaim): Promise<AuditOutcome> {
  const request = claim.site_resource!
  const base: SiteResourceCheck = { kind: 'sitemap', url: request.url, final_url: null, http_status: null, status: 'unavailable' }
  let url: URL
  try { auditUrl(request.url, claim.origin); url = parseWebsiteUrl(auditUrl(request.fetch_url, claim.origin)) }
  catch { return { kind: 'site_resource', resource: { ...base, status: 'unsafe_destination' } } }
  if (claim.robots_body === null || !evaluateRobotsPolicy(claim.robots_body, url).allowed) return { kind: 'site_resource', resource: { ...base, status: 'robots_restricted' } }
  const deadline = Date.now() + 8000
  try {
    const address = await resolvePublicAddress(url.hostname, 8000)
    const remaining = Math.max(1, deadline - Date.now())
    const response = await beforeDeadline(requestPage(url, address, remaining, 'sitemap'), remaining)
    const header = 'redirectLocation' in response ? response.retryAfter : response.headers['retry-after']
    const backoff = retryAfterDeadline(Array.isArray(header) ? header[0] : header)
    if ('redirectLocation' in response) {
      const resource = { ...base, final_url: url.toString(), http_status: response.statusCode ?? null }
      try {
        const target = auditUrl(response.redirectLocation, claim.origin, url.toString())
        if (request.redirect_count >= 4 || target === url.toString() || request.visited.includes(target)) return { kind: 'site_resource', resource: { ...resource, status: 'redirect_limit_or_loop' }, ...backoff }
        return { kind: 'site_resource', resource: { ...resource, status: 'redirect' }, next_url: target, ...backoff }
      } catch { return { kind: 'site_resource', resource: { ...resource, status: 'outside_origin_redirect' }, ...backoff } }
    }
    return { kind: 'site_resource', resource: sitemapSiteCheck(response.body, request.url, url.toString(), response.statusCode), ...backoff }
  } catch (error) {
    const header = error instanceof WebsiteHttpError ? error.retryAfter : undefined
    const code = error instanceof WebsiteHttpError ? error.statusCode : null
    return { kind: 'site_resource', resource: { ...base, final_url: code === null ? null : url.toString(), http_status: code,
      status: code === 404 || code === 410 ? 'missing' : code === 401 || code === 403 ? 'restricted' : 'unavailable' },
      ...retryAfterDeadline(Array.isArray(header) ? header[0] : header) }
  }
}
