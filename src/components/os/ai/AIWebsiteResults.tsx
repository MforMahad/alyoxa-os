'use client'

import Link from 'next/link'
import { DownloadWebsitePdf } from './DownloadWebsitePdf'
import { useSearchParams } from 'next/navigation'
import { StatusBadge } from '../shell/StatusBadge'
import { useEffect, useState } from 'react'
import { getWebsiteAuditStatus } from '@/actions/signal/getWebsiteAuditStatus'
import { websiteResultsSummary, type AuditSnapshot } from './websiteResultsSummary'
import styles from './WebsiteResults.module.css'
import type { PersistedSignalFeedSource, PersistedSignalObservation } from '@/data/os/signal'
import type { AITab } from './AISubNav'
import { groupWebsiteResults, type WebsiteResultRun } from '@/lib/os/signal/websiteResultGroups'
import { useWorkspace } from '@/components/os/workspace/WorkspaceProvider'

interface ScanHistoryItem { id: string; status: string; error_message: string | null; entry_url?: string; normalized_domain?: string; created_at?: string; observationCount: number }
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
function WebsiteResultsContent({ observations, sources, scans, activeTab, workspaceId }: Props) {
  const groups = groupWebsiteResults(observations, sources, scans.filter(scan => scan.normalized_domain).map(scan => ({
    id: scan.id, status: scan.status, created_at: scan.created_at ?? '', normalized_domain: scan.normalized_domain!,
  })))
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
  const selectClass = 'w-full min-w-0 border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--signal)]'
  if (!website) return <div className="os-panel os-empty-state"><h2>{groups.length ? 'The selected website is unavailable' : 'No website results yet'}</h2><p>{groups.length ? 'This website is not in the current workspace’s loaded results. Choose another website.' : 'Check a website to save measurements and supported findings here.'}</p>{groups.length ? <button className="os-button os-button-outline" onClick={() => saveSelection('', '')}>Show available websites</button> : <Link href="/app#website-checks" className="os-text-link">Check a website</Link>}</div>
  return <div className={styles.shell}>
    <div className={styles.filters}>
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
    <p className={styles.historyNote}>Choose a saved check. This history window contains the latest 200 workspace measurements; older entries may not appear here.</p>
    {!run ? <p className="font-mono text-xs text-[var(--muted)]">{runId ? 'The selected check is not available for this website. Choose another check above.' : 'No saved results for this website. Start a check to collect measurements.'}</p> : activeTab === 'context' ? <SelectedWebsiteResult key={`${website.id}:${run.id}`} run={run} scans={scans} workspaceId={workspaceId} /> : <div className="os-panel os-section-body"><h2>{activeTab === 'decisions' ? 'No saved decisions for these results' : 'No processing records for these results'}</h2><p>Website suggestions are available in Results when configured. They do not automatically create decisions or execute work.</p></div>}
  </div>
}

