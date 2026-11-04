import { buildWebsiteIssueReport, detectWebsiteIssues, type IssuePage } from '../websiteIssues'
import { analyzeWebsiteHtml } from '../websiteIntelligence'

const url = 'https://issues.example.org/'
const metadata = (evidence: [string, unknown][]) => ({ evidence: evidence.map(([id, value]) => ({ id, value })) })
const page = (overrides: Partial<IssuePage> = {}): IssuePage => ({ url, status: 'completed', observation_id: 'obs-1', metadata: metadata([['title', '']]), ...overrides })
const detect = (data: unknown) => detectWebsiteIssues({ affectedUrl: url, observationId: 'obs-1', metadata: data })

it('derives all six conservative findings from genuine extractor measurements with evidence and fixes', () => {
  const analysis = analyzeWebsiteHtml('<html><body><img src="x.png"></body></html>', new URL(url), {})
  const result = detect(analysis)
  expect(result.version).toBe(1)
  expect(result.issues.map(x => x.ruleId)).toEqual(['missing_title', 'missing_description', 'missing_language', 'missing_alt', 'missing_viewport', 'missing_h1'])
  for (const issue of result.issues) {
    expect(issue).toMatchObject({ affectedUrl: url, confidence: 'high', recommendedFix: expect.any(String), limitations: expect.any(Array) })
    expect(issue.evidenceReferences[0].observationId).toBe('obs-1')
    expect(issue.evidenceReferences.every(ref => analysis.evidence.some(item => item.id === ref.evidenceId && item.value === ref.value))).toBe(true)
  }
})

it.each([null, undefined, [], {}, 'bad', { evidence: null }, { evidence: [null, {}, { id: 'title' }] }])('treats missing or malformed historical measurements as unknown: %p', data => {
  expect(detect(data).issues).toEqual([])
  expect(detect(data).measuredRules).toEqual([])
})

it('does not coerce malformed values, inconsistent image counts or duplicate evidence', () => {
  const result = detect(metadata([['title', 0], ['description', false], ['language', null], ['viewport', 'false'], ['h1', -1], ['missing_alt', 3], ['images', 1]]))
  expect(result.issues).toEqual([])
  expect(result.measuredRules).toEqual([])
  expect(detect(metadata([['title', ''], ['title', 'Real title']])).measuredRules).toEqual([])
  expect(detect(metadata([['missing_alt', NaN], ['images', Infinity], ['h1', 0.5]])).issues).toEqual([])
})

it('accepts legitimate decorative images, no images, multiple H1s and valid metadata without speculative rules', () => {
  const result = detect(analyzeWebsiteHtml('<html lang="en"><head><title>Page</title><meta name="description" content="Useful page"><meta name="viewport" content="width=device-width"></head><body><h1>One</h1><h1>Two</h1><img alt="" src="decoration.png"></body></html>', new URL(url), {}))
  expect(result.issues).toEqual([])
  expect(result.measuredRules).toHaveLength(6)
  expect(detect(metadata([['images', 0], ['missing_alt', 0]])).issues).toEqual([])
  expect(detect(metadata([['transport', false], ['csp', false], ['text_length', 0], ['structured_data', 0]])).issues).toEqual([])
})

it('groups affected URLs with rule-specific coverage and separates failed, pending and historical pages', () => {
  const report = buildWebsiteIssueReport([page(), page({ url: url + 'about', observation_id: 'obs-2', metadata: {} }),
    page({ url: url + 'unavailable', observation_id: null, metadata: null }), page({ url: url + 'failed', status: 'failed' }),
    page({ url: url + 'pending', status: 'queued' }), page({ url: url + 'excluded', status: 'skipped' })])
  expect(report.coverage).toEqual({ completedPages: 3, analyzedPages: 2, candidatePages: 6, partial: true, pendingPages: 1, failedPages: 1, skippedPages: 1 })
  expect(report.groups.find(g => g.ruleId === 'missing_title')).toMatchObject({ affectedUrls: [url], measuredPages: 1, unknownPages: 1 })
  expect(report.groups.flatMap(g => g.issues)).toHaveLength(1)
})

it('deduplicates page URLs and shared resource evidence across pages and summary, preserving conflicting results', () => {
  const resource = { kind: 'sitemap', url: url + 'sitemap.xml', http_status: 404, status: 'missing' }
  const data = { ...metadata([['title', '']]), site_checks: [resource, resource] }
  const input = [page({ metadata: data }), page({ metadata: data }), page({ url: url + 'about', observation_id: 'obs-2', metadata: data })]
  const frozen = JSON.stringify(input)
  const report = buildWebsiteIssueReport(input, { site_checks: [resource, { ...resource, status: 'parsed', http_status: 200 }] })
  expect(report.resources).toHaveLength(2)
  expect(report.groups[0].affectedUrls).toEqual([url, url + 'about'])
  expect(report.coverage.analyzedPages).toBe(2)
  expect(JSON.stringify(input)).toBe(frozen)
  expect(buildWebsiteIssueReport(input)).toEqual(buildWebsiteIssueReport(input))
})

it('ignores unsafe URL schemes and does not fabricate issues from summaries or resource statuses', () => {
  expect(detectWebsiteIssues({ affectedUrl: 'javascript:alert(1)', observationId: 'obs', metadata: metadata([['title', '']]) }).issues).toEqual([])
  expect(buildWebsiteIssueReport([], { findings: { missing_titles: 10 }, site_checks: [{ kind: 'sitemap', url: 'javascript:alert(1)', status: 'missing' }] }).resources).toEqual([])
  expect(buildWebsiteIssueReport([]).groups.flatMap(g => g.issues)).toEqual([])
})
