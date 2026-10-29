jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
import { createClient } from '@/lib/supabase/server'
import { submitWebsiteAnalysis } from '../submitWebsiteAnalysis'

const workspaceId = '096e91a7-6d5a-4fe4-a4c9-beb01e8452ef'
function client(options: { authenticated?: boolean; error?: unknown; data?: unknown; count?: number; rateError?: unknown } = {}) {
  const query = { select: jest.fn(() => query), eq: jest.fn(() => query), gte: jest.fn().mockResolvedValue({ count: options.count ?? 0, error: options.rateError ?? null }) }
  const result = {
    from: jest.fn(() => query),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: options.authenticated === false ? null : { id: 'user' } }, error: null }) },
    rpc: jest.fn().mockResolvedValue({ data: options.data ?? [{ source_id: 'source', source_public_id: 'src', website_id: 'website', website_public_id: 'web', scan_id: 'scan', scan_public_id: 'scan_pub', scan_status: 'queued', scan_reused: false }], error: options.error ?? null }),
  }
  jest.mocked(createClient).mockResolvedValue(result as never)
  return result
}
beforeEach(() => jest.clearAllMocks())
afterEach(() => jest.restoreAllMocks())
it.each(['https://DOCS.example.org/a?x=1#section', 'http://shop.example.net/catalog'])('passes dynamic normalized input through one atomic RPC: %s', async websiteUrl => {
  const db = client()
  const result = await submitWebsiteAnalysis({ workspaceId, websiteUrl })
  expect(result.success).toBe(true)
  expect(db.rpc).toHaveBeenCalledTimes(1)
  expect(db.rpc).toHaveBeenCalledWith('submit_website_analysis', { p_workspace_id: workspaceId, p_website_url: new URL(websiteUrl.split('#')[0]).toString() })
})
it('does not call the RPC for unauthenticated users', async () => {
  const db = client({ authenticated: false })
  expect((await submitWebsiteAnalysis({ workspaceId, websiteUrl: 'https://public.example.org/' })).success).toBe(false)
  expect(db.rpc).not.toHaveBeenCalled()
})
it.each(['file:///etc/passwd', 'http://localhost/', 'https://name:password@public.example.org/'])('rejects unsafe input before any database call: %s', async websiteUrl => {
  client()
  expect((await submitWebsiteAnalysis({ workspaceId, websiteUrl })).success).toBe(false)
  expect(createClient).not.toHaveBeenCalled()
})
it('reports RPC failure without a separate URL update', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  const db = client({ error: { code: '42501', message: 'Denied' } })
  expect((await submitWebsiteAnalysis({ workspaceId, websiteUrl: 'https://public.example.org/' })).success).toBe(false)
  expect(db.rpc).toHaveBeenCalledTimes(1)
  jest.restoreAllMocks()
})
it('does not claim a successful scan from an empty RPC result', async () => {
  client({ data: [] })
  expect((await submitWebsiteAnalysis({ workspaceId, websiteUrl: 'https://public.example.org/' })).success).toBe(false)
})
it('throttles excessive workspace scans before calling the submission RPC', async () => {
  const db = client({ count: 5 })
  expect(await submitWebsiteAnalysis({ workspaceId, websiteUrl: 'https://public.example.org/' })).toMatchObject({ success: false, error: expect.stringContaining('limit') })
  expect(db.rpc).not.toHaveBeenCalled()
})
it('logs the actual RPC diagnostic once with authenticated identity and a safe matching reference', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  client({ error: {
    code: '42702', message: 'column reference "website_id" is ambiguous',
    details: 'It could refer to either a PL/pgSQL variable or a table column.', hint: 'Qualify the reference.',
    access_token: 'must-not-be-logged', refresh_token: 'must-not-be-logged',
  } })
  const result = await submitWebsiteAnalysis({ workspaceId, websiteUrl: 'https://public.example.org/' })
  expect(result.success).toBe(false)
  if (result.success) throw new Error('Expected failure')
  expect(result.requestId).toMatch(/^[0-9a-f-]{36}$/)
  expect(result.error).toContain(result.requestId)
  expect(result.error).not.toMatch(/42702|website_id|Qualify|PL\/pgSQL/)
  expect(log).toHaveBeenCalledTimes(1)
  expect(log).toHaveBeenCalledWith('[WebsiteSubmission] Submission failed.', {
    operation: 'submit_website_analysis', requestId: result.requestId, workspaceId, authenticatedUserId: 'user',
    code: '42702', message: 'column reference "website_id" is ambiguous',
    details: 'It could refer to either a PL/pgSQL variable or a table column.', hint: 'Qualify the reference.',
  })
  expect(JSON.stringify(log.mock.calls)).not.toContain('must-not-be-logged')
})
it('logs capacity failures separately, without incorrectly blaming the RPC', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const db = client({ rateError: { code: '42501', message: 'Denied' } })
  expect((await submitWebsiteAnalysis({ workspaceId, websiteUrl: 'https://public.example.org/' })).success).toBe(false)
  expect(db.rpc).not.toHaveBeenCalled()
  expect(log.mock.calls[0][1]).toMatchObject({ operation: 'website_scans.capacity', code: '42501' })
})
it('logs missing-session failures before the RPC, without logging auth objects', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const db = client({ authenticated: false })
  const result = await submitWebsiteAnalysis({ workspaceId, websiteUrl: 'https://public.example.org/' })
  expect(result.success).toBe(false)
  expect(db.rpc).not.toHaveBeenCalled()
  expect(log.mock.calls[0][1]).toMatchObject({ operation: 'auth.getUser' })
  expect(log.mock.calls[0][1]).not.toHaveProperty('authenticatedUserId')
})
it('rejects partial RPC responses rather than marking an unverified connection successful', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  client({ data: [{ source_id: 'source', website_id: 'website', scan_id: 'scan', scan_status: 'queued' }] })
  expect((await submitWebsiteAnalysis({ workspaceId, websiteUrl: 'https://public.example.org/' })).success).toBe(false)
  expect(log.mock.calls[0][1]).toMatchObject({ operation: 'submit_website_analysis.response', code: 'INVALID_RPC_RESULT' })
})
it('returns a safe failure and stage reference when transport throws', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const db = client()
  db.rpc.mockRejectedValueOnce(new Error('Network unavailable'))
  const result = await submitWebsiteAnalysis({ workspaceId, websiteUrl: 'https://public.example.org/' })
  expect(result.success).toBe(false)
  expect(log).toHaveBeenCalledTimes(1)
  expect(log.mock.calls[0][1]).toMatchObject({ operation: 'submit_website_analysis', message: 'Network unavailable' })
})