export function SelectedWebsiteResult({ run, scans, workspaceId = null }: { run: WebsiteResultRun; scans: ScanHistoryItem[]; workspaceId?: string | null }) {
  const [audit, setAudit] = useState<AuditSnapshot | null>(null)
  const [auditState, setAuditState] = useState<'loading' | 'available' | 'unavailable'>(run.kind === 'audit' && workspaceId ? 'loading' : 'unavailable')
  useEffect(() => {
    if (run.kind !== 'audit' || !workspaceId) return
    let current = true
    getWebsiteAuditStatus(workspaceId, run.id.slice('audit:'.length)).then(result => {
      if (!current) return
      if (result.success && result.data) { setAudit(result.data); setAuditState('available') }
      else setAuditState('unavailable')
    }).catch(() => { if (current) setAuditState('unavailable') })
    return () => { current = false }
  }, [workspaceId, run.kind, run.id])
  const model = websiteResultsSummary(run, scans, audit)
  const title = run.kind === 'audit' ? 'Full Website Audit' : run.kind === 'scan' ? 'Quick Scan' : 'Historical website result'
  const metrics = [['Analyzed pages', model.analyzed], ['Verified issues', model.issues], ...(run.kind === 'audit' ? [['Failed pages', model.failed], ['Skipped pages', model.skipped]] : [])]
  return <div className={styles.shell}>
    <section className={styles.summary} aria-label="Website result summary">
      <div className={styles.titleRow}><div><p className={styles.eyebrow}>Website intelligence</p><h2>{title}</h2><p className={styles.date}>{dateLabel(run.timestamp)}</p>{model.target && <p className={styles.target}>{model.target}</p>}</div>{auditState === 'loading' && run.kind === 'audit' ? <span className={styles.pending} role="status">Loading run status...</span> : <StatusBadge status={model.status}/>}</div>
      <div className={`${styles.metrics} ${metrics.length === 2 ? styles.twoMetrics : ''}`}>{metrics.map(([label,value]) => <div className={styles.metric} key={String(label)}><span>{label}</span><strong>{value === null ? 'Unavailable' : value}</strong><small>{model.completeEvidenceLoaded ? 'Retained audit evidence' : 'Loaded evidence only'}</small></div>)}</div>
      <p className={styles.findingsSummary}>{model.summary}</p>
      <p className={styles.coverage}>{model.coverage}</p>
      {run.kind === 'audit' && !model.completeEvidenceLoaded && <p className={styles.notice}>{auditState === 'loading' ? 'Checking the selected run and its retained coverage.' : audit ? 'Only a subset of retained evidence is available in this summary.' : 'Full run status and coverage are unavailable. The summary below uses loaded measurements only.'}{model.reportedCompleted !== null && ` ${model.report.coverage.completedPages} loaded page observation(s) of ${model.reportedCompleted} analyzed pages reported by the summary.`} The PDF export independently checks the complete retained evidence.</p>}
      {['partial','failed','cancelled'].includes(model.status) && <p className={styles.notice}>This run did not complete fully. Failed, skipped and unavailable checks must not be treated as healthy results.</p>}
      <p className={styles.limitations}>Findings reflect fetched HTML only. Unavailable checks are not clean results. Full retained limitations and evidence remain in the PDF report.</p>
    </section>
    {run.kind !== 'observation' && <DownloadWebsitePdf key={run.id} kind={run.kind} runId={run.id.slice(run.id.indexOf(':') + 1)}/>}
    <section className={styles.recommendations} aria-label="Recommendations">
      <div className={styles.sectionTitle}><p className={styles.eyebrow}>Your next steps</p><h2>Recommendations</h2><p>Verified fixes come from measured HTML findings. Saved AI suggestions are separate, unverified advice.</p></div>
      <h3>Verified fixes</h3>
      {model.groups.length ? <div className={styles.fixGrid}>{model.groups.map(group => <article className={styles.fix} key={group.ruleId}><div className={styles.fixHeading}><h4>{group.title}</h4><span className={group.severity === 'medium' ? styles.medium : styles.low}>{group.severity} priority</span></div><p>{group.recommendedFix}</p><small>{group.affectedUrls.length} affected URL(s) in {model.completeEvidenceLoaded ? 'retained' : 'loaded'} evidence. Supporting details are in the PDF report.</small></article>)}</div> : <p className={styles.empty}>{model.issues === null ? 'There is not enough measured evidence to recommend a verified fix.' : 'No supported fixes were identified in the available measurements. Unknown checks remain unverified.'}</p>}
      <div className={styles.aiSection}><h3>Saved AI suggestions <span>Unverified</span></h3>{model.suggestions.length ? <><p className={styles.historyNote}>Review these suggestions before acting. Full text, evidence references and caveats remain in your PDF report.</p>{model.suggestions.map((suggestion,index) => <article className={styles.suggestion} key={index}><p>{String(suggestion.recommendation)}</p>{typeof suggestion.caveat === 'string' && <small>{suggestion.caveat}</small>}</article>)}</> : <p className={styles.empty}>No usable saved AI suggestions are available for this result. No new AI analysis has been generated.</p>}</div>
    </section>
  </div>
}
