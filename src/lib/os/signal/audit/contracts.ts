export interface AuditClaim {
  audit_id: string
  page_id: string
  lease_token: string
  url: string
  origin: string
  depth: number
  redirect_count: number
  robots_body: string | null
  robots_url?: string | null
}
export interface AuditLink { url: string; priority: number }
export type AuditOutcome = (
  | { kind: 'policy'; robots_body: string; delay_ms: number }
  | { kind: 'redirect'; url: string }
  | { kind: 'policy_redirect'; url: string }
  | { kind: 'retry' | 'failed' | 'skipped'; reason: string; delay_ms?: number }
  | { kind: 'completed'; url: string; title: string; description: string; metadata: Record<string, unknown>; links: AuditLink[]; discovery_truncated: boolean }
) & { not_before?: string; host_blocked?: boolean }

export interface AuditRepository {
  claim(): Promise<AuditClaim | null>
  finish(claim: AuditClaim, outcome: AuditOutcome): Promise<void>
  finalize(): Promise<unknown>
}
export const auditCreationEnabled = () => process.env.ALYOXA_AUDIT_CREATION_ENABLED === 'true'
export const sharedCrawlEnabled = () => process.env.ALYOXA_SHARED_CRAWL_ENABLED === 'true'
export const auditWorkerEnabled = () => sharedCrawlEnabled() && process.env.ALYOXA_AUDIT_WORKER_ENABLED === 'true'
