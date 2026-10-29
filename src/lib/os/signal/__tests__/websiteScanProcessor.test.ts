jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/serviceRole', () => ({ createServiceRoleClient: jest.fn() }))
jest.mock('../websiteFetch', () => ({ fetchWebsiteHtml: jest.fn(), WebsiteScanError: class extends Error {} }))
jest.mock('../websiteRecommendations', () => ({ recommendWebsiteImprovements: jest.fn() }))

import { processWebsiteScan } from '../websiteScanProcessor'
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'
import { fetchWebsiteHtml } from '../websiteFetch'
import { recommendWebsiteImprovements } from '../websiteRecommendations'

const scanId = '629126b4-1bc9-4d5f-a100-d170fe534c5b'

function harness(options: { insertError?: boolean; missingReturnedRow?: boolean; wrongSource?: boolean; missingSource?: boolean; completionError?: boolean; status?: string } = {}) {
  const events: string[] = []
  let inserted: Record<string, unknown> = {}
  const from = jest.fn((table: string) => {
    let values: Record<string, unknown> | undefined
    let operation = 'read'
    const query = {
      select: jest.fn(() => query), eq: jest.fn(() => query),
      insert: jest.fn((row: Record<string, unknown>) => { operation = 'insert'; inserted = row; events.push('observation_insert'); return query }),
      update: jest.fn((row: Record<string, unknown>) => { operation = 'update'; values = row; events.push(String(row.status)); return query }),
      single: jest.fn(async () => ({ data: options.missingReturnedRow ? null : { ...inserted, id: 'observation-id', ...(options.wrongSource ? { source_id: 'other-tenant-source' } : {}) }, error: options.insertError ? { code: '42501', message: 'Denied' } : null })),
      maybeSingle: jest.fn(async () => {
        if (table === 'website_scans' && operation === 'read') return { data: { id: scanId, public_id: 'scan_public', website_id: 'website-id', status: options.status ?? 'queued' }, error: null }
        if (table === 'website_scans') return { data: options.completionError && values?.status === 'completed' ? null : { id: scanId }, error: null }
        if (table === 'websites') return { data: { id: 'website-id', workspace_id: 'workspace-id', entry_url: 'https://arbitrary.example.org/', normalized_domain: 'arbitrary.example.org' }, error: null }
        if (table === 'signal_feed_sources') return { data: options.missingSource ? null : { id: 'source-id', workspace_id: 'workspace-id', source_type: 'website', source_key: 'website:arbitrary.example.org' }, error: null }
        throw new Error('Unexpected table')
      }),
    }
    return query
  })
  jest.mocked(createServiceRoleClient).mockReturnValue({ from } as never)
  return { events, from, inserted: () => inserted }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.mocked(fetchWebsiteHtml).mockResolvedValue({ body: Buffer.from('<html><head><title>Real page</title></head><body><h1>Actual content</h1></body></html>'), finalUrl: new URL('https://arbitrary.example.org/'), statusCode: 200, contentType: 'text/html', headers: {} })
  jest.mocked(recommendWebsiteImprovements).mockResolvedValue({ status: 'unavailable', recommendations: [], reason: 'Not configured' })
})
afterEach(() => jest.restoreAllMocks())

it('persists measured evidence and verified source/scan IDs before completing', async () => {
  const h = harness()
  expect((await processWebsiteScan(scanId)).status).toBe('completed')
  expect(h.events).toEqual(['processing', 'observation_insert', 'completed'])
  expect(h.inserted()).toMatchObject({ source_id: 'source-id', website_scan_id: scanId, source_event_id: 'website_scan:scan_public', title: 'Real page', metadata: { version: 2, coverage: 'partial', ai: { status: 'unavailable' }, evidence: expect.arrayContaining([expect.objectContaining({ id: 'h1', value: 1 })]) } })
})
it.each([{ insertError: true }, { missingReturnedRow: true }, { wrongSource: true }])('never completes unverified persistence: %j', async options => {
  const h = harness(options)
  expect((await processWebsiteScan(scanId)).status).toBe('failed')
  expect(h.events).not.toContain('completed')
  expect(h.events.at(-1)).toBe('failed')
})
it('does not fetch or persist when the correct workspace source is missing', async () => {
  const h = harness({ missingSource: true })
  expect((await processWebsiteScan(scanId)).status).toBe('failed')
  expect(fetchWebsiteHtml).not.toHaveBeenCalled()
  expect(h.events).not.toContain('observation_insert')
})
it('records blocked fetching as failed, without fabricating observations', async () => {
  const h = harness()
  jest.mocked(fetchWebsiteHtml).mockRejectedValue(new Error('Blocked'))
  expect((await processWebsiteScan(scanId)).status).toBe('failed')
  expect(h.events).toEqual(['processing', 'failed'])
})
it('retains evidence if the separate completion update fails and reports failure', async () => {
  const h = harness({ completionError: true })
  expect((await processWebsiteScan(scanId)).status).toBe('failed')
  expect(h.inserted().source_id).toBe('source-id')
  expect(h.events.at(-1)).toBe('failed')
})
it('does not pretend to repair historical completed scans by rerunning them', async () => {
  const h = harness({ status: 'completed' })
  expect(await processWebsiteScan(scanId)).toEqual({ status: 'skipped', reason: 'not_queued' })
  expect(h.events).toEqual([])
})
