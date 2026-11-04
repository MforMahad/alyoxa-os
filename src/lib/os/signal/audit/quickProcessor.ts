import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'
import { fetchAuditPage } from './transport'
import type { AuditClaim } from './contracts'
import type { ProcessWebsiteScanResult } from '../websiteScanProcessor'
import type { WebsiteEvidence } from '../websiteIntelligence'
import { recommendWebsiteImprovements } from '../websiteRecommendations'
import { diagnosticText } from '../websiteSubmissionDiagnostics'

/** One durable network step; homepage-only results, shared host fencing. */
export async function processCoordinatedQuickScan(scanId: string): Promise<ProcessWebsiteScanResult> {
  const client = createServiceRoleClient()
  async function rpc(operation: string, parameters: Record<string, unknown>) {
    const { data, error } = await client.rpc(operation, parameters).abortSignal(AbortSignal.timeout(2000))
    if (error) {
      console.error('[QuickScan] Coordinated operation failed.', { operation, scanId,
        code: diagnosticText(error.code), message: diagnosticText(error.message), details: diagnosticText(error.details), hint: diagnosticText(error.hint) })
      throw new Error('Coordinated website operation could not be confirmed.')
    }
    return data
  }
  const claim = await rpc('claim_website_quick_scan', { p_scan_id: scanId }) as AuditClaim | null
  if (!claim) return { status: 'deferred', scanId }
  const outcome = await fetchAuditPage(claim, { quick: true })
  if (outcome.kind === 'completed') {
    const ai = await recommendWebsiteImprovements(outcome.metadata.evidence as WebsiteEvidence[], outcome.metadata.limitations as string[], outcome.metadata.excluded_from_ai === true)
    outcome.metadata = { ...outcome.metadata, version: 2, scope: 'website_origin', ai }
    // Quick Scan never discovers pages or claims site-wide coverage.
    outcome.links = []
  }
  const result = await rpc('finish_website_quick_scan', { p_scan_id: scanId, p_lease_token: claim.lease_token, p_result: outcome })
  if (!result || !['completed', 'failed', 'deferred'].includes(result.status)) throw new Error('Invalid coordinated scan result.')
  return result as ProcessWebsiteScanResult
}
