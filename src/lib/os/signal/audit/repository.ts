import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'
import type { AuditClaim, AuditRepository } from './contracts'
import { diagnosticText } from '../websiteSubmissionDiagnostics'

export function createAuditRepository(): AuditRepository {
  const client = createServiceRoleClient()
  async function rpc(name: string, parameters: Record<string, unknown> = {}) {
    const { data, error } = await client.rpc(name, parameters).abortSignal(AbortSignal.timeout(2000))
    if (error) {
      console.error('[WebsiteAudit] Database operation failed.', { operation: name, pageId: parameters.p_page_id ?? null,
        code: diagnosticText(error.code), message: diagnosticText(error.message), details: diagnosticText(error.details), hint: diagnosticText(error.hint) })
      throw new Error('Audit database operation failed; inspect the server diagnostic.')
    }
    if (name === 'finalize_website_audit' && data?.status === 'finalization_retry') {
      console.error('[WebsiteAudit] Summary persistence deferred.', {
        operation: name, auditId: data.audit_id, code: diagnosticText(data.code),
      })
    }
    return data
  }
  return {
    claim: async () => await rpc('claim_website_audit_page') as AuditClaim | null,
    finish: async (claim, outcome) => { await rpc('finish_website_audit_page', { p_page_id: claim.page_id, p_lease_token: claim.lease_token, p_result: outcome }) },
    finalize: () => rpc('finalize_website_audit'),
  }
}
