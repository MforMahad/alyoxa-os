import { buildWebsiteIssueReport, type IssuePage } from '../websiteIssues'
import { observationMetadata } from '../websiteResultGroups'
export type ReportKind = 'scan' | 'audit'
export interface ReportObservation { id: string; metadata: unknown }
export interface ReportPage extends IssuePage { admitted?: boolean; reason?: string | null }
export interface ReportInput { kind: ReportKind; id: string; status: string; createdAt: string; target: string; pageLimit: number; truncated?: boolean; pages: ReportPage[]; summary?: unknown }
export interface SavedSuggestion { text: string; caveat: string; evidenceIds: string[]; pageUrl: string }
export function safeLink(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try { const u = new URL(value); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null; u.hash = ''; return u.toString() } catch { return null }
}
export function buildReport(input: ReportInput) {
  if (input.pages.length > 1500 || JSON.stringify(input).length > 4_000_000) throw new Error('EXPORT_TOO_LARGE')
  if (!['completed', 'partial', 'failed', 'cancelled'].includes(input.status)) throw new Error('RUN_IN_PROGRESS')
  if (input.pages.some(p => p.status === 'completed' && (!p.observation_id || !p.metadata))) throw new Error('EVIDENCE_INCOMPLETE')
  const pages = input.pages.map(p => ({ ...p, url: safeLink(p.url) ?? 'URL unavailable', final_url: safeLink(p.final_url) }))
  const issues = buildWebsiteIssueReport(pages, input.summary)
  const limitations = new Set<string>(input.kind === 'scan'
    ? ['One saved URL only. No site-wide crawl, rendered-browser test, performance score or ranking measurement.', 'Historical Quick Scans may retain the origin rather than the originally submitted path/query.']
    : issues.limitations)
  if (input.truncated) limitations.add('Discovery was truncated. This report does not represent every page on the website.')
  if (input.status !== 'completed') limitations.add('This run did not complete fully. Missing or failed checks are not clean results.')
  const suggestions: SavedSuggestion[] = []
  for (const page of pages) {
    const m = observationMetadata(page.metadata)
    if (Array.isArray(m.limitations)) m.limitations.filter((s): s is string => typeof s === 'string').forEach(s => limitations.add(s))
    const evidence = Array.isArray(m.evidence) ? m.evidence.map(observationMetadata) : []
    const ids = new Set(evidence.filter(e => typeof e.id === 'string').map(e => e.id))
    const ai = observationMetadata(m.ai)
    if (ai.status === 'available' && Array.isArray(ai.recommendations)) for (const raw of ai.recommendations) {
      const s = observationMetadata(raw)
      if (typeof s.recommendation === 'string' && typeof s.caveat === 'string' && Array.isArray(s.evidenceIds) && s.evidenceIds.length && s.evidenceIds.every(id => typeof id === 'string' && ids.has(id)))
        suggestions.push({ text: s.recommendation, caveat: s.caveat, evidenceIds: s.evidenceIds as string[], pageUrl: page.final_url ?? page.url })
    }
  }
  const findings = issues.groups.flatMap(g => g.issues).sort((a,b) => Number(b.severity === 'medium') - Number(a.severity === 'medium') || a.ruleId.localeCompare(b.ruleId) || a.affectedUrl.localeCompare(b.affectedUrl))
  return { ...input, target: safeLink(input.target) ?? 'URL unavailable', pages, issues, findings, suggestions, limitations: [...limitations] }
}
export type WebsitePdfReport = ReturnType<typeof buildReport>
