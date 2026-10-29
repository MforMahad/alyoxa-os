import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WebsiteObservationDetails } from '@/components/os/signal/WebsiteObservationDetails'
import { buildWebsiteContexts } from '../persistedWebsiteContexts'

it('creates no context in an empty workspace and preserves actual observation lineage', () => {
  expect(buildWebsiteContexts([])).toEqual([])
  const [context] = buildWebsiteContexts([{ id: 'id', public_id: 'obs_real', source_id: 'workspace-source', website_scan_id: 'scan_real', source_event_id: 'event_real', severity: 'low', category: 'website_content', title: 'Actual title', description: 'Actual captured description', metadata: { evidence: [{ id: 'h1', value: 1 }] }, observed_at: '2026-10-29T00:00:00Z', created_at: '2026-10-29T00:00:00Z' }])
  expect(context).toMatchObject({ refId: 'obs_real', summary: 'Actual captured description', payload: { source_id: 'workspace-source', website_scan_id: 'scan_real', metadata: { evidence: [{ id: 'h1', value: 1 }] } } })
})
it('renders real evidence and recommendations as escaped text with coverage limits', () => {
  const markup = renderToStaticMarkup(createElement(WebsiteObservationDetails, { metadata: {
    fetched_url: 'https://arbitrary.example.org/', coverage: 'partial', limitations: ['Single HTML page'],
    evidence: [{ id: 'title', label: 'HTML title', value: '<script>alert(1)</script>' }],
    ai: { status: 'available', model: 'configured-model', recommendations: [{ recommendation: 'Review title', evidenceIds: ['title'], caveat: 'Single page only' }] },
  } }))
  expect(markup).toContain('&lt;script&gt;')
  expect(markup).not.toContain('<script>')
  expect(markup).toContain('Review title')
  expect(markup).toContain('partial')
  expect(markup).toContain('Single HTML page')
})
it('does not synthesize evidence or recommendations for legacy metadata', () => {
  const markup = renderToStaticMarkup(createElement(WebsiteObservationDetails, { metadata: null }))
  expect(markup).toContain('No structured evidence was retained')
  expect(markup).not.toContain('available')
})
