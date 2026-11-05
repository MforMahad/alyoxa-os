'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { StatusBadge } from '../shell/StatusBadge'
import { WebsiteIssueSummary } from '../workspace/WebsiteIssueSummary'
import { buildWebsiteIssueReport } from '@/lib/os/signal/websiteIssues'
import type { PersistedSignalFeedSource, PersistedSignalObservation } from '@/data/os/signal'
import type { AITab } from './AISubNav'
import { groupWebsiteResults, observationMetadata, type WebsiteResultRun } from '@/lib/os/signal/websiteResultGroups'
import { buildWebsiteContexts } from '@/lib/os/signal/persistedWebsiteContexts'
import { WebsiteObservationDetails } from '@/components/os/signal/WebsiteObservationDetails'
import { useWorkspace } from '@/components/os/workspace/WorkspaceProvider'
import { AIContextWorkspace } from './AIContextWorkspace'
import { AIDecisionsWorkspace } from './AIDecisionsWorkspace'
import { AIRunsWorkspace } from './AIRunsWorkspace'

interface ScanHistoryItem { id: string; status: string; error_message: string | null; observationCount: number }
interface Props {
  workspaceId: string | null
  observations: PersistedSignalObservation[]
  sources: PersistedSignalFeedSource[]
  scans: ScanHistoryItem[]
  activeTab: AITab
}
function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString().replace('T', ' ').replace('.000Z', ' UTC')
}
export function AIWebsiteResults(props: Props) {
  const { workspace } = useWorkspace()
  if (!props.workspaceId || workspace?.id !== props.workspaceId) return <p className="font-mono text-xs text-[var(--muted)]">Loading the selected workspace’s website results…</p>
  return <WebsiteResultsContent key={props.workspaceId} {...props} />
}
function WebsiteResultsContent({ observations, sources, scans, activeTab }: Props) {
  const groups = groupWebsiteResults(observations, sources)
  const selection = useSearchParams()
  const websiteId = selection.get('website') ?? ''
  const runId = selection.get('result') ?? ''
  function saveSelection(website: string, result: string) {
    const params = new URLSearchParams(window.location.search)
    params.set('website', website)
    if (result) params.set('result', result); else params.delete('result')
    window.history.replaceState(null, '', window.location.pathname + '?' + params.toString())
  }
  const website = websiteId ? groups.find(g => g.id === websiteId) : runId ? groups.find(g => g.runs.some(run => run.id === runId)) : groups[0]
  const run = runId ? website?.runs.find(r => r.id === runId) : website?.runs[0]
  const contexts = buildWebsiteContexts(run?.observations ?? [])
  const selectClass = 'w-full min-w-0 border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--signal)]'
  if (!website) return <div className="os-panel os-empty-state"><h2>{groups.length ? 'The selected website is unavailable' : 'No website results yet'}</h2><p>{groups.length ? 'This website is not in the current workspace’s loaded results. Choose another website.' : 'Check a website to save measurements and supported findings here.'}</p>{groups.length ? <button className="os-button os-button-outline" onClick={() => saveSelection('', '')}>Show available websites</button> : <Link href="/app#website-checks" className="os-text-link">Check a website</Link>}</div>
  return <div className="space-y-4">
    <div className="grid gap-4 border border-[var(--border)] bg-[var(--surface)]/20 p-4 font-mono sm:grid-cols-2">
      <label className="space-y-2 min-w-0"><span className="block text-[10px] uppercase tracking-widest text-[var(--muted)]">Website</span>
        <select aria-label="Website results" value={website.id} onChange={event => saveSelection(event.target.value, '')} className={selectClass}>
          {groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}
        </select>
      </label>
      <label className="space-y-2 min-w-0"><span className="block text-[10px] uppercase tracking-widest text-[var(--muted)]">Scan / audit history</span>
        <select aria-label="Scan or audit history" disabled={!website.runs.length} value={run?.id ?? ''} onChange={event => saveSelection(website.id, event.target.value)} className={selectClass}>
          {!run && <option value="">{runId ? 'Choose an available check' : 'No retained results'}</option>}
          {website.runs.map(item => <option key={item.id} value={item.id}>{item.kind === 'audit' ? 'Full Audit' : item.kind === 'scan' ? 'Quick Scan' : 'Historical result'} · {dateLabel(item.timestamp)}</option>)}
        </select>
      </label>
    </div>
    <details className="os-technical"><summary>About this history</summary><p>History includes retained results from the 200 most recent workspace measurements. Older results or audit pages may be outside this window. Only the selected website and history entry are shown.</p></details>
    {!run ? <p className="font-mono text-xs text-[var(--muted)]">{runId ? 'The selected check is not available for this website. Choose another check above.' : 'No saved results for this website. Start a check to collect measurements.'}</p> : activeTab === 'context' ? <SelectedWebsiteResult key={`${website.id}:${run.id}`} run={run} scans={scans} /> : <div className="os-panel os-section-body"><h2>{activeTab === 'decisions' ? 'No saved decisions for these results' : 'No processing records for these results'}</h2><p>Website suggestions are available in Results when configured. They do not automatically create decisions or execute work.</p><details><summary>Technical details</summary>{activeTab === 'decisions' ? <AIDecisionsWorkspace decisions={[]} contexts={contexts} /> : <AIRunsWorkspace runs={[]} decisions={[]} contexts={contexts} />}</details></div>}
  </div>
}

