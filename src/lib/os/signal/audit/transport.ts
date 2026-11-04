import { parseWebsiteUrl, extractWebsitePage } from '../websiteScanUtils'
import { requestPage, resolvePublicAddress, WebsiteHttpError } from '../websiteFetch'
import { analyzeWebsiteHtml, evaluateRobotsPolicy } from '../websiteIntelligence'
import { auditUrl, discoverAuditLinks } from './discovery'
import type { AuditClaim, AuditOutcome } from './contracts'
import { canonicalizeWebsiteUrl } from '../websiteScanUrl'
import { retryAfterDeadline } from './backoff'

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
  const policyRequest = claim.robots_body === null
  const url = parseWebsiteUrl(options.quick && policyRequest && claim.robots_url
    ? canonicalizeWebsiteUrl(claim.robots_url).canonicalUrl
    : auditUrl(policyRequest ? '/robots.txt' : claim.url, claim.origin))
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
          try { return { kind: 'policy_redirect', url: canonicalizeWebsiteUrl(new URL(response.redirectLocation, url).toString()).canonicalUrl, ...responseBackoff } }
          catch { return { kind: 'skipped', reason: 'unsafe_robots_redirect' } }
        }
        return { kind: 'skipped', reason: 'robots_redirect_unsupported', ...responseBackoff }
      }
      if (claim.redirect_count >= 4) return { kind: 'failed', reason: 'redirect_limit', ...responseBackoff }
      try { return { kind: 'redirect', url: options.quick ? canonicalizeWebsiteUrl(new URL(response.redirectLocation, url).toString()).canonicalUrl : auditUrl(response.redirectLocation, claim.origin, url.toString()), ...responseBackoff } }
      catch { return { kind: 'skipped', reason: 'outside_audit_origin_redirect', ...responseBackoff } }
    }
    const html = response.body.toString('utf8')
    if (policyRequest) {
      if (response.body.length > 64000 || response.contentType.includes('text/html') || /^\s*</.test(html)) return { kind: 'skipped', reason: 'robots_policy_unreadable', ...responseBackoff }
      const policy = evaluateRobotsPolicy(html, parseWebsiteUrl(claim.url))
      if (!Number.isFinite(policy.crawlDelaySeconds) || policy.crawlDelaySeconds > 86400) return { kind: 'skipped', reason: 'robots_delay_exceeds_audit_support', host_blocked: true }
      // The RPC accepts integer milliseconds. Round up so fractional directives
      // neither fail PostgreSQL's integer cast nor shorten the site's delay.
      return { kind: 'policy', robots_body: html, delay_ms: Math.max(2000, Math.ceil(policy.crawlDelaySeconds * 1000)), ...responseBackoff }
    }
    const extracted = extractWebsitePage(html)
    const analysis = analyzeWebsiteHtml(html, url, response.headers)
    const discovered = options.quick ? { links: [], truncated: false, excluded: 0 } : discoverAuditLinks(html, url.toString(), claim.origin)
    return { kind: 'completed', url: url.toString(), title: extracted.title, description: extracted.description || extracted.text || 'HTML fetched with limited readable content.',
      links: discovered.links, discovery_truncated: discovered.truncated, ...responseBackoff,
      metadata: { version: 1, fetched_url: url.toString(), coverage: 'partial', http_status: response.statusCode,
        response_bytes: response.body.length, content_type: response.contentType,
        evidence: analysis.evidence, limitations: analysis.limitations, excluded_from_ai: analysis.excludedFromAI,
        page_description: extracted.description, headings: extracted.headings,
        excluded_links: discovered.excluded, text_excerpt: extracted.text } }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = error instanceof WebsiteHttpError ? error.statusCode : Number(message.match(/HTTP (\d+)/)?.[1])
    const retryHeader = error instanceof WebsiteHttpError ? error.retryAfter : undefined
    const retryNow = Date.now()
    const backoff = retryAfterDeadline(Array.isArray(retryHeader) ? retryHeader[0] : retryHeader, retryNow)
    if (policyRequest && [404, 410].includes(status)) return { kind: 'policy', robots_body: '', delay_ms: 2000, ...backoff }
    if ([401, 403].includes(status)) return { kind: 'skipped', reason: policyRequest ? 'robots_access_restricted' : 'access_restricted', ...backoff }
    if ([404, 410].includes(status)) return { kind: 'failed', reason: `http_${status}`, ...backoff }
    if (status >= 400 && status < 500 && status !== 429) return { kind: 'failed', reason: `http_${status}`, ...backoff }
    if (/non-public|invalid URL|not HTML|size limit|encoding is not supported/i.test(message)) return { kind: 'skipped', reason: 'unsafe_or_unsupported_response' }
    const retryMs = backoff.not_before ? Math.max(0, Date.parse(backoff.not_before) - retryNow) : 0
    return { kind: 'retry', reason: status ? `http_${status}` : 'fetch_unavailable', delay_ms: Math.min(3600000, Math.max(retryMs, status === 429 ? 300000 : 60000)), ...backoff }
  }
}
