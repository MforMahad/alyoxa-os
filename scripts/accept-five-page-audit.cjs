/* eslint-disable @typescript-eslint/no-require-imports -- Explicit Node acceptance CLI, never imported by the app. */
// NOT run automatically. This writes only to an operator-reviewed LOOPBACK Supabase project.
const { createClient } = require('@supabase/supabase-js')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert/strict')

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing acceptance setting: ${name}`)
  return value
}
function loopback(value) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password) throw new Error('Acceptance app and database URLs must be loopback addresses without embedded credentials.')
  return url.origin
}
async function main() {
  const dbUrl = loopback(required('AUDIT_ACCEPTANCE_SUPABASE_URL'))
  const appUrl = loopback(required('AUDIT_ACCEPTANCE_APP_URL'))
  const fixture = new URL(required('AUDIT_ACCEPTANCE_FIXTURE_ORIGIN'))
  if (fixture.protocol !== 'https:' || fixture.pathname !== '/' || fixture.search || fixture.hash || fixture.username || fixture.password) throw new Error('Use a dedicated public HTTPS fixture origin.')
  const client = createClient(dbUrl, required('AUDIT_ACCEPTANCE_PUBLIC_KEY'), {
    global: { headers: { authorization: `Bearer ${required('AUDIT_ACCEPTANCE_ACCESS_TOKEN')}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data: created, error } = await client.rpc('create_website_audit', {
    p_workspace_id: required('AUDIT_ACCEPTANCE_WORKSPACE_ID'), p_start_url: fixture.origin + '/', p_idempotency_key: randomUUID(),
  })
  if (error || !created?.audit_id) throw new Error(`Local audit creation failed (${error?.code ?? 'invalid_result'}).`)
  const auditId = created.audit_id
  for (let tick = 0; tick < 40; tick++) {
    const response = await fetch(new URL('/api/internal/website-audits/process-batch', appUrl), {
      method: 'POST', headers: { authorization: `Bearer ${required('WEBSITE_SCAN_TRIGGER_SECRET')}`, 'x-alyoxa-audit-project': dbUrl }, signal: AbortSignal.timeout(25000),
    })
    if (!response.ok) throw new Error(`Local audit endpoint returned HTTP ${response.status}.`)
    const { data: progress, error: readError } = await client.from('website_audit_progress').select('*').eq('id', auditId).single()
    if (readError) throw new Error(`Local progress read failed (${readError.code}).`)
    console.info(JSON.stringify({ auditId, status: progress.status, completed: progress.completed, queued: progress.queued }))
    if (['completed', 'partial', 'failed'].includes(progress.status)) {
      assert.equal(progress.status, 'completed')
      assert.equal(Number(progress.completed), 5)
      assert.equal(Number(progress.admitted), 5)
      assert.equal(Number(progress.failed), 0)
      const { data: pages, error: pagesError } = await client.from('website_audit_pages').select('url,observation_id').eq('audit_id', auditId).eq('status', 'completed')
      if (pagesError) throw new Error(`Local page read failed (${pagesError.code}).`)
      assert.deepEqual(pages.map(page => new URL(page.url).pathname).sort(), ['/', '/about.html', '/contact.html', '/policy.html', '/products.html'].sort())
      assert.equal(new Set(pages.map(page => page.observation_id)).size, 5)
      const { data: summary, error: summaryError } = await client.from('signal_observations').select('metadata').eq('id', progress.summary_observation_id).single()
      if (summaryError) throw new Error(`Local summary read failed (${summaryError.code}).`)
      assert.equal(summary.metadata.findings.missing_descriptions, 1)
      assert.equal(summary.metadata.findings.denominator_completed_pages, 5)
      console.info('Five-page audit acceptance passed; retained local evidence and summary verified.')
      return
    }
    await new Promise(resolve => setTimeout(resolve, 2500))
  }
  throw new Error('Acceptance stopped after 40 bounded invocations; inspect local progress and worker logs.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
