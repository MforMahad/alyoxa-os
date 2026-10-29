'use server'

import { createClient } from '@/lib/supabase/server'
import { canonicalizeWebsiteUrl } from '@/lib/os/signal/websiteScanUrl'
import type { ConnectedWebsiteSource } from './connectWebsiteSource'

type Result = { success: true; data: ConnectedWebsiteSource; websiteUrl: string }
  | { success: false; error: string }

/** One database transaction owns URL update, source connection and queue/reuse. */
export async function submitWebsiteAnalysis(input: { workspaceId: string; websiteUrl: string }): Promise<Result> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.workspaceId)) return { success: false, error: 'Invalid workspace identifier.' }
  let websiteUrl: string
  try { websiteUrl = canonicalizeWebsiteUrl(input.websiteUrl).canonicalUrl }
  catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Invalid website URL.' } }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Authentication required.' }
  // Best-effort tenant throttle; the database active-scan index remains the concurrency barrier.
  const { count, error: rateError } = await supabase.from('website_scans')
    .select('id, website:websites!inner(workspace_id)', { count: 'exact', head: true })
    .eq('website.workspace_id', input.workspaceId)
    .gte('created_at', new Date(Date.now() - 60000).toISOString())
  if (rateError) return { success: false, error: 'Scan capacity could not be checked. Please retry later.' }
  if (count !== null && count >= 5) return { success: false, error: 'Workspace scan limit reached. Wait one minute before submitting again.' }
  const { data, error } = await supabase.rpc('submit_website_analysis', {
    p_workspace_id: input.workspaceId, p_website_url: websiteUrl,
  })
  if (error) {
    console.error('[WebsiteSubmission] Atomic submission failed.', { code: error.code, message: error.message })
    return { success: false, error: 'Analysis could not be queued. An owner or administrator must submit a supported public website URL. Check the database RPC configuration if this persists.' }
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.source_id || !row?.website_id || !row?.scan_id || !['queued', 'processing'].includes(row.scan_status)) {
    return { success: false, error: 'The database did not return a valid active scan. Submission state could not be confirmed; refresh before retrying.' }
  }
  return { success: true, websiteUrl, data: {
    source: { id: row.source_id, public_id: row.source_public_id },
    website: { id: row.website_id, public_id: row.website_public_id },
    scan: { id: row.scan_id, public_id: row.scan_public_id, status: row.scan_status, reused: row.scan_reused === true },
  } }
}
