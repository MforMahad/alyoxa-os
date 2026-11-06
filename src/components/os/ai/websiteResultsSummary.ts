import { safeLink } from '@/lib/os/signal/reporting/data'
import type { WebsiteResultRun } from '@/lib/os/signal/websiteResultGroups'
import { observationMetadata } from '@/lib/os/signal/websiteResultGroups'
import { buildWebsiteIssueReport, type IssuePage } from '@/lib/os/signal/websiteIssues'
export interface ScanResultStatus { id: string; status: string; error_message: string | null; entry_url?: string; observationCount: number }
export interface AuditSnapshot { status: string; pages: IssuePage[]; summary?: unknown }
function count(value: unknown) { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null }
function confirmedHttpReason(value: string | null | undefined) {
  if (!value) return null
  const match = value.match(/(?:^|:\s*)http_([45]\d\d)$/i) ?? value.match(/^Website returned HTTP ([45]\d\d)\.$/i)
  if (!match) return null
  const code = Number(match[1])
  return [401, 403, 408, 429].includes(code) ? null : `http_${code}`
}
export function websiteResultsSummary(run: WebsiteResultRun, scans: ScanResultStatus[], audit?: AuditSnapshot | null) {
  const observation = run.summary ?? (run.kind !== 'audit' ? run.observations[0] : undefined)
  const metadata = observationMetadata(audit?.summary ?? observation?.metadata)
  const loadedPages = run.observations.filter(o => o.category !== 'website_audit_summary' && observationMetadata(o.metadata).record_kind !== 'audit_summary')
  const scan = scans.find(s => run.id === `scan:${s.id}`)
  const scanFailure = run.kind === 'scan' && scan?.status === 'failed' && confirmedHttpReason(scan.error_message)
    ? [{ id: scan.id, url: scan.entry_url ?? '', status: 'failed', reason: confirmedHttpReason(scan.error_message), metadata: null } as IssuePage]
    : []
  const report = buildWebsiteIssueReport(audit?.pages ?? [
    ...loadedPages.map(o => ({ url: String(observationMetadata(o.metadata).fetched_url ?? ''), status: 'completed', observation_id: o.id, metadata: o.metadata })),
    ...scanFailure,
  ], metadata)
  const status = run.kind === 'scan' ? scan?.status ?? 'unknown' : audit?.status ?? 'unknown'
  const counts = observationMetadata(metadata.counts)
  const measured = report.groups.some(g => g.measuredPages > 0)
  const groups = report.groups.filter(g => g.issues.length).sort((a,b) => Number(b.severity === 'medium') - Number(a.severity === 'medium'))
  const issues = groups.reduce((n,g) => n + g.issues.length,0)
  const ai = observationMetadata(metadata.ai)
  const evidence = new Set((Array.isArray(metadata.evidence) ? metadata.evidence : []).map(e => observationMetadata(e).id))
  const suggestions = ai.status === 'available' && Array.isArray(ai.recommendations) ? ai.recommendations.map(observationMetadata).filter(s => typeof s.recommendation === 'string' && Array.isArray(s.evidenceIds) && s.evidenceIds.length && s.evidenceIds.every(id => typeof id === 'string' && evidence.has(id))) : []
  const reportedCompleted = count(counts.completed) ?? count(observationMetadata(metadata.findings).denominator_completed_pages)
  const countValues = Object.values(counts)
  const expectedTotal = countValues.length && countValues.every(v => count(v) !== null) ? countValues.reduce<number>((n,v) => n + (v as number),0) : null
  const completeEvidenceLoaded = Boolean(audit && expectedTotal !== null && audit.pages.length === expectedTotal && report.coverage.completedPages === (reportedCompleted ?? 0) && audit.pages.filter(p => p.status === 'completed').every(p => p.observation_id && p.metadata))
  const limitations = [...new Set([
    ...(Array.isArray(metadata.limitations) ? metadata.limitations.filter((v): v is string => typeof v === 'string') : []),
    ...report.groups.flatMap(g => g.issues.flatMap(i => i.limitations)),
  ])]
  return { target: safeLink(metadata.target_url ?? metadata.fetched_url) ?? (scanFailure.length ? safeLink(scan?.entry_url) : null), status, report, groups, issues: measured ? issues : null, analyzed: measured ? report.coverage.analyzedPages : null,
    failed: audit ? report.coverage.failedPages : run.kind === 'audit' ? count(counts.failed) : status === 'failed' ? 1 : status === 'completed' ? 0 : null,
    skipped: audit ? report.coverage.skippedPages : run.kind === 'audit' ? count(counts.skipped) : status === 'skipped' ? 1 : status === 'completed' ? 0 : null,
    suggestions, limitations, reportedCompleted, completeEvidenceLoaded,
    coverage: run.kind === 'audit' ? 'Navigation-only coverage; undiscovered pages remain unknown.' : run.kind === 'scan' ? 'Single-URL check with at most five sampled internal links; rendered behavior, performance and rankings were not checked.' : 'Historical saved measurements; original scan coverage is unavailable.',
    summary: !measured ? 'The loaded evidence does not support a verified findings count. Unavailable checks are not clean results.' : issues ? `${issues} verified issue${issues === 1 ? '' : 's'} in the ${completeEvidenceLoaded ? 'retained' : 'loaded'} HTML evidence. Review the supported fixes below, starting with medium-priority items.` : 'No supported issues were detected in the available measurements. This does not establish that the website is free of issues.',
  }
}