export function SelectedWebsiteResult({ run, scans }: { run: WebsiteResultRun; scans: ScanHistoryItem[] }) {
  const summary = run.summary ?? (run.kind !== 'audit' ? run.observations[0] : undefined)
  const data = observationMetadata(summary?.metadata)
  const findings = observationMetadata(data.findings)
  const counts = observationMetadata(data.counts)
  const ai = observationMetadata(data.ai)
  const pages = run.kind === 'audit' ? run.observations.filter(o => observationMetadata(o.metadata).record_kind !== 'audit_summary' && o.category !== 'website_audit_summary') : run.observations
  const scan = scans.find(s => run.id === `scan:${s.id}`)
  const contexts = buildWebsiteContexts(run.observations)
  return <div className="space-y-4 font-mono text-xs">
    <article className="space-y-3 border border-[var(--border)] bg-[var(--surface)]/20 p-4">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold uppercase tracking-wider">{run.kind === 'audit' ? 'Audit summary' : run.kind === 'scan' ? 'Quick Scan summary' : 'Observation summary'}</h2><span className="text-[10px] text-[var(--muted)]">{dateLabel(run.timestamp)}</span></div>
      <p className="break-words line-clamp-3">{summary?.description ?? 'No site-wide summary is present in the loaded observations. Page evidence is available below.'}</p>
      {typeof data.target_url === 'string' && <p className="break-all text-[var(--muted)]">Target: {data.target_url}</p>}
      {scan && <><StatusBadge status={scan.status} />{scan.status === 'completed' && scan.observationCount === 0 && <p>No retained measurements verify this completion. Run a new check.</p>}{scan.error_message && <details><summary>Technical details about this check</summary><p>{scan.error_message}</p></details>}</>}
      {run.kind === 'audit' && <>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {['completed', 'failed', 'skipped'].map(status => typeof counts[status] === 'number' && <span key={status}>{status === 'completed' ? 'Analyzed' : status === 'skipped' ? 'Not checked' : 'Could not check'}: {counts[status] as number}</span>)}
          {typeof data.page_limit === 'number' && <span>Maximum pages to check: {data.page_limit}</span>}
        </div>
        {typeof findings.missing_titles === 'number' && <p>Missing titles: {findings.missing_titles} · Missing descriptions: {typeof findings.missing_descriptions === 'number' ? findings.missing_descriptions : 'Not measured'}</p>}
        <p className="text-[var(--muted)]">{pages.length} page observations loaded{typeof findings.denominator_completed_pages === 'number' ? ` of ${findings.denominator_completed_pages} analyzed pages reported by the summary` : ''}. Navigation-only coverage remains partial; undiscovered pages are unknown.</p>
      </>}
      <p className="text-[var(--muted)]">AI suggestions: {ai.status === 'available' ? 'Available for review; suggestions are not verified findings.' : 'Not available for this result. Measured findings remain available.'}</p>
      {ai.status === 'available' && Array.isArray(ai.recommendations) && <section className="os-section-body"><h3>Suggested improvements</h3><p>These AI-generated suggestions need your review. They are not verified website defects.</p><ul className="space-y-3">{ai.recommendations.map((item, index) => {
        const suggestion = observationMetadata(item)
        return typeof suggestion.recommendation === 'string' ? <li key={index}><p>{suggestion.recommendation}</p><details><summary>Supporting details</summary><p>{typeof suggestion.caveat === 'string' ? suggestion.caveat : 'No additional caveat retained.'}</p><p>{Array.isArray(suggestion.evidenceIds) ? suggestion.evidenceIds.filter(id => typeof id === 'string').join(', ') : 'Evidence references unavailable.'}</p></details></li> : null
      })}</ul></section>}
      {summary && <details className="border-t border-[var(--border)] pt-3"><summary className="cursor-pointer text-[var(--signal)]">Measurements, recommendations and limitations</summary><div className="pt-3"><WebsiteObservationDetails metadata={summary.metadata} /></div></details>}
    </article>
    <WebsiteIssueSummary report={buildWebsiteIssueReport(pages.map(o => ({ url: String(observationMetadata(o.metadata).fetched_url ?? ''), status: 'completed', observation_id: o.id, metadata: o.metadata })), data)} />
    {run.kind === 'audit' && <details className="border border-[var(--border)] p-4">
      <summary className="cursor-pointer">Page-level details ({pages.length} loaded)</summary>
      <div className="mt-3 max-h-[480px] overflow-y-auto divide-y divide-[var(--border)]">{pages.map(page => {
        const metadata = observationMetadata(page.metadata)
        return <details key={page.id} className="py-3"><summary className="cursor-pointer break-all">{typeof metadata.fetched_url === 'string' ? metadata.fetched_url : page.title}</summary><div className="pt-3"><WebsiteObservationDetails metadata={page.metadata} /></div></details>
      })}</div>
    </details>}
    <details className="border border-[var(--border)] p-4">
      <summary className="cursor-pointer">Technical details &amp; supporting information ({contexts.length})</summary>
      <div className="mt-3"><AIContextWorkspace key={run.id} items={contexts} /></div>
    </details>
  </div>
}
