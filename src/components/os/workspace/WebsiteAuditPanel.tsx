'use client'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { submitWebsiteAudit } from '@/actions/signal/submitWebsiteAudit'
import { getWebsiteAuditStatus } from '@/actions/signal/getWebsiteAuditStatus'
import { useWorkspace } from './WorkspaceProvider'
import { WebsiteIssueSummary } from './WebsiteIssueSummary'

type Result = Awaited<ReturnType<typeof getWebsiteAuditStatus>>
export default function WebsiteAuditPanel() {
  const { workspace } = useWorkspace()
  const [url, setUrl] = useState(workspace?.website_url ?? '')
  const [pageLimit, setPageLimit] = useState(5)
  const [selected, setSelected] = useState<string>()
  const [result, setResult] = useState<Result>()
  const [error, setError] = useState('')
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
        if (!cancelled) setResult(next)
      } catch { if (!cancelled) setError('Audit status could not be refreshed.') }
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
  const data = result?.success ? result.data : null
  const counts = (data?.pages ?? []).reduce<Record<string, number>>((all, page) => { all[page.status] = (all[page.status] ?? 0) + 1; return all }, {})
  const findings = data?.summary?.findings as Record<string, number> | undefined
  return <section className="border border-[var(--border)] p-6 font-mono text-xs space-y-4">
    <h2 className="text-lg">Full Website Audit</h2>
    <p>Measures returned HTML through same-origin navigation. No browser rendering or sitemap crawl. A page limit is an admission budget, including blocked and failed targets.</p>
    <form onSubmit={submit} className="flex flex-wrap gap-3">
      <label>Website URL <input aria-label="Full audit website URL" type="url" required maxLength={2048} value={url} onChange={e => setUrl(e.target.value)} className="border p-2 bg-transparent" /></label>
      <label>Maximum pages <select aria-label="Audit page limit" value={pageLimit} onChange={e => setPageLimit(Number(e.target.value))} className="border p-2 bg-[var(--background)]">
        {[5, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
      </select></label>
      <button disabled={saving} className="border p-2 disabled:opacity-50">{saving ? 'Queuing…' : 'Start audit'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {result && !result.success && <p role="alert">{result.error}</p>}
    {result?.success && result.history.length > 0 && <label>Audit history <select aria-label="Audit history" value={selected ?? result.history[0].id} onChange={e => { setSelected(e.target.value); setResult(undefined) }} className="border p-2 bg-[var(--background)]">
      {result.history.map(a => <option key={a.id} value={a.id}>{a.start_url} · {a.status} · {new Date(a.created_at).toLocaleString()}</option>)}
    </select></label>}
    {data && <div aria-live="polite" className="space-y-3">
      <p>Results for {data.start_url} — {data.status}. Admission limit: {data.page_limit}.</p>
      <p>{counts.completed ?? 0} analyzed · {counts.failed ?? 0} failed · {counts.skipped ?? 0} excluded · {counts.queued ?? 0} queued · {counts.processing ?? 0} processing</p>
      <p>{data.pages.length} unique candidate URLs retained. Undiscovered pages: unknown. Coverage remains partial.{data.discovery_truncated ? ' Discovery was truncated.' : ''}</p>
      {data.last_finalize_error_code && <p>Summary persistence is awaiting retry; the audit is not complete.</p>}
      {findings && <p>Across {findings.denominator_completed_pages} retained pages: {findings.missing_titles} missing titles ({findings.measured_titles} measured), {findings.missing_descriptions} missing descriptions ({findings.measured_descriptions} measured).</p>}
      <WebsiteIssueSummary report={data.issueReport} />
      <div className="max-h-96 overflow-auto">{data.pages.map(page => <details key={page.id} className="border-t py-2">
        <summary>{page.final_url ?? page.url} — {page.status}{!page.admitted ? ' (outside admission budget)' : ''}</summary>
        {page.reason && <p>{page.reason}</p>}
        {Array.isArray(page.metadata?.evidence) && <ul>{(page.metadata.evidence as { id: string; label: string; value: unknown }[]).map(e => <li key={e.id}>{e.label}: {String(e.value)}</li>)}</ul>}
      </details>)}</div>
    </div>}
  </section>
}
