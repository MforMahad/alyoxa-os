import { parseWebsiteUrl } from '../websiteScanUtils'
import { requestPage, resolvePublicAddress, WebsiteHttpError } from '../websiteFetch'
import { evaluateRobotsPolicy } from '../websiteIntelligence'
import { auditUrl, discoverAuditLinks } from './discovery'

const QUICK_LINK_CHECK_LIMIT = 5
const QUICK_LINK_REQUEST_LIMIT = 5
const QUICK_LINK_DELAY_LIMIT_MS = 6000
const QUICK_LINK_CHECK_BUDGET_MS = 10000
const LINK_REQUEST_TIMEOUT_MS = 8000
const MAX_LINK_REDIRECTS = 4

export type InternalLinkCheck = {
  url: string
  status: 'reachable' | 'redirected' | 'http_error' | 'blocked' | 'rate_limited' | 'http_timeout' |
    'robots_blocked' | 'redirect_loop' | 'redirect_limit' | 'outside_origin_redirect' | 'unverified'
  http_status: number | null
  final_url?: string | null
  reason?: string
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => setTimeout(resolve, milliseconds))
}

async function beforeDeadline<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Link request timed out.')), timeoutMs)
    })])
  } finally { if (timer) clearTimeout(timer) }
}

function unverified(url: string, reason: string): InternalLinkCheck {
  return { url, status: 'unverified', http_status: null, reason }
}

function classifyHttpError(url: string, status: number): InternalLinkCheck {
  if (status === 401 || status === 403) return { url, status: 'blocked', http_status: status }
  if (status === 408) return { url, status: 'http_timeout', http_status: status }
  if (status === 429) return { url, status: 'rate_limited', http_status: status }
  if (status >= 400 && status <= 599) return { url, status: 'http_error', http_status: status }
  return unverified(url, 'unsupported_http_response')
}

async function checkDestination(url: string, origin: string, robotsBody: string, delayMs: number,
  budget: { requests: number }, deadline: number): Promise<InternalLinkCheck> {
  let current = parseWebsiteUrl(url)
  const visited = new Set([url])
  for (let redirects = 0; ; redirects++) {
    if (budget.requests >= QUICK_LINK_REQUEST_LIMIT) return unverified(url, 'quick_check_limit')
    if (deadline - Date.now() <= delayMs) return unverified(url, 'quick_check_time_budget')
    await wait(delayMs)
    budget.requests++
    try {
      const remaining = Math.min(LINK_REQUEST_TIMEOUT_MS, deadline - Date.now())
      if (remaining <= 0) return unverified(url, 'timeout')
      const address = await resolvePublicAddress(current.hostname, remaining)
      const requestRemaining = deadline - Date.now()
      if (requestRemaining <= 0) return unverified(url, 'timeout')
      const response = await beforeDeadline(requestPage(current, address, requestRemaining), requestRemaining)
      if (!('redirectLocation' in response)) {
        return { url, status: redirects ? 'redirected' : 'reachable', http_status: response.statusCode ?? null, final_url: current.toString() }
      }

      let next: string
      try { next = auditUrl(new URL(response.redirectLocation, current).toString(), origin, current.toString()) }
      catch { return { url, status: 'outside_origin_redirect', http_status: response.statusCode ?? null } }
      if (visited.has(next)) return { url, status: 'redirect_loop', http_status: response.statusCode ?? null, final_url: next }
      if (redirects >= MAX_LINK_REDIRECTS) return { url, status: 'redirect_limit', http_status: response.statusCode ?? null, final_url: current.toString() }
      const nextUrl = parseWebsiteUrl(next)
      if (!evaluateRobotsPolicy(robotsBody, nextUrl).allowed)
        return { url, status: 'robots_blocked', http_status: response.statusCode ?? null, final_url: next }
      visited.add(next)
      current = nextUrl
    } catch (error) {
      if (error instanceof WebsiteHttpError) return classifyHttpError(url, error.statusCode)
      const message = error instanceof Error ? error.message : ''
      return unverified(url, /timed out/i.test(message) ? 'timeout' :
        /non-public|invalid URL|could not be safely resolved/i.test(message) ? 'unsafe_destination' :
          /not HTML|size limit|encoding is not supported/i.test(message) ? 'unsupported_response' : 'network_failure')
    }
  }
}

/** Quick Scan samples a few discovered links; it never creates another crawl queue. */
export async function checkQuickInternalLinks(
  html: string,
  pageUrl: string,
  origin: string,
  robotsBody: string,
  robotsOrigin: string,
) {
  const discovered = discoverAuditLinks(html, pageUrl, origin)
  const delaySeconds = evaluateRobotsPolicy(robotsBody, new URL(pageUrl)).crawlDelaySeconds
  const delayMs = Math.max(2000, Math.ceil(delaySeconds * 1000))
  const canCheck = robotsOrigin === origin && Number.isFinite(delayMs) && delayMs <= QUICK_LINK_DELAY_LIMIT_MS
  const checked = new Set<string>()
  const budget = { requests: 0 }
  const deadline = Date.now() + QUICK_LINK_CHECK_BUDGET_MS
  const checks: InternalLinkCheck[] = []

  for (const link of discovered.links) {
    if (link.url === pageUrl) {
      checks.push({ url: link.url, status: 'reachable', http_status: 200, final_url: pageUrl })
      checked.add(link.url)
      continue
    }
    if (!evaluateRobotsPolicy(robotsBody, new URL(link.url)).allowed) {
      checks.push({ url: link.url, status: 'robots_blocked', http_status: null })
      checked.add(link.url)
      continue
    }
    if (!canCheck) {
      checks.push(unverified(link.url, robotsOrigin !== origin ? 'robots_policy_origin_mismatch' : 'crawl_delay_exceeds_quick_check_budget'))
      continue
    }
    if (budget.requests >= QUICK_LINK_REQUEST_LIMIT) {
      checks.push(unverified(link.url, 'quick_check_limit'))
      continue
    }

    checks.push(await checkDestination(link.url, origin, robotsBody, delayMs, budget, deadline))
    checked.add(link.url)
  }

  return {
    checks,
    candidate_count: discovered.links.length,
    checked_count: checked.size,
    discovery_truncated: discovered.truncated,
    excluded_links: discovered.excluded,
    check_limit: QUICK_LINK_CHECK_LIMIT,
  }
}
