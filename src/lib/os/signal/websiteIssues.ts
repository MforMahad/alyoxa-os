/** Read-time interpretations only. Never fetches, writes or invokes AI. */
import { buildSeoIssueGroups } from './websiteSeoIssues'
export const WEBSITE_ISSUES_VERSION = 1 as const
// Contextual SEO findings do not change the existing single-page detector.
export const WEBSITE_ISSUE_REPORT_VERSION = 3 as const
type Value = string | number | boolean
export interface WebsiteIssue {
  ruleId: string
  title: string
  severity: 'low' | 'medium'
  confidence: 'high'
  affectedUrl: string
  evidenceReferences: { observationId?: string; pageId?: string; evidenceId: string; value: Value }[]
  recommendedFix: string
  limitations: string[]
}
export interface IssuePage {
  id?: string
  discovered_from?: string | null
  url: string
  final_url?: string | null
  status: string
  reason?: string | null
  observation_id?: string | null
  metadata: unknown
}
const rules = [
  { id: 'missing_title', title: 'Missing HTML title', evidence: 'title', severity: 'low', fix: 'Add a descriptive, page-specific HTML title.', type: 'string' },
  { id: 'missing_description', title: 'Missing meta description', evidence: 'description', severity: 'low', fix: 'Add a concise, page-specific meta description.', type: 'string' },
  { id: 'missing_language', title: 'Missing document language', evidence: 'language', severity: 'medium', fix: 'Declare the appropriate language on the html element.', type: 'string' },
  { id: 'missing_alt', title: 'Images missing alt attributes', evidence: 'missing_alt', severity: 'medium', fix: 'Review images missing alt attributes. Supply meaningful alternatives for informative images and empty alt attributes for decorative images.', type: 'count' },
  { id: 'missing_viewport', title: 'Missing viewport metadata', evidence: 'viewport', severity: 'low', fix: 'Review the layout and add appropriate viewport metadata without preventing user zoom.', type: 'boolean' },
  { id: 'missing_h1', title: 'No H1 in returned HTML', evidence: 'h1', severity: 'low', fix: 'Review the heading structure and provide a descriptive main heading where appropriate.', type: 'count' },
] as const
const linkRules = [
  { ruleId: 'http_error_response', title: 'Verified HTTP error responses',
    severity: 'medium' as const,
    recommendedFix: 'Review the affected URL and restore the expected page or correct the response configuration. Authentication, rate limits, timeouts and unverified requests are not classified as confirmed content errors.' },
  { ruleId: 'broken_internal_link', title: 'Broken internal destinations',
    severity: 'medium' as const,
    recommendedFix: 'Update the internal link to a working same-site destination, or restore the intended destination. Confirm the final URL after any redirect changes.' },
  { ruleId: 'redirect_loop', title: 'Internal redirect loops',
    severity: 'medium' as const,
    recommendedFix: 'Review the redirect rules for the affected URL and remove the cycle so the destination resolves to a stable page.' },
] as const
export const WEBSITE_PAGE_ISSUE_RULE_IDS: readonly string[] = rules.map(rule => rule.id)
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function publicUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    url.hash = ''
    return url.toString()
  } catch { return null }
}
function measurements(metadata: unknown) {
  const evidence = record(metadata)?.evidence
  const values = new Map<string, unknown>()
  const duplicates = new Set<string>()
  if (Array.isArray(evidence)) for (const item of evidence) {
    const entry = record(item)
    if (!entry || typeof entry.id !== 'string') continue
    if (values.has(entry.id)) duplicates.add(entry.id)
    values.set(entry.id, entry.value)
  }
  // Ambiguous duplicates are unknown, rather than choosing convenient evidence.
  for (const id of duplicates) values.delete(id)
  return values
}
export function detectWebsiteIssues(input: { affectedUrl: string; observationId: string; metadata: unknown }) {
  const url = publicUrl(input.affectedUrl)
  const values = measurements(input.metadata)
  const issues: WebsiteIssue[] = []
  const measuredRules: string[] = []
  if (!url || !input.observationId) return { version: WEBSITE_ISSUES_VERSION, issues, measuredRules }
  for (const rule of rules) {
    const value = values.get(rule.evidence)
    const valid = rule.type === 'string' ? typeof value === 'string'
      : rule.type === 'boolean' ? typeof value === 'boolean'
        : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    if (!valid) continue
    if (rule.id === 'missing_alt') {
      const images = values.get('images')
      if (typeof images !== 'number' || !Number.isSafeInteger(images) || images < 0 || (value as number) > images) continue
    }
    measuredRules.push(rule.id)
    const detected = rule.type === 'string' ? !(value as string).trim()
      : rule.type === 'boolean' ? value === false : rule.id === 'missing_alt' ? (value as number) > 0 : value === 0
    if (!detected) continue
    issues.push({ ruleId: rule.id, title: rule.title, severity: rule.severity, confidence: 'high', affectedUrl: url,
      evidenceReferences: [{ observationId: input.observationId, evidenceId: rule.evidence, value: value as Value },
        ...(rule.id === 'missing_alt' ? [{ observationId: input.observationId, evidenceId: 'images', value: values.get('images') as number }] : [])],
      recommendedFix: rule.fix,
      limitations: ['Observed in fetched HTML only; rendered content and intent are not verified. Severity is a review priority, not a compliance or ranking assessment.',
        ...(rule.id === 'missing_alt' ? ['Individual image locations were not retained. Empty alt attributes are not counted as missing.'] : []),
        ...(rule.id === 'missing_h1' ? ['Heading suitability depends on the page. Multiple H1 elements are not flagged.'] : [])] })
  }
  return { version: WEBSITE_ISSUES_VERSION, issues, measuredRules }
}

