import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PersistedSignalFeedSource, PersistedSignalObservation } from '@/data/os/signal'
import { groupWebsiteResults } from '../websiteResultGroups'
import { AIWebsiteResults, SelectedWebsiteResult } from '@/components/os/ai/AIWebsiteResults'
import { WorkspaceProvider } from '@/components/os/workspace/WorkspaceProvider'

function source(id: string, domain: string): PersistedSignalFeedSource {
  return { id, public_id: id, source_type: 'website', name: domain, source_key: `website:${domain}`, status: 'active', description: null, metadata: null, created_at: '', updated_at: '' }
}
function observation(id: string, overrides: Partial<PersistedSignalObservation> = {}): PersistedSignalObservation {
  return { id, public_id: id, source_id: 'source-a', website_scan_id: 'scan-new', source_event_id: null, severity: 'low', category: 'website_content', title: id, description: id, metadata: { fetched_url: 'https://redirect.example.org/' }, observed_at: '2026-11-04T12:00:00Z', created_at: '2026-11-04T12:00:00Z', ...overrides }
}
const sources = [source('source-a', 'a.example.org'), source('source-b', 'b.example.org')]
const observations = [
  observation('NEW_SCAN'),
  observation('OLD_SCAN', { website_scan_id: 'scan-old', observed_at: '2026-11-01T12:00:00Z' }),
  observation('OTHER_WEBSITE', { source_id: 'source-b', website_scan_id: 'scan-b' }),
  observation('AUDIT_PAGE', { website_scan_id: null, category: 'website_audit_page', metadata: { record_kind: 'audit_page', audit_id: 'audit-a', fetched_url: 'https://a.example.org/about', evidence: [{ id: 'title', label: 'HTML title', value: 'A_PAGE_EVIDENCE' }] } }),
  observation('AUDIT_SUMMARY', { website_scan_id: null, category: 'website_audit_summary', observed_at: '2026-11-04T13:00:00Z', metadata: { record_kind: 'audit_summary', audit_id: 'audit-a', counts: { completed: 2 }, findings: { denominator_completed_pages: 2, missing_titles: 0, missing_descriptions: 1 } } }),
]

it('keeps source identity across redirects and separates repeat scan/audit history', () => {
  const groups = groupWebsiteResults(observations, sources)
  expect(groups.map(g => g.label)).toEqual(['a.example.org', 'b.example.org'])
  expect(groups[0].runs.map(r => r.id)).toEqual(['audit:audit-a', 'scan:scan-new', 'scan:scan-old'])
  expect(groups[0].runs[0].observations.map(o => o.id)).toEqual(['AUDIT_SUMMARY', 'AUDIT_PAGE'])
  expect(groups[1].runs[0].observations.map(o => o.id)).toEqual(['OTHER_WEBSITE'])
})

it('renders only the selected history entry and keeps nested details/JSON collapsed', () => {
  const run = groupWebsiteResults(observations, sources)[0].runs[0]
  const html = renderToStaticMarkup(createElement(SelectedWebsiteResult, { run, scans: [] }))
  expect(html).toContain('AUDIT_SUMMARY')
  expect(html).toContain('A_PAGE_EVIDENCE')
  expect(html).not.toContain('OTHER_WEBSITE')
  expect(html).not.toContain('OLD_SCAN')
  expect(html).not.toContain('NEW_SCAN')
  expect(html).toContain('Page-level details (1 loaded)')
  expect(html).toContain('of 2 analyzed pages reported by the summary')
  expect(html).toContain('Context Frame Payload')
  expect(html).not.toMatch(/<details\b[^>]*\bopen(?:[\s=>])/)
})

it('hides previous workspace data during a workspace switch', () => {
  const html = renderToStaticMarkup(createElement(WorkspaceProvider, { workspace: { id: 'workspace-new' } } as never,
    createElement(AIWebsiteResults, { workspaceId: 'workspace-old', observations, sources, scans: [], activeTab: 'context' })))
  expect(html).toContain('Loading the selected workspace')
  expect(html).not.toContain('a.example.org')
  expect(html).not.toContain('AUDIT_SUMMARY')
})

it('defaults to the latest website result without expanding other histories', () => {
  const html = renderToStaticMarkup(createElement(WorkspaceProvider, { workspace: { id: 'workspace-current' } } as never,
    createElement(AIWebsiteResults, { workspaceId: 'workspace-current', observations, sources, scans: [], activeTab: 'context' })))
  expect(html).toContain('Website results')
  expect(html).toContain('Scan or audit history')
  expect(html).toContain('A_PAGE_EVIDENCE')
  expect(html).not.toContain('OTHER_WEBSITE')
  expect(html).not.toMatch(/<details\b[^>]*\bopen(?:[\s=>])/)
})

it('keeps empty sites and legacy evidence honest while excluding non-website sources', () => {
  const otherSource = { ...source('other', 'External'), source_type: 'integration' }
  const groups = groupWebsiteResults([
    observation('LEGACY', { website_scan_id: null, metadata: null }),
    observation('OTHER', { source_id: 'other' }),
  ], [...sources, otherSource])
  expect(groups).toHaveLength(2)
  expect(groups.find(g => g.id === 'source-a')?.runs[0].kind).toBe('observation')
  expect(groups.find(g => g.id === 'source-b')?.runs).toEqual([])
})
