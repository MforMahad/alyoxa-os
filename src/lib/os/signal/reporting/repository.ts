import type { SupabaseClient } from '@supabase/supabase-js'
import { buildReport, type ReportKind, type ReportObservation, type ReportPage } from './data'
export class ReportReadError extends Error { constructor(public code: 'NOT_FOUND' | 'READ_FAILED' | 'EVIDENCE_INCOMPLETE' | 'RUN_IN_PROGRESS') { super(code) } }
// The caller supplies only the signed-session client, never a service-role client.
function relatedString(value: unknown, key: 'entry_url') {
  const row = Array.isArray(value) ? value[0] : value
  return row && typeof row === 'object' && key in row && typeof row[key] === 'string' ? row[key] : null
}
export async function loadReport(client: SupabaseClient, workspaceId: string, kind: ReportKind, id: string) {
  async function observations(ids: string[]) {
    const rows: ReportObservation[] = []
    for (let offset = 0; offset < ids.length; offset += 100) {
      const { data, error } = await client.from('signal_observations').select('id,metadata,source:signal_feed_sources!inner(workspace_id)').in('id', ids.slice(offset, offset + 100)).eq('source.workspace_id', workspaceId)
      if (error) throw new ReportReadError('READ_FAILED')
      rows.push(...data)
    }
    if (rows.length !== new Set(ids).size) throw new ReportReadError('EVIDENCE_INCOMPLETE')
    return new Map(rows.map(o => [o.id, o.metadata]))
  }
  if (kind === 'scan') {
    const { data: scan, error } = await client.from('website_scans').select('id,status,error_message,created_at,website:websites!inner(workspace_id,entry_url)').eq('id', id).eq('website.workspace_id', workspaceId).maybeSingle()
    if (error) throw new ReportReadError('READ_FAILED')
    if (!scan) throw new ReportReadError('NOT_FOUND')
    // Page every retained observation for this exact historical scan.
    const rows: ReportObservation[] = []
    for (let offset = 0; ; offset += 100) {
      const { data, error: e } = await client.from('signal_observations').select('id,metadata,source:signal_feed_sources!inner(workspace_id)').eq('website_scan_id', id).eq('source.workspace_id', workspaceId).order('id').range(offset, offset + 99)
      if (e) throw new ReportReadError('READ_FAILED')
      rows.push(...data); if (data.length < 100) break
      if (offset >= 10000) throw new ReportReadError('EVIDENCE_INCOMPLETE')
    }
    if (rows.length > 1) throw new ReportReadError('EVIDENCE_INCOMPLETE') // ambiguous single-page history
    const m = rows[0]?.metadata as Record<string, unknown> | undefined
    if (scan.status === 'completed' && !m) throw new ReportReadError('EVIDENCE_INCOMPLETE')
    const entryUrl = relatedString(scan.website, 'entry_url') ?? 'URL unavailable'
    const reason = typeof scan.error_message === 'string'
      ? scan.error_message.match(/(?:^|:\s*)(http_[45]\d\d)$/i)?.[1]?.toLowerCase() ??
        scan.error_message.match(/^Website returned HTTP ([45]\d\d)\.$/i)?.[1]?.replace(/^/, 'http_')?.toLowerCase() ?? null
      : null
    const reportUrl = typeof m?.fetched_url === 'string' ? m.fetched_url : reason ? entryUrl : 'URL unavailable'
    return buildReport({ kind, id, status: scan.status, createdAt: scan.created_at, target: reportUrl, pageLimit: 1,
      pages: [{ id, url: reportUrl, status: m ? 'completed' : scan.status,
        ...(reason ? { reason } : {}), observation_id: rows[0]?.id, metadata: m ?? null }] })
  }
  const { data: audit, error } = await client.from('website_audits').select('id,status,created_at,start_url,page_limit,discovery_truncated,summary_observation_id').eq('id', id).eq('workspace_id', workspaceId).maybeSingle()
  if (error) throw new ReportReadError('READ_FAILED')
  if (!audit) throw new ReportReadError('NOT_FOUND')
  if (audit.status === 'completed' && !audit.summary_observation_id) throw new ReportReadError('EVIDENCE_INCOMPLETE')
  const pages: ReportPage[] = []
  for (let offset = 0; ; offset += 100) {
    const { data, error: e } = await client.from('website_audit_pages').select('id,url,final_url,status,admitted,reason,observation_id,discovered_from').eq('audit_id', id).eq('workspace_id', workspaceId).order('id').range(offset, offset + 99)
    if (e) throw new ReportReadError('READ_FAILED')
    pages.push(...data.map(p => ({ ...p, metadata: null }))); if (data.length < 100) break
    if (offset >= 10000) throw new ReportReadError('EVIDENCE_INCOMPLETE')
  }
  const ids = [...new Set(pages.flatMap(p => p.observation_id ? [p.observation_id] : []).concat(audit.summary_observation_id ? [audit.summary_observation_id] : []))]
  const saved = await observations(ids)
  return buildReport({ kind, id, status: audit.status, createdAt: audit.created_at, target: audit.start_url, pageLimit: audit.page_limit, truncated: audit.discovery_truncated,
    pages: pages.map(p => ({ ...p, metadata: saved.get(p.observation_id ?? '') ?? null })), summary: saved.get(audit.summary_observation_id ?? '') })
}