function httpFailureReason(reason: unknown): { code: number; value: string } | null {
  if (typeof reason !== 'string') return null
  const match = /^http_([45]\d\d)$/.exec(reason)
  if (!match) return null
  const code = Number(match[1])
  return [401, 403, 408, 429].includes(code) ? null : { code, value: reason }
}
function httpFailureStatus(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599 &&
    ![401, 403, 408, 429].includes(value) ? value : null
}
function sameOriginUrl(value: unknown, origin: string): string | null {
  const url = publicUrl(value)
  if (!url) return null
  try { return new URL(url).origin === origin ? url : null } catch { return null }
}
function addReference(issues: Map<string, WebsiteIssue>, rule: typeof linkRules[number], url: string,
  references: WebsiteIssue['evidenceReferences'], extra: string) {
  const existing = issues.get(url)
  if (existing) {
    const keys = new Set(existing.evidenceReferences.map(ref => JSON.stringify(ref)))
    for (const reference of references) if (!keys.has(JSON.stringify(reference))) existing.evidenceReferences.push(reference)
    if (!existing.limitations.includes(extra)) existing.limitations.push(extra)
    return
  }
  issues.set(url, { ruleId: rule.ruleId, title: rule.title, severity: 'medium', confidence: 'high', affectedUrl: url,
    evidenceReferences: references, recommendedFix: rule.recommendedFix,
    limitations: ['Only retained same-origin HTTP evidence is assessed. Requests blocked by policy, access controls, rate limits, timeouts or scanner limits remain unverified.',
      'A confirmed error response is a technical observation; whether the URL should exist depends on site intent.', extra] })
}
function buildInternalLinkGroups(pages: IssuePage[], analyzedPages: number) {
  const httpIssues = new Map<string, WebsiteIssue>()
  const linkIssues = new Map<string, WebsiteIssue>()
  const loopIssues = new Map<string, WebsiteIssue>()
  const measuredLinkPages = new Set<string>()
  const unknownLinkPages = new Set<string>()
  const pageById = new Map(pages.flatMap(page => page.id ? [[page.id, page] as const] : []))
  for (const page of pages) {
    const reason = httpFailureReason(page.reason)
    const pageUrl = publicUrl(page.final_url ?? page.url)
    if (page.status === 'failed' && reason && pageUrl && !page.discovered_from) addReference(httpIssues, linkRules[0], pageUrl,
      [{ ...(page.id ? { pageId: page.id } : {}), evidenceId: 'reason', value: reason.value }],
      `The retained page result records HTTP ${reason.code}.`)
    if (page.status === 'failed' && page.reason === 'redirect_loop' && pageUrl) addReference(loopIssues, linkRules[2], pageUrl,
      [{ ...(page.id ? { pageId: page.id } : {}), evidenceId: 'reason', value: 'redirect_loop' }],
      'The retained crawl result observed a repeated URL in its redirect history.')
  }

  for (const page of pages) {
    if (page.status !== 'completed' || !page.observation_id) continue
    const metadata = record(page.metadata)
    if (!metadata) continue
    const sourceUrl = publicUrl(page.final_url ?? metadata.fetched_url ?? page.url)
    if (!sourceUrl) continue
    const origin = new URL(sourceUrl).origin
    const quickChecks = metadata.internal_link_checks
    if (Array.isArray(quickChecks)) {
      measuredLinkPages.add(page.observation_id)
      for (const raw of quickChecks) {
        const check = record(raw), target = sameOriginUrl(check?.url, origin)
        if (!check || !target) { unknownLinkPages.add(page.observation_id); continue }
        const status = check.status
        const httpStatus = httpFailureStatus(check.http_status)
        if (!['reachable', 'redirected', 'http_error', 'redirect_loop'].includes(String(status)) ||
          status === 'http_error' && httpStatus === null) unknownLinkPages.add(page.observation_id)
        const reference = { observationId: page.observation_id, evidenceId: 'internal_link_checks',
          value: `${String(status)}${httpStatus ? ` HTTP ${httpStatus}` : ''}` }
        if (status === 'http_error' && httpStatus) {
          addReference(linkIssues, linkRules[1], target, [reference],
            `The source page retained a link to this URL; Quick Scan received HTTP ${httpStatus}.`)
        } else if (status === 'redirect_loop') {
          addReference(loopIssues, linkRules[2], target, [reference], 'Quick Scan observed a repeated URL in this destination redirect chain.')
        }
      }
      continue
    }
  }

  for (const destination of pages) {
    if (!destination.discovered_from) continue
    const source = pageById.get(destination.discovered_from)
    if (!source?.observation_id || source.status !== 'completed') continue
    const sourceUrl = publicUrl(source.final_url ?? record(source.metadata)?.fetched_url ?? source.url)
    const target = sameOriginUrl(destination.final_url ?? destination.url, sourceUrl ? new URL(sourceUrl).origin : '')
    if (!target || !sourceUrl) continue
    measuredLinkPages.add(source.observation_id)
    const statusReason = httpFailureReason(destination.reason)
    if (destination.status === 'failed' && (statusReason || destination.reason === 'redirect_loop')) {
      const pageReference = { ...(destination.id ? { pageId: destination.id } : {}),
        evidenceId: 'reason', value: statusReason?.value ?? 'redirect_loop' }
      const linkReference = { ...(destination.id ? { pageId: destination.id } : {}),
        evidenceId: 'discovered_from', value: destination.discovered_from }
      const sourceReference = { observationId: source.observation_id, evidenceId: 'fetched_url', value: sourceUrl }
      if (statusReason) addReference(linkIssues, linkRules[1], target, [sourceReference, linkReference, pageReference],
        `The retained destination row confirms HTTP ${statusReason.code}.`)
      else addReference(loopIssues, linkRules[2], target, [sourceReference, linkReference, pageReference],
        'The retained destination row confirms a redirect loop.')
    } else if (destination.status !== 'completed' &&
      !(destination.status === 'skipped' && destination.reason === 'redirect_alias')) {
      unknownLinkPages.add(source.observation_id)
    }
  }

  const makeGroup = (rule: typeof linkRules[number], issues: Map<string, WebsiteIssue>, measuredPages: number, unknownPages: number) => ({
    ...rule, measuredPages, unknownPages, affectedUrls: [...issues.keys()].sort(), issues: [...issues.values()].sort((a, b) => a.affectedUrl.localeCompare(b.affectedUrl)),
  })
  const httpMeasuredPages = new Set(pages.filter(page => page.status === 'completed' &&
    typeof record(page.metadata)?.http_status === 'number' || page.status === 'failed' && Boolean(httpFailureReason(page.reason)) ||
    (page.status === 'failed' && page.reason === 'redirect_loop'))
    .map(page => page.id ?? page.observation_id ?? page.url))
  for (const page of pages) if (Array.isArray(record(page.metadata)?.internal_link_checks))
    httpMeasuredPages.add(page.id ?? page.observation_id ?? page.url)
  const httpMeasured = httpMeasuredPages.size
  const assessedLinkPages = Math.max(0, measuredLinkPages.size - unknownLinkPages.size)
  return [
    makeGroup(linkRules[0], httpIssues, httpMeasured, Math.max(0, pages.length - httpMeasured)),
    makeGroup(linkRules[1], linkIssues, assessedLinkPages, Math.max(0, analyzedPages - assessedLinkPages)),
    makeGroup(linkRules[2], loopIssues, httpMeasured, Math.max(0, pages.length - httpMeasured)),
  ]
}

