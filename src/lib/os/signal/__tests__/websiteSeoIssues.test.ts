import { buildWebsiteIssueReport, detectWebsiteIssues, WEBSITE_ISSUE_REPORT_VERSION, type IssuePage } from '../websiteIssues'
import { analyzeWebsiteHtml } from '../websiteIntelligence'

const origin = 'https://seo.example.org'
function page(path: string, title = 'Distinct title ' + path, description = 'Distinct description ' + path, canonical = '', robots = ''): IssuePage {
  const url = origin + path
  const metadata = analyzeWebsiteHtml(`<html lang="en"><head><title>${title}</title><meta name="description" content="${description}"><meta name="viewport" content="width=device-width"><link rel="canonical" href="${canonical}"><meta name="robots" content="${robots}"></head><body><h1>Heading</h1></body></html>`, new URL(url), {})
  return { url, final_url: url, status: 'completed', observation_id: 'obs:' + path, metadata: { ...metadata, record_kind: 'audit_page', audit_id: 'audit-a' } }
}
const group = (pages: IssuePage[], rule: string) => buildWebsiteIssueReport(pages).groups.find(g => g.ruleId === rule)!
function evidence(p: IssuePage) { return (p.metadata as { evidence: { id: string; value: unknown }[] }).evidence }

it.each([['duplicate_title', 'title'], ['duplicate_description', 'description']])('groups %s from two complete saved measurements with exact peer evidence', (rule, key) => {
  const pages = [page('/a', 'Shared title', 'Shared description'), page('/b', '  SHARED   TITLE ', '  SHARED   DESCRIPTION  '), page('/different')]
  const result = group(pages, rule)
  expect(result).toMatchObject({ severity: 'low', affectedUrls: [origin + '/a', origin + '/b'], measuredPages: 3, unknownPages: 0 })
  for (const finding of result.issues) {
    expect(finding.recommendedFix).toContain('Review')
    expect(finding.limitations.join(' ')).toContain('not proof')
    expect(finding.evidenceReferences).toHaveLength(2)
    expect(new Set(finding.evidenceReferences.map(r => r.observationId))).toEqual(new Set(['obs:/a', 'obs:/b']))
    expect(finding.evidenceReferences.every(r => r.evidenceId === key && pages.some(p => p.observation_id === r.observationId && evidence(p).some(e => e.id === key && e.value === r.value)))).toBe(true)
  }
})
it('does not report unique values, blank values, fallback display titles or failed-page metadata as duplicates', () => {
  const pages = [page('/a'), page('/b'), page('/blank-a', '', ''), page('/blank-b', '', ''), { ...page('/failed', 'Distinct title /a'), status: 'failed' }]
  expect(group(pages, 'duplicate_title').issues).toEqual([])
  expect(group(pages, 'duplicate_description').issues).toEqual([])
  expect(buildWebsiteIssueReport(pages).coverage.failedPages).toBe(1)
})
it('does not compare different audit histories, origins or unscoped Quick Scan observations', () => {
  const a = page('/a', 'Shared', 'Shared'), b = page('/b', 'Shared', 'Shared')
  for (const other of [
    { ...b, metadata: { ...(b.metadata as object), audit_id: 'audit-b' } },
    { ...b, url: 'https://other.example.org/b', final_url: 'https://other.example.org/b' },
    { ...b, metadata: { ...(b.metadata as object), record_kind: 'website_content', audit_id: undefined } },
  ]) expect(group([a, other], 'duplicate_title')).toMatchObject({ issues: [], measuredPages: 0 })
})
it('deduplicates redirected aliases by final URL and requires distinct observation links', () => {
  const a = page('/a', 'Shared'), alias = { ...page('/alias', 'Shared'), final_url: origin + '/a' }
  expect(group([a, alias], 'duplicate_title').issues).toEqual([])
  expect(group([a, { ...page('/b', 'Shared'), observation_id: a.observation_id }], 'duplicate_title').issues).toEqual([])
})
it.each([['title', 250, 'duplicate_title'], ['description', 500, 'duplicate_description']] as const)('does not infer identical complete %s values from capped prefixes', (key, cap, rule) => {
  const pages = [page('/a'), page('/b')]
  for (const p of pages) evidence(p).find(e => e.id === key)!.value = 'x'.repeat(cap)
  expect(group(pages, rule)).toMatchObject({ measuredPages: 0, unknownPages: 2, issues: [] })
})
it('keeps malformed, absent and ambiguous historical measurements unknown', () => {
  const a = page('/a', 'Shared'), b = page('/b', 'Shared')
  evidence(b).push({ id: 'title', value: 'Shared' })
  evidence(a).find(e => e.id === 'description')!.value = null
  expect(group([a, b], 'duplicate_title').measuredPages).toBe(0)
  expect(group([{ ...a, metadata: null }, { ...b, metadata: {} }], 'invalid_canonical')).toMatchObject({ measuredPages: 0, issues: [] })
})
it.each(['javascript:alert(1)', 'mailto:owner@example.org', 'https://', 'https://user:password@example.org/'])('reports only the measured invalid absolute canonical: %s', canonical => {
  const p = page('/a', undefined, undefined, canonical)
  const result = group([p], 'invalid_canonical')
  expect(result.issues).toHaveLength(1)
  expect(result.issues[0]).toMatchObject({ affectedUrl: origin + '/a', severity: 'medium', confidence: 'high', evidenceReferences: [{ observationId: 'obs:/a', evidenceId: 'canonical', value: canonical }] })
})
it.each(['', '/relative', '../other', 'https://elsewhere.example.org/valid', origin + '/a', origin + '/Different/Case?x=1'])('does not label legitimate, absent or unresolvable declarations as defects: %s', canonical => {
  expect(group([page('/a', undefined, undefined, canonical)], 'invalid_canonical').issues).toEqual([])
  expect(group([page('/a', undefined, undefined, canonical)], 'canonical_to_noindex').issues).toEqual([])
})
it('flags a retained canonical-to-noindex relationship with both observation references', () => {
  const a = page('/a', undefined, undefined, origin + '/target'), target = page('/target', undefined, undefined, '', 'NOINDEX, FOLLOW')
  const result = group([a, target], 'canonical_to_noindex')
  expect(result).toMatchObject({ affectedUrls: [origin + '/a'], measuredPages: 1, unknownPages: 1 })
  expect(result.issues[0].evidenceReferences).toEqual([
    { observationId: 'obs:/a', evidenceId: 'canonical', value: origin + '/target' },
    { observationId: 'obs:/target', evidenceId: 'robots_meta', value: 'NOINDEX, FOLLOW' },
  ])
})
it('handles generic retained X-Robots-Tag without guessing scoped crawler directives', () => {
  const a = page('/a', undefined, undefined, origin + '/target'), target = page('/target')
  evidence(target).find(e => e.id === 'robots_header')!.value = 'noindex'
  expect(group([a, target], 'canonical_to_noindex').issues).toHaveLength(1)
  evidence(target).find(e => e.id === 'robots_header')!.value = 'otherbot: noindex'
  expect(group([a, target], 'canonical_to_noindex').issues).toEqual([])
})
it('preserves case-sensitive paths, queries and trailing slashes when identifying canonical targets', () => {
  const target = page('/target', undefined, undefined, '', 'noindex')
  for (const href of [origin + '/Target', origin + '/target?different=1', origin + '/target/'])
    expect(group([page('/a', undefined, undefined, href), target], 'canonical_to_noindex').issues).toEqual([])
})
it('does not treat missing targets, failed scans, other histories, self-noindex or intentional noindex sources as canonical defects', () => {
  const source = page('/a', undefined, undefined, origin + '/target'), target = page('/target', undefined, undefined, '', 'noindex')
  for (const other of [{ ...target, status: 'failed' }, { ...target, metadata: { ...(target.metadata as object), audit_id: 'older' } }])
    expect(group([source, other], 'canonical_to_noindex').issues).toEqual([])
  expect(group([page('/target', undefined, undefined, origin + '/target', 'noindex')], 'canonical_to_noindex').issues).toEqual([])
  expect(group([page('/a', undefined, undefined, origin + '/target', 'noindex'), target], 'canonical_to_noindex').issues).toEqual([])
  expect(group([source, page('/target')], 'canonical_to_noindex')).toMatchObject({ measuredPages: 1, issues: [] })
})
it('keeps partial coverage honest, runs deterministically and leaves observations and the six-rule detector unchanged', () => {
  const pages = [page('/a', 'Shared'), page('/b', 'Shared'), { ...page('/failed'), status: 'failed' }]
  const saved = JSON.stringify(pages), report = buildWebsiteIssueReport(pages)
  expect(report.version).toBe(WEBSITE_ISSUE_REPORT_VERSION)
  expect(report.coverage).toMatchObject({ partial: true, analyzedPages: 2, failedPages: 1 })
  expect(report).toEqual(buildWebsiteIssueReport([...pages].reverse()))
  expect(JSON.stringify(pages)).toBe(saved)
  expect(detectWebsiteIssues({ affectedUrl: origin + '/a', observationId: 'obs:/a', metadata: pages[0].metadata })).toMatchObject({ version: 1, issues: [] })
})
