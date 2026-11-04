import type { Config } from '@netlify/functions'
import { auditWorkerEnabled } from '../../src/lib/os/signal/audit/contracts'

export default async function dispatchWebsiteAudits() {
  if (!auditWorkerEnabled()) return
  const appUrl = process.env.ALYOXA_SCAN_APP_URL || process.env.URL
  const secret = process.env.WEBSITE_SCAN_TRIGGER_SECRET
  if (!appUrl || !secret) throw new Error('Audit dispatch is not configured.')
  const response = await fetch(new URL('/api/internal/website-audits/process-batch', appUrl), {
    method: 'POST', headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) console.error('[WebsiteAuditDispatcher] Batch endpoint unavailable.', { status: response.status })
}
export const config: Config = { schedule: '* * * * *' }