export function buildWebsiteIssueReport(pages: IssuePage[], summary?: unknown) {
  const completed = pages.filter(p => p.status === 'completed')
  const analyzed = new Map<string, IssuePage>()
  for (const page of completed) {
    const url = publicUrl(page.final_url ?? record(page.metadata)?.fetched_url ?? page.url)
    if (url && page.observation_id && record(page.metadata) && !analyzed.has(url)) analyzed.set(url, page)
  }
  const results = [...analyzed].sort(([a], [b]) => a.localeCompare(b)).map(([url, page]) => detectWebsiteIssues({
    affectedUrl: url, observationId: page.observation_id!, metadata: page.metadata,
  }))
  const groups = [...rules.map(rule => {
    const issues = results.flatMap(result => result.issues.filter(issue => issue.ruleId === rule.id))
    const measuredPages = results.filter(result => result.measuredRules.includes(rule.id)).length
    return { ruleId: rule.id, title: rule.title, severity: rule.severity, recommendedFix: rule.fix,
      measuredPages, unknownPages: analyzed.size - measuredPages, affectedUrls: issues.map(issue => issue.affectedUrl), issues }
  }), ...buildSeoIssueGroups([...analyzed].sort(([a], [b]) => a.localeCompare(b)).map(([url, page]) => {
    const metadata = record(page.metadata), auditId = metadata?.audit_id
    return { url, observationId: page.observation_id!, values: measurements(page.metadata),
      auditId: metadata?.record_kind === 'audit_page' && typeof auditId === 'string' && auditId.length > 0 && auditId.length <= 64 ? auditId : null }
  })), ...buildInternalLinkGroups(pages, analyzed.size)]
  // Resources are separate observations, not page defects. Shared/cache evidence
  // repeated on every page and the summary appears once per URL/status/result.
  const resources = new Map<string, { kind: string; url: string; status: string; httpStatus: number | null }>()
  for (const metadata of [...analyzed.values()].map(p => p.metadata).concat([summary])) {
    const checks = record(metadata)?.site_checks
    if (!Array.isArray(checks)) continue
    for (const item of checks) {
      const check = record(item), url = publicUrl(check?.url)
      if (!check || !url || !['robots', 'sitemap'].includes(String(check.kind)) || typeof check.status !== 'string') continue
      const httpStatus = typeof check.http_status === 'number' && Number.isInteger(check.http_status) && check.http_status >= 100 && check.http_status <= 599 ? check.http_status : null
      const result = { kind: String(check.kind), url, status: check.status, httpStatus }
      resources.set(JSON.stringify(result), result)
    }
  }
  return { version: WEBSITE_ISSUE_REPORT_VERSION, groups,
    coverage: { completedPages: completed.length, analyzedPages: analyzed.size, candidatePages: pages.length,
      partial: true as const, pendingPages: pages.filter(p => ['queued', 'processing', 'discovered'].includes(p.status)).length,
      failedPages: pages.filter(p => p.status === 'failed').length, skippedPages: pages.filter(p => p.status === 'skipped').length },
    resources: [...resources.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    limitations: ['Navigation-only coverage is partial; undiscovered pages are unknown.', 'Absent or malformed measurements are unknown, not proof of a defect.',     'Unverified network failures and excluded pages are coverage outcomes. Only explicit HTTP error responses and observed redirect loops are reported as issues.',
      'SEO duplicate checks compare complete retained text only within the same audit and origin; Quick Scans cannot establish uniqueness.',
      'Only the first canonical declaration is retained. Missing/relative/capped declarations, multiple tags, unseen targets and canonical chains are not assessed.',
      'Quick Scan checks at most five internal HTML links. Full Audit link findings require both a retained source link and a confirmed destination error; pending, skipped, blocked and unverified destinations are not reported as broken.'] }
}
