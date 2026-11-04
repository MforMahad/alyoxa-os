/** Read-time interpretations only. Never fetches, writes or invokes AI. */
export const WEBSITE_ISSUES_VERSION = 1 as const
type Value = string | number | boolean
export interface WebsiteIssue {
  ruleId: string
  title: string
  severity: 'low' | 'medium'
  confidence: 'high'
  affectedUrl: string
  evidenceReferences: { observationId: string; evidenceId: string; value: Value }[]
  recommendedFix: string
  limitations: string[]
}
export interface IssuePage {
  url: string
  final_url?: string | null
  status: string
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
  const groups = rules.map(rule => {
    const issues = results.flatMap(result => result.issues.filter(issue => issue.ruleId === rule.id))
    const measuredPages = results.filter(result => result.measuredRules.includes(rule.id)).length
    return { ruleId: rule.id, title: rule.title, severity: rule.severity, recommendedFix: rule.fix,
      measuredPages, unknownPages: analyzed.size - measuredPages, affectedUrls: issues.map(issue => issue.affectedUrl), issues }
  })
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
  return { version: WEBSITE_ISSUES_VERSION, groups,
    coverage: { completedPages: completed.length, analyzedPages: analyzed.size, candidatePages: pages.length,
      partial: true as const, pendingPages: pages.filter(p => ['queued', 'processing', 'discovered'].includes(p.status)).length,
      failedPages: pages.filter(p => p.status === 'failed').length, skippedPages: pages.filter(p => p.status === 'skipped').length },
    resources: [...resources.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    limitations: ['Navigation-only coverage is partial; undiscovered pages are unknown.', 'Absent or malformed measurements are unknown, not proof of a defect.', 'Network failures and excluded pages are coverage outcomes, not website issues.'] }
}
