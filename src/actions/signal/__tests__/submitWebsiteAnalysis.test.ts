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
