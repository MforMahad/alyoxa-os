'use server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { auditCreationEnabled, sharedCrawlEnabled } from '@/lib/os/signal/audit/contracts'
import { canonicalizeWebsiteUrl } from '@/lib/os/signal/websiteScanUrl'
import { logWebsiteSubmissionFailure } from '@/lib/os/signal/websiteSubmissionDiagnostics'

export async function submitWebsiteAudit(input: { workspaceId: string; websiteUrl: string; idempotencyKey: string; pageLimit?: number }) {
  if (!auditCreationEnabled() || !sharedCrawlEnabled()) return { success: false as const, error: 'Website audits are not enabled.' }
  const pageLimit = input.pageLimit ?? 5
  if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100) return { success: false as const, error: 'Choose a page limit from 1 to 100.' }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuid.test(input.workspaceId) || !uuid.test(input.idempotencyKey)) return { success: false as const, error: 'Invalid audit request.' }
  const requestId = randomUUID()
  try {
    const url = canonicalizeWebsiteUrl(input.websiteUrl).canonicalUrl
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return { success: false as const, error: 'Authentication required.' }
    const { data, error } = await client.rpc('create_website_audit', { p_workspace_id: input.workspaceId, p_start_url: url, p_idempotency_key: input.idempotencyKey, p_page_limit: pageLimit })
    if (error) { logWebsiteSubmissionFailure({ operation: 'create_website_audit', requestId, workspaceId: input.workspaceId, authenticatedUserId: user.id }, error); return { success: false as const, error: `Audit could not be created. Reference: ${requestId}` } }
    if (!data?.audit_id) return { success: false as const, error: `Audit creation could not be confirmed. Reference: ${requestId}` }
    return { success: true as const, data }
  } catch (error) {
    logWebsiteSubmissionFailure({ operation: 'create_website_audit', requestId, workspaceId: input.workspaceId }, error)
    return { success: false as const, error: `Audit creation could not be confirmed. Reference: ${requestId}` }
  }
}
