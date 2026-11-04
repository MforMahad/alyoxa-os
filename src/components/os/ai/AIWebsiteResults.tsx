'use client'

import { useState } from 'react'
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
  const [websiteId, setWebsiteId] = useState('')
  const [runId, setRunId] = useState('')
  const website = groups.find(g => g.id === websiteId) ?? groups[0]
  const run = website?.runs.find(r => r.id === runId) ?? website?.runs[0]
  const contexts = buildWebsiteContexts(run?.observations ?? [])
  const selectClass = 'w-full min-w-0 border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--signal)]'
  if (!website) return <div className="border border-[var(--border)] p-6 font-mono text-xs text-[var(--muted)]">No website results are available in this workspace.</div>
  return <div className="space-y-4">
    <div className="grid gap-4 border border-[var(--border)] bg-[var(--surface)]/20 p-4 font-mono sm:grid-cols-2">
      <label className="space-y-2 min-w-0"><span className="block text-[10px] uppercase tracking-widest text-[var(--muted)]">Website</span>
        <select aria-label="Website results" value={website.id} onChange={event => { setWebsiteId(event.target.value); setRunId('') }} className={selectClass}>
          {groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}
        </select>
      </label>
      <label className="space-y-2 min-w-0"><span className="block text-[10px] uppercase tracking-widest text-[var(--muted)]">Scan / audit history</span>
        <select aria-label="Scan or audit history" disabled={!run} value={run?.id ?? ''} onChange={event => setRunId(event.target.value)} className={selectClass}>
          {!run && <option value="">No retained results</option>}
          {website.runs.map(item => <option key={item.id} value={item.id}>{item.kind === 'audit' ? 'Full Audit' : item.kind === 'scan' ? 'Quick Scan' : 'Historical result'} · {dateLabel(item.timestamp)} · {item.id}</option>)}
        </select>
      </label>
    </div>
    <p className="font-mono text-[10px] text-[var(--muted)]">History includes retained results from the 200 most recent workspace observations. Older results or audit pages may be outside this window. Only the selected website and history entry are shown.</p>
    {!run ? <p className="font-mono text-xs text-[var(--muted)]">No retained observations for this website.</p> : activeTab === 'context' ? <SelectedWebsiteResult key={`${website.id}:${run.id}`} run={run} scans={scans} /> : activeTab === 'decisions' ? <AIDecisionsWorkspace decisions={[]} contexts={contexts} /> : <AIRunsWorkspace runs={[]} decisions={[]} contexts={contexts} />}
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
      {scan && <p>Status: {scan.status === 'completed' && scan.observationCount === 0 ? 'Unverified completion' : scan.status}{scan.error_message ? ` — ${scan.error_message}` : ''}</p>}
      {run.kind === 'audit' && <>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {['completed', 'failed', 'skipped'].map(status => typeof counts[status] === 'number' && <span key={status}>{status === 'completed' ? 'Analyzed' : status === 'skipped' ? 'Excluded' : 'Failed'}: {counts[status] as number}</span>)}
          {typeof data.page_limit === 'number' && <span>Admission limit: {data.page_limit}</span>}
        </div>
        {typeof findings.missing_titles === 'number' && <p>Missing titles: {findings.missing_titles} · Missing descriptions: {typeof findings.missing_descriptions === 'number' ? findings.missing_descriptions : 'Not measured'}</p>}
        <p className="text-[var(--muted)]">{pages.length} page observations loaded{typeof findings.denominator_completed_pages === 'number' ? ` of ${findings.denominator_completed_pages} analyzed pages reported by the summary` : ''}. Navigation-only coverage remains partial; undiscovered pages are unknown.</p>
      </>}
      <p className="text-[var(--muted)]">AI recommendations: {typeof ai.status === 'string' ? ai.status : 'Not generated for this result'}.</p>
      {summary && <details className="border-t border-[var(--border)] pt-3"><summary className="cursor-pointer text-[var(--signal)]">Measurements, recommendations and limitations</summary><div className="pt-3"><WebsiteObservationDetails metadata={summary.metadata} /></div></details>}
    </article>
    {run.kind === 'audit' && <details className="border border-[var(--border)] p-4">
      <summary className="cursor-pointer">Page-level details ({pages.length} loaded)</summary>
      <div className="mt-3 max-h-[480px] overflow-y-auto divide-y divide-[var(--border)]">{pages.map(page => {
        const metadata = observationMetadata(page.metadata)
        return <details key={page.id} className="py-3"><summary className="cursor-pointer break-all">{typeof metadata.fetched_url === 'string' ? metadata.fetched_url : page.title}</summary><div className="pt-3"><WebsiteObservationDetails metadata={page.metadata} /></div></details>
      })}</div>
    </details>}
    <details className="border border-[var(--border)] p-4">
      <summary className="cursor-pointer">AI context ({contexts.length})</summary>
      <div className="mt-3"><AIContextWorkspace key={run.id} items={contexts} /></div>
    </details>
  </div>
}
