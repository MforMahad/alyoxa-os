'use client'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { submitWebsiteAudit } from '@/actions/signal/submitWebsiteAudit'
import { getWebsiteAuditStatus } from '@/actions/signal/getWebsiteAuditStatus'
import { useWorkspace } from './WorkspaceProvider'
import { WebsiteIssueSummary } from './WebsiteIssueSummary'
import { StatusBadge } from '../shell/StatusBadge'
import { WebsiteObservationDetails } from '../signal/WebsiteObservationDetails'
import { auditViewScope, currentAuditResponse } from './auditViewState'

type Result = Awaited<ReturnType<typeof getWebsiteAuditStatus>>
export default function WebsiteAuditPanel() {
  const { workspace } = useWorkspace()
  const [url, setUrl] = useState(workspace?.website_url ?? '')
  const [pageLimit, setPageLimit] = useState(5)
  const params = useSearchParams()
  const selected = params.get('audit') ?? undefined
  function setSelected(id: string) {
    const query = new URLSearchParams(window.location.search)
    query.set('audit', id)
    window.history.replaceState(null, '', window.location.pathname + '?' + query.toString() + window.location.hash)
  }
  const [result, setResult] = useState<Result>()
  const [loadedScope, setLoadedScope] = useState('')
  const [view, setView] = useState('summary')
  const [error, setError] = useState('')
  const [readError, setReadError] = useState('')
  const [saving, setSaving] = useState(false)
  const request = useRef<{ signature: string; key: string } | null>(null)
  const submitting = useRef(false)
  useEffect(() => {
    if (!workspace) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const next = await getWebsiteAuditStatus(workspace!.id, selected)
        if (!cancelled) { setLoadedScope(auditViewScope(workspace!.id, selected)); setResult(next); setReadError('') }
      } catch { if (!cancelled) setReadError('Audit status could not be refreshed. Reload this page to try again.') }
      if (!cancelled) timer = setTimeout(poll, 5000)
    }
    void poll()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [workspace, selected])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!workspace || submitting.current) return
    submitting.current = true; setSaving(true); setError('')
    const signature = JSON.stringify([workspace.id, url.trim(), pageLimit])
    if (request.current?.signature !== signature) request.current = { signature, key: crypto.randomUUID() }
    try {
      const created = await submitWebsiteAudit({ workspaceId: workspace.id, websiteUrl: url, pageLimit, idempotencyKey: request.current.key })
      if (!created.success) { setError(created.error); return }
      setResult(undefined); setSelected(created.data.audit_id); request.current = null
    } catch { setError('Audit submission could not be confirmed. Retry to recover the same request.') }
    finally { submitting.current = false; setSaving(false) }
  }
  const currentResult = currentAuditResponse(result, loadedScope, workspace?.id, selected)
  const data = currentResult?.success ? currentResult.data : null
  const counts = (data?.pages ?? []).reduce<Record<string, number>>((all, page) => { all[page.status] = (all[page.status] ?? 0) + 1; return all }, {})
  if (!workspace) return <p>Choose a workspace before starting an audit.</p>
  return <section className="os-audit-panel">
    <h2>Website audit</h2><p>Check several pages on one website and review supported issues and fixes. Pages that cannot be reached are reported separately.</p>
    <form onSubmit={submit} className="os-audit-form">
      <label>Website address<input aria-label="Full audit website URL" type="url" required maxLength={2048} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-website.com" /></label>
      <label>Maximum pages to check<select aria-label="Audit page limit" value={pageLimit} onChange={e => setPageLimit(Number(e.target.value))}>{[5,30,50,100].map(n=><option key={n} value={n}>{n} pages</option>)}</select></label>
      <button type="submit" disabled={saving} className="os-button os-button-teal">{saving ? 'Starting audit...' : 'Start website audit'}</button>
    </form>
    <p className="os-subtle">The limit includes pages that fail or are excluded. This is a public-HTML check, not a complete website or browser test.</p>
    {error && <p className="os-inline-error" role="alert">{error}</p>}
    {readError && <p className="os-inline-error" role="alert">{readError}</p>}
    {currentResult && !currentResult.success && <p className="os-inline-error" role="alert">{currentResult.error} Try reloading this page.</p>}
    {!currentResult && !error && !readError && <p role="status">Loading the selected audit...</p>}
    {result?.success && loadedScope.startsWith(workspace.id + ':') && result.history.length>0 && <label className="os-audit-history">Previous audits<select aria-label="Audit history" value={selected ?? result.history[0].id} onChange={e => { setSelected(e.target.value); setError('') }}>{result.history.map(a=><option key={a.id} value={a.id}>{a.start_url} - {new Date(a.created_at).toLocaleString()}</option>)}</select></label>}
    {currentResult?.success && !data && <div className="os-empty-state"><h3>No audits yet</h3><p>Enter a website address and start an audit to save your first results.</p></div>}
    {data && <div className="os-audit-results" aria-live="polite"><div className="os-section-title"><div><h3 className="break-words">{data.start_url}</h3><p>These results belong to the audit selected above.</p></div><StatusBadge status={data.status} /></div>
      <nav className="os-page-tabs" aria-label="Audit sections">{[['summary','Summary'],['issues','Issues & Fixes'],['pages','Pages Checked'],['technical','Technical Details']].map(([id,label])=><button key={id} type="button" aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</nav>
      {view==='summary' && <section className="os-section-body"><h3>What did we check?</h3><p>{counts.completed ?? 0} pages have saved measurements, {counts.queued ?? 0} are waiting and {counts.processing ?? 0} are being checked.</p><p>{counts.failed ?? 0} pages could not be checked; {counts.skipped ?? 0} were excluded. These are coverage outcomes, not confirmed website defects.</p><p>Coverage is partial: {data.pages.length} candidate URLs were found, and other pages may exist.{data.discovery_truncated ? ' Discovery reached a scanner limit.' : ''}</p><p>{data.issueReport.groups.reduce((n,g)=>n+g.issues.length,0)} supported issue findings in the available page evidence. Missing measurements remain unknown.</p><button type="button" className="os-button os-button-outline" onClick={()=>setView('issues')}>Review issues &amp; recommended fixes</button>{data.last_finalize_error_code && <p>The audit summary could not be saved yet. It is awaiting retry; the audit is not complete.</p>}</section>}
      {view==='issues' && <WebsiteIssueSummary report={data.issueReport} />}
      {view==='pages' && <section className="os-section-body"><h3>Pages included in this audit</h3><p>Open a page for its measurements or the reason it could not be checked.</p>{data.pages.map(page=><details key={page.id} className="os-page-result"><summary><span className="break-words">{page.final_url ?? page.url}</span> <StatusBadge status={page.status} /></summary>{page.reason && <p>This page was not fully analyzed. The technical reason is available below.</p>}<details><summary>Technical details</summary>{page.reason && <p>{page.reason}</p>}<WebsiteObservationDetails metadata={page.metadata} /></details></details>)}</section>}
      {view==='technical' && <section className="os-section-body"><h3>Evidence and processing details</h3><p>These are the retained measurements behind this audit. They are not AI-generated findings.</p><p>Maximum pages to check: {data.page_limit}. Summary retry code: {data.last_finalize_error_code ?? 'None'}.</p><WebsiteObservationDetails metadata={data.summary} /><details><summary>Raw saved summary</summary><pre className="os-raw-data">{JSON.stringify(data.summary,null,2)}</pre></details></section>}
    </div>}
  </section>
}
