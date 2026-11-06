'use server'
import { createClient } from '@/lib/supabase/server'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { auditCreationEnabled, sharedCrawlEnabled } from '@/lib/os/signal/audit/contracts'
import { buildWebsiteIssueReport } from '@/lib/os/signal/websiteIssues'

export async function getWebsiteAuditCapabilities() {
  return { enabled: auditCreationEnabled() && sharedCrawlEnabled() }
}

export async function getWebsiteAuditStatus(workspaceId: string, auditId?: string) {
  if (!auditCreationEnabled() || !sharedCrawlEnabled()) return { success: false as const, error: 'Website audits are disabled.' }
  const active = await getActiveWorkspace()
  if (!active.success || active.data.id !== workspaceId) return { success: false as const, error: 'Workspace unavailable.' }
  const client = await createClient()
  const { data: history, error: historyError } = await client.from('website_audits')
    .select('id,start_url,status,page_limit,created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(20)
  if (historyError) return { success: false as const, error: 'Audit history unavailable.' }
  const id = auditId ?? history?.[0]?.id
  if (!id) return { success: true as const, data: null, history: history ?? [] }
  const { data: audit, error } = await client.from('website_audits').select('id,start_url,status,page_limit,summary_observation_id,discovery_truncated,last_finalize_error_code')
    .eq('id', id).eq('workspace_id', workspaceId).maybeSingle()
  if (error || !audit) return { success: false as const, error: 'Audit unavailable.' }
  const { data: pages, error: pageError } = await client.from('website_audit_pages')
    .select('id,url,final_url,status,admitted,reason,observation_id,discovered_from').eq('audit_id', id).eq('workspace_id', workspaceId).order('url').limit(1000)
  if (pageError) return { success: false as const, error: 'Audit page results unavailable.' }
  const ids = (pages ?? []).flatMap(p => p.observation_id ? [p.observation_id as string] : [])
  if (audit.summary_observation_id) ids.push(audit.summary_observation_id)
  const { data: observations, error: evidenceError } = ids.length
    ? await client.from('signal_observations').select('id,metadata').in('id', ids)
    : { data: [], error: null }
  if (evidenceError) return { success: false as const, error: 'Retained audit evidence unavailable.' }
  const metadata = new Map((observations ?? []).map(o => [o.id, o.metadata as Record<string, unknown>]))
  const retainedPages = (pages ?? []).map(p => ({ ...p, metadata: metadata.get(p.observation_id) ?? null }))
  const summary = metadata.get(audit.summary_observation_id) ?? null
  return { success: true as const, history: history ?? [], data: {
    ...audit, pages: retainedPages, summary,
    issueReport: buildWebsiteIssueReport(retainedPages, summary),
  } }
}
