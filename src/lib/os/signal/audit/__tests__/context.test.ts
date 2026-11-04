import { buildWebsiteContexts } from '../../persistedWebsiteContexts'
import type { PersistedSignalObservation } from '@/data/os/signal'

it('keeps Quick Scan context and one audit summary without importing raw audit pages', () => {
  const base: PersistedSignalObservation = { id: 'id', public_id: 'quick', source_id: 'source', website_scan_id: 'scan', source_event_id: 'event', severity: 'low', category: 'website_content', title: 'Quick title', description: 'Measured quick page', metadata: { version: 2 }, observed_at: '2026-10-29T00:00:00Z', created_at: '2026-10-29T00:00:00Z' }
  const result = buildWebsiteContexts([base,
    { ...base, public_id: 'audit-page', metadata: { record_kind: 'audit_page', text_excerpt: 'Raw page content' } },
    { ...base, public_id: 'audit-summary', metadata: { record_kind: 'audit_summary', counts: { completed: 5 } } }])
  expect(result.map(item => item.refId)).toEqual(['quick', 'audit-summary'])
  expect(JSON.stringify(result)).not.toContain('Raw page content')
})
