jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/serviceRole', () => ({ createServiceRoleClient: jest.fn() }))
jest.mock('../websiteFetch', () => ({ fetchWebsiteHtml: jest.fn(), WebsiteScanError: class extends Error {} }))
jest.mock('../audit/linkChecks', () => ({ checkQuickInternalLinks: jest.fn() }))
jest.mock('../websiteRecommendations', () => ({ recommendWebsiteImprovements: jest.fn() }))

import { processWebsiteScan } from '../websiteScanProcessor'
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'
import { fetchWebsiteHtml } from '../websiteFetch'
import { checkQuickInternalLinks } from '../audit/linkChecks'
import { recommendWebsiteImprovements } from '../websiteRecommendations'
import { buildWebsiteIssueReport } from '../websiteIssues'

const scanId = '629126b4-1bc9-4d5f-a100-d170fe534c5b'

function harness(options: { insertError?: boolean; persistenceError?: Record<string, unknown>; insertThrows?: Error; missingReturnedRow?: boolean; wrongSource?: boolean; missingSource?: boolean; completionError?: boolean; status?: string } = {}) {
  const events: string[] = []
  const observationSelects: string[] = []
  let inserted: Record<string, unknown> = {}
  const from = jest.fn((table: string) => {
    let values: Record<string, unknown> | undefined
    let operation = 'read'
    const query = {
      select: jest.fn((columns: string) => { if (table === 'signal_observations') observationSelects.push(columns); return query }), eq: jest.fn(() => query),
      insert: jest.fn((row: Record<string, unknown>) => { operation = 'insert'; inserted = row; events.push('observation_insert'); return query }),
      update: jest.fn((row: Record<string, unknown>) => { operation = 'update'; values = row; events.push(String(row.status)); return query }),
      single: jest.fn(async () => {
        if (options.insertThrows) throw options.insertThrows
        return { data: options.missingReturnedRow ? null : { ...inserted, id: 'observation-id', ...(options.wrongSource ? { source_id: 'other-tenant-source' } : {}) }, error: options.persistenceError ?? (options.insertError ? { code: '42501', message: 'Denied' } : null) }
      }),
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
  return { events, from, observationSelects, inserted: () => inserted }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.mocked(fetchWebsiteHtml).mockResolvedValue({ body: Buffer.from('<html><head><title>Real page</title></head><body><h1>Actual content</h1></body></html>'), finalUrl: new URL('https://arbitrary.example.org/'), statusCode: 200, contentType: 'text/html', headers: {} })
  jest.mocked(checkQuickInternalLinks).mockResolvedValue({ checks: [], candidate_count: 0, checked_count: 0, discovery_truncated: false, excluded_links: 0, check_limit: 5 })
  jest.mocked(recommendWebsiteImprovements).mockResolvedValue({ status: 'unavailable', recommendations: [], reason: 'Not configured' })
})
afterEach(() => jest.restoreAllMocks())

it('keeps legacy Quick Scan persistence intact and derives canonical SEO findings only when reading saved evidence', async () => {
  const h = harness()
  jest.mocked(fetchWebsiteHtml).mockResolvedValue({ body: Buffer.from('<html><head><title>Real page</title><link rel="canonical" href="javascript:void(0)"></head><body><h1>Actual content</h1></body></html>'), finalUrl: new URL('https://arbitrary.example.org/'), statusCode: 200, contentType: 'text/html', headers: {} })
  expect((await processWebsiteScan(scanId)).status).toBe('completed')
  const retained = h.inserted(), saved = JSON.stringify(retained)
  const report = buildWebsiteIssueReport([{ url: 'https://arbitrary.example.org/', status: 'completed', observation_id: 'observation-id', metadata: retained.metadata }])
  expect(report.groups.find(g => g.ruleId === 'invalid_canonical')?.issues).toHaveLength(1)
  expect(report.groups.find(g => g.ruleId === 'duplicate_title')?.measuredPages).toBe(0)
  expect(h.events).toEqual(['processing', 'observation_insert', 'completed'])
  expect(fetchWebsiteHtml).toHaveBeenCalledTimes(1)
  expect(JSON.stringify(retained)).toBe(saved)
})

it('persists measured evidence and verified source/scan IDs before completing', async () => {
  const h = harness()
  expect((await processWebsiteScan(scanId)).status).toBe('completed')
  expect(h.events).toEqual(['processing', 'observation_insert', 'completed'])
  expect(createServiceRoleClient).toHaveBeenCalledTimes(1)
  expect(h.observationSelects).toEqual(['id, public_id, source_id, website_scan_id'])
  expect(h.inserted()).toMatchObject({ source_id: 'source-id', website_scan_id: scanId, source_event_id: 'website_scan:scan_public', title: 'Real page', metadata: { version: 2, coverage: 'partial', ai: { status: 'unavailable' }, evidence: expect.arrayContaining([expect.objectContaining({ id: 'h1', value: 1 })]) } })
})
it('retains bounded internal-link results in the existing Quick Scan observation', async () => {
  const h = harness()
  const html = '<html><body><a href="/missing">Missing</a></body></html>'
  jest.mocked(fetchWebsiteHtml).mockResolvedValue({ body: Buffer.from(html), finalUrl: new URL('https://arbitrary.example.org/'), statusCode: 200,
    contentType: 'text/html', headers: {}, robotsBody: 'User-agent: *\nAllow: /', robotsOrigin: 'https://arbitrary.example.org' })
  jest.mocked(checkQuickInternalLinks).mockResolvedValue({
    checks: [{ url: 'https://arbitrary.example.org/missing', status: 'http_error', http_status: 404 }],
    candidate_count: 1, checked_count: 1, discovery_truncated: false, excluded_links: 0, check_limit: 5,
  })
  expect((await processWebsiteScan(scanId)).status).toBe('completed')
  expect(checkQuickInternalLinks).toHaveBeenCalledWith(html, 'https://arbitrary.example.org/', 'https://arbitrary.example.org',
    'User-agent: *\nAllow: /', 'https://arbitrary.example.org')
  expect(h.inserted().metadata).toMatchObject({
    internal_link_checks: [{ url: 'https://arbitrary.example.org/missing', status: 'http_error', http_status: 404 }],
    internal_link_coverage: { candidate_count: 1, checked_count: 1, check_limit: 5 },
  })
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
it('logs the original database error and hint exactly once without exposing it in the result', async () => {
  const error = { code: '42501', message: 'permission denied for table signal_observations', details: 'SELECT privilege is required for returned columns.', hint: 'Inspect effective worker privileges.', authorization: 'must-not-log', cookies: 'must-not-log' }
  const h = harness({ persistenceError: error })
  const result = await processWebsiteScan(scanId)
  expect(result).toEqual({ status: 'failed', scanId })
  expect(h.events).not.toContain('completed')
  expect(console.error).toHaveBeenCalledTimes(1)
  expect(console.error).toHaveBeenCalledWith('[WebsiteScanProcessor] Failed persisting observation.', {
    operation: 'signal_observations.insert_returning', scanId,
    code: error.code, message: error.message, details: error.details, hint: error.hint,
  })
  expect(JSON.stringify(jest.mocked(console.error).mock.calls)).not.toContain('must-not-log')
})
it.each([{ missingReturnedRow: true }, { wrongSource: true }])('distinguishes verification failures from database rejections: %j', async options => {
  harness(options)
  expect((await processWebsiteScan(scanId)).status).toBe('failed')
  expect(console.error).toHaveBeenCalledTimes(1)
  expect(jest.mocked(console.error).mock.calls[0][1]).toMatchObject({
    operation: 'signal_observations.verify_returned_row', scanId,
    code: options.missingReturnedRow ? 'OBSERVATION_RESULT_MISSING' : 'OBSERVATION_RESULT_MISMATCH',
    details: null, hint: null,
  })
})
it('preserves a thrown insert exception in safe server diagnostics instead of losing it in the outer catch', async () => {
  const h = harness({ insertThrows: new Error('Transport failure with Bearer test-secret') })
  expect(await processWebsiteScan(scanId)).toEqual({ status: 'failed', scanId })
  expect(h.events).not.toContain('completed')
  expect(console.error).toHaveBeenCalledTimes(1)
  expect(jest.mocked(console.error).mock.calls[0][1]).toMatchObject({
    operation: 'signal_observations.insert_returning', scanId,
    message: 'Transport failure with Bearer [REDACTED]',
  })
})
