'use server'

import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { canonicalizeWebsiteUrl } from '@/lib/os/signal/websiteScanUrl'
import { logWebsiteSubmissionFailure } from '@/lib/os/signal/websiteSubmissionDiagnostics'
import type { ConnectedWebsiteSource } from './connectWebsiteSource'

type Result = { success: true; data: ConnectedWebsiteSource; websiteUrl: string }
  | { success: false; error: string; requestId?: string }

/** One database transaction owns URL update, source connection and queue/reuse. */
export async function submitWebsiteAnalysis(input: { workspaceId: string; websiteUrl: string }): Promise<Result> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.workspaceId)) return { success: false, error: 'Invalid workspace identifier.' }
  let websiteUrl: string
  try { websiteUrl = canonicalizeWebsiteUrl(input.websiteUrl).canonicalUrl }
  catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Invalid website URL.' } }
  const requestId = randomUUID()
  let authenticatedUserId: string | undefined
  let operation = 'supabase.createClient'
  try {
    const supabase = await createClient()
    operation = 'auth.getUser'
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logWebsiteSubmissionFailure({ operation, requestId, workspaceId: input.workspaceId }, authError ?? { message: 'No authenticated user returned.' })
      return { success: false, error: `Authentication required. Please sign in again. Reference: ${requestId}`, requestId }
    }
    authenticatedUserId = user.id
    operation = 'website_scans.capacity'
    // Best-effort tenant throttle; the database active-scan index remains the concurrency barrier.
    const { count, error: rateError } = await supabase.from('website_scans')
      .select('id, website:websites!inner(workspace_id)', { count: 'exact', head: true })
      .eq('website.workspace_id', input.workspaceId)
      .gte('created_at', new Date(Date.now() - 60000).toISOString())
    if (rateError) {
      logWebsiteSubmissionFailure({ operation, requestId, workspaceId: input.workspaceId, authenticatedUserId }, rateError)
      return { success: false, error: `Scan capacity could not be checked. Please retry later. Reference: ${requestId}`, requestId }
    }
    if (count !== null && count >= 5) return { success: false, error: 'Workspace scan limit reached. Wait one minute before submitting again.' }
    operation = 'submit_website_analysis'
    const { data, error } = await supabase.rpc('submit_website_analysis', {
      p_workspace_id: input.workspaceId, p_website_url: websiteUrl,
    })
    if (error) {
      logWebsiteSubmissionFailure({ operation, requestId, workspaceId: input.workspaceId, authenticatedUserId }, error)
      return { success: false, error: `Analysis could not be queued. Please retry. If the problem continues, share this reference with support: ${requestId}`, requestId }
    }
    const row = Array.isArray(data) ? data[0] : data
    const identifiers = ['source_id', 'source_public_id', 'website_id', 'website_public_id', 'scan_id', 'scan_public_id']
    if (!identifiers.every(field => typeof row?.[field] === 'string' && row[field].length > 0) || !['queued', 'processing'].includes(row.scan_status)) {
      logWebsiteSubmissionFailure({ operation: 'submit_website_analysis.response', requestId, workspaceId: input.workspaceId, authenticatedUserId }, { code: 'INVALID_RPC_RESULT', message: 'RPC did not return the required active scan identifiers and status.' })
      return { success: false, error: `Submission state could not be confirmed. Refresh before retrying. Reference: ${requestId}`, requestId }
    }
    return { success: true, websiteUrl, data: {
      source: { id: row.source_id, public_id: row.source_public_id },
      website: { id: row.website_id, public_id: row.website_public_id },
      scan: { id: row.scan_id, public_id: row.scan_public_id, status: row.scan_status, reused: row.scan_reused === true },
    } }
  } catch (error) {
    logWebsiteSubmissionFailure({ operation, requestId, workspaceId: input.workspaceId, authenticatedUserId }, error)
    return { success: false, error: `Analysis submission could not be confirmed. Please retry later. Reference: ${requestId}`, requestId }
  }
}
