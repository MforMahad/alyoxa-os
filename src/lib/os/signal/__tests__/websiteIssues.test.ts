import { buildWebsiteIssueReport, detectWebsiteIssues, type IssuePage } from '../websiteIssues'
import { analyzeWebsiteHtml } from '../websiteIntelligence'

const url = 'https://issues.example.org/'
const metadata = (evidence: [string, unknown][]) => ({ evidence: evidence.map(([id, value]) => ({ id, value })) })
const page = (overrides: Partial<IssuePage> = {}): IssuePage => ({ url, status: 'completed', observation_id: 'obs-1', metadata: metadata([['title', '']]), ...overrides })
const detect = (data: unknown) => detectWebsiteIssues({ affectedUrl: url, observationId: 'obs-1', metadata: data })

// Controlled HTML fixtures isolate one changed measurement at a time.
const validHtml = '<html lang="en"><head><title>Fixture page</title><meta name="description" content="Fixture description"><meta name="viewport" content="width=device-width"></head><body><h1>Fixture heading</h1><img src="image.png" alt="Fixture image"></body></html>'
const isolatedRules = [
  { rule: 'missing_title', remove: '<title>Fixture page</title>', replace: '', severity: 'low', evidence: 'title', value: '', fix: 'Add a descriptive, page-specific HTML title.' },
  { rule: 'missing_description', remove: '<meta name="description" content="Fixture description">', replace: '', severity: 'low', evidence: 'description', value: '', fix: 'Add a concise, page-specific meta description.' },
  { rule: 'missing_language', remove: ' lang="en"', replace: '', severity: 'medium', evidence: 'language', value: '', fix: 'Declare the appropriate language on the html element.' },
  { rule: 'missing_alt', remove: ' alt="Fixture image"', replace: '', severity: 'medium', evidence: 'missing_alt', value: 1, fix: 'Review images missing alt attributes. Supply meaningful alternatives for informative images and empty alt attributes for decorative images.' },
  { rule: 'missing_viewport', remove: '<meta name="viewport" content="width=device-width">', replace: '', severity: 'low', evidence: 'viewport', value: false, fix: 'Review the layout and add appropriate viewport metadata without preventing user zoom.' },
  { rule: 'missing_h1', remove: '<h1>Fixture heading</h1>', replace: '<h2>Fixture heading</h2>', severity: 'low', evidence: 'h1', value: 0, fix: 'Review the heading structure and provide a descriptive main heading where appropriate.' },
]

it.each(isolatedRules)('isolates $rule with its exact URL, severity, evidence and recommended fix', test => {
  const result = detect(analyzeWebsiteHtml(validHtml.replace(test.remove, test.replace), new URL(url), {}))
  expect(result.issues).toHaveLength(1)
  expect(result.issues[0]).toMatchObject({ ruleId: test.rule, severity: test.severity, confidence: 'high', affectedUrl: url, recommendedFix: test.fix,
    evidenceReferences: expect.arrayContaining([{ observationId: 'obs-1', evidenceId: test.evidence, value: test.value }]) })
  expect(result.measuredRules).toHaveLength(6)
})

it.each(isolatedRules)('does not flag $rule on valid HTML', test => {
  const result = detect(analyzeWebsiteHtml(validHtml, new URL(url), {}))
  expect(result.measuredRules).toContain(test.rule)
  expect(result.issues).toEqual([])
})

it.each(isolatedRules)('keeps missing and malformed historical $rule measurements unknown', test => {
  const good = analyzeWebsiteHtml(validHtml, new URL(url), {})
  for (const evidence of [good.evidence.filter(e => e.id !== test.evidence),
    good.evidence.map(e => e.id === test.evidence ? { ...e, value: { malformed: true } } : e)]) {
    const result = detect({ evidence })
    expect(result.issues).toEqual([])
    expect(result.measuredRules).not.toContain(test.rule)
  }
})

it.each(isolatedRules)('groups multiple $rule pages, preserving good pages and excluding network failures', test => {
  const bad = analyzeWebsiteHtml(validHtml.replace(test.remove, test.replace), new URL(url), {})
  const good = analyzeWebsiteHtml(validHtml, new URL(url), {})
  const report = buildWebsiteIssueReport([
    page({ final_url: url + 'a', metadata: bad }), page({ url: url + 'b', observation_id: 'obs-2', metadata: bad }),
    page({ url: url + 'good', observation_id: 'obs-3', metadata: good }),
    page({ url: url + 'failed', status: 'failed', metadata: bad }),
  ])
  const group = report.groups.find(g => g.ruleId === test.rule)!
  expect(group).toMatchObject({ affectedUrls: [url + 'a', url + 'b'], measuredPages: 3, unknownPages: 0 })
  expect(group.issues.map(issue => issue.evidenceReferences[0].observationId)).toEqual(['obs-1', 'obs-2'])
  expect(report.groups.filter(g => g.issues.length)).toHaveLength(1)
  expect(report.coverage).toMatchObject({ analyzedPages: 3, failedPages: 1, partial: true })
})

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
