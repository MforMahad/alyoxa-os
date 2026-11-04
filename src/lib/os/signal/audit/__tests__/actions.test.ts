jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/actions/workspaces/getActiveWorkspace', () => ({ getActiveWorkspace: jest.fn() }))
import { createClient } from '@/lib/supabase/server'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { submitWebsiteAudit } from '@/actions/signal/submitWebsiteAudit'
import { getWebsiteAuditCapabilities, getWebsiteAuditStatus } from '@/actions/signal/getWebsiteAuditStatus'
const input = { workspaceId: '30000000-0000-4000-8000-000000000001', websiteUrl: 'https://dynamic.example.org/', idempotencyKey: '40000000-0000-4000-8000-000000000001' }
const original = { creation: process.env.ALYOXA_AUDIT_CREATION_ENABLED, shared: process.env.ALYOXA_SHARED_CRAWL_ENABLED }
beforeEach(() => { jest.clearAllMocks(); process.env.ALYOXA_AUDIT_CREATION_ENABLED = 'true'; process.env.ALYOXA_SHARED_CRAWL_ENABLED = 'true' })
afterAll(() => {
  for (const [key, value] of Object.entries({ ALYOXA_AUDIT_CREATION_ENABLED: original.creation, ALYOXA_SHARED_CRAWL_ENABLED: original.shared })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value
  }
})
it('requires explicit shared coordination before revealing Full Audit', async () => {
  delete process.env.ALYOXA_SHARED_CRAWL_ENABLED
  expect(await getWebsiteAuditCapabilities()).toEqual({ enabled: false })
  expect((await submitWebsiteAudit(input)).success).toBe(false)
  expect(createClient).not.toHaveBeenCalled()
})
it.each([0, 101, 2.5])('rejects invalid limit %s before RPC access', async pageLimit => {
  expect((await submitWebsiteAudit({ ...input, pageLimit })).success).toBe(false)
  expect(createClient).not.toHaveBeenCalled()
})
it('passes dynamic URL and maximum pages to the owner-authorized RPC', async () => {
  const rpc = jest.fn().mockResolvedValue({ data: { audit_id: 'audit', status: 'queued' }, error: null })
  jest.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'user' } }, error: null }) }, rpc } as never)
  expect((await submitWebsiteAudit({ ...input, pageLimit: 100 })).success).toBe(true)
  expect(rpc).toHaveBeenCalledWith('create_website_audit', { p_workspace_id: input.workspaceId, p_start_url: input.websiteUrl, p_idempotency_key: input.idempotencyKey, p_page_limit: 100 })
})
it('rejects a different active workspace before reading audit data', async () => {
  jest.mocked(getActiveWorkspace).mockResolvedValue({ success: true, data: { id: 'other-workspace' } } as never)
  expect((await getWebsiteAuditStatus(input.workspaceId)).success).toBe(false)
  expect(createClient).not.toHaveBeenCalled()
})

it('derives issues only from the selected authorized audit and preserves raw evidence and history', async () => {
  jest.mocked(getActiveWorkspace).mockResolvedValue({ success: true, data: { id: input.workspaceId } } as never)
  const raw = { evidence: [{ id: 'title', value: '' }], ai: { status: 'unavailable' } }
  const queries: { table: string; eq: jest.Mock }[] = []
  const responses = [
    { data: [{ id: 'selected', start_url: input.websiteUrl }] },
    { data: { id: 'selected', summary_observation_id: 'summary' } },
    { data: [{ id: 'page', url: input.websiteUrl, status: 'completed', observation_id: 'obs' }] },
    { data: [{ id: 'obs', metadata: raw }, { id: 'summary', metadata: { findings: { missing_titles: 1 } } }] },
  ]
  const from = jest.fn((table: string) => {
    const response = responses.shift()
    const query = { select: jest.fn(), eq: jest.fn(), order: jest.fn(), limit: jest.fn(), maybeSingle: jest.fn(), in: jest.fn(),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve) }
    for (const key of ['select', 'eq', 'order', 'limit', 'maybeSingle', 'in'] as const) query[key].mockReturnValue(query)
    queries.push({ table, eq: query.eq })
    return query
  })
  jest.mocked(createClient).mockResolvedValue({ from } as never)
  const result = await getWebsiteAuditStatus(input.workspaceId, 'selected')
  expect(result.success).toBe(true)
  if (!result.success || !result.data) throw new Error('Expected authorized audit result')
  expect(result.data.issueReport.groups[0].affectedUrls).toEqual([input.websiteUrl])
  expect(result.data.pages[0].metadata).toEqual(raw)
  expect(result.history[0].id).toBe('selected')
  expect(queries[1].eq).toHaveBeenCalledWith('id', 'selected')
  expect(queries[1].eq).toHaveBeenCalledWith('workspace_id', input.workspaceId)
  expect(queries[2].eq).toHaveBeenCalledWith('audit_id', 'selected')
  expect(queries[2].eq).toHaveBeenCalledWith('workspace_id', input.workspaceId)
})
