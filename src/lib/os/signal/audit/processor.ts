import type { AuditClaim, AuditOutcome, AuditRepository } from './contracts'
import { fetchAuditPage } from './transport'

/** No fire-and-forget work; lease recovery handles interruption. No per-page LLM calls. */
export async function processAuditBatch(repository: AuditRepository, options: {
  fetchPage?: (claim: AuditClaim) => Promise<AuditOutcome>; now?: () => number; maxItems?: number
} = {}) {
  const now = options.now ?? Date.now
  const deadline = now() + 20000
  const configured = options.maxItems ?? Number(process.env.ALYOXA_AUDIT_BATCH_SIZE ?? 2)
  const maxItems = Number.isFinite(configured) ? Math.max(1, Math.min(2, Math.floor(configured))) : 2
  let processed = 0
  for (let item = 0; item < maxItems && now() + 15000 < deadline; item++) {
    const claim = await repository.claim()
    if (!claim) break
    const outcome = await (options.fetchPage ?? fetchAuditPage)(claim)
    // Persistence failures propagate; never turn an uncertain commit into a second write.
    await repository.finish(claim, outcome)
    processed++
  }
  const finalized = await repository.finalize()
  return { processed, finalized }
}
