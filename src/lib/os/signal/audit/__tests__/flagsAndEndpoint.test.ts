jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('../repository', () => ({ createAuditRepository: jest.fn() }))
jest.mock('../processor', () => ({ processAuditBatch: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/internal/website-audits/process-batch/route'
import { createAuditRepository } from '../repository'
import { submitWebsiteAudit } from '@/actions/signal/submitWebsiteAudit'
import { createClient } from '@/lib/supabase/server'

const previous = { shared: process.env.ALYOXA_SHARED_CRAWL_ENABLED, worker: process.env.ALYOXA_AUDIT_WORKER_ENABLED, creation: process.env.ALYOXA_AUDIT_CREATION_ENABLED, secret: process.env.WEBSITE_SCAN_TRIGGER_SECRET }
beforeEach(() => { jest.clearAllMocks(); delete process.env.ALYOXA_SHARED_CRAWL_ENABLED; delete process.env.ALYOXA_AUDIT_WORKER_ENABLED; delete process.env.ALYOXA_AUDIT_CREATION_ENABLED })
afterEach(() => {
  for (const [key, value] of Object.entries({ ALYOXA_SHARED_CRAWL_ENABLED: previous.shared, ALYOXA_AUDIT_WORKER_ENABLED: previous.worker, ALYOXA_AUDIT_CREATION_ENABLED: previous.creation, WEBSITE_SCAN_TRIGGER_SECRET: previous.secret })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value
  }
})
it('does not initialize database clients with feature flags absent', async () => {
  const result = await submitWebsiteAudit({ workspaceId: 'unused', websiteUrl: 'unused', idempotencyKey: 'unused' })
  expect(result.success).toBe(false)
  expect(createClient).not.toHaveBeenCalled()
  expect((await POST(new NextRequest('https://app.example.org/api/internal/website-audits/process-batch', { method: 'POST' }))).status).toBe(503)
  expect(createAuditRepository).not.toHaveBeenCalled()
})
it('rejects missing or non-Bearer credentials before acquiring jobs', async () => {
  process.env.ALYOXA_SHARED_CRAWL_ENABLED = 'true'
  process.env.ALYOXA_AUDIT_WORKER_ENABLED = 'true'; process.env.WEBSITE_SCAN_TRIGGER_SECRET = 'test-only'
  for (const authorization of ['', 'test-only', 'Bearer wrong']) expect((await POST(new NextRequest('https://app.example.org/api/internal/website-audits/process-batch', { method: 'POST', headers: { authorization } }))).status).toBe(401)
  expect(createAuditRepository).not.toHaveBeenCalled()
})
it('refuses an acceptance harness project mismatch before privileged database work', async () => {
  process.env.ALYOXA_SHARED_CRAWL_ENABLED = 'true'
  process.env.ALYOXA_AUDIT_WORKER_ENABLED = 'true'; process.env.WEBSITE_SCAN_TRIGGER_SECRET = 'test-only'
  const response = await POST(new NextRequest('http://127.0.0.1/api/internal/website-audits/process-batch', {
    method: 'POST', headers: { authorization: 'Bearer test-only', 'x-alyoxa-audit-project': 'http://127.0.0.1:1' },
  }))
  expect(response.status).toBe(409)
  expect(createAuditRepository).not.toHaveBeenCalled()
})
