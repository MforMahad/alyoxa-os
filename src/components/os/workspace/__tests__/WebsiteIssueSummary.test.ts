import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as cheerio from 'cheerio'
import { WebsiteIssueSummary } from '../WebsiteIssueSummary'
import { buildWebsiteIssueReport, type IssuePage } from '@/lib/os/signal/websiteIssues'
import { analyzeWebsiteHtml } from '@/lib/os/signal/websiteIntelligence'

const url = 'https://presentation.example.org/'
const page = (html: string, target = url): IssuePage => ({ url: target, status: 'completed', observation_id: 'retained-observation', metadata: analyzeWebsiteHtml(html, new URL(target), {}) })
const good = '<html lang="en"><head><title>Page</title><meta name="description" content="Page description"><meta name="viewport" content="width=device-width"></head><body><h1>Heading</h1><img alt="" src="decoration.png"></body></html>'
const render = (report: ReturnType<typeof buildWebsiteIssueReport>) => cheerio.load(renderToStaticMarkup(createElement(WebsiteIssueSummary, { report })))

it('shows issue occurrences, unique affected pages, analyzed pages and partial coverage', () => {
  const $ = render(buildWebsiteIssueReport([page('<html><body><img src="image.png"></body></html>'), page(good, url + 'good')]))
  expect($('dl').text()).toContain('Detected issues6')
  expect($('dl').text()).toContain('Affected pages1')
  expect($('dl').text()).toContain('Analyzed pages2')
  expect($('section').text()).toContain('Partial coverage')
  expect($('article h4').first().text()).toContain('Medium priority')
  const priorities = $('article h4').toArray().map(node => $(node).text().includes('Medium priority') ? 0 : 1)
  expect(priorities).toEqual([...priorities].sort())
  expect($('article').first().text()).toContain('Recommended fix:')
  expect($('article ul[aria-label]').first().text()).toContain(url)
  expect($('details[open]')).toHaveLength(0)
})

it('shows qualified success for supported checks, with zero-issue checks collapsed', () => {
  const $ = render(buildWebsiteIssueReport([page(good)]))
  expect($('section').text()).toContain('No issues detected. Supported checks with available measurements passed on the analyzed pages.')
  expect($('article')).toHaveLength(0)
  expect($('details').filter((_, node) => $(node).children('summary').text().startsWith('Other checks')).attr('open')).toBeUndefined()
  expect($('details').text()).toContain('passed on 1 assessed pages')
})

it('does not present missing historical evidence as successful checks', () => {
  const $ = render(buildWebsiteIssueReport([{ url, status: 'completed', observation_id: 'historical', metadata: {} }]))
  expect($('section').text()).toContain('not enough retained evidence')
  expect($('section').text()).not.toContain('measurements passed')
  expect($('section').text()).toContain('not assessed')
  expect($('section').text()).toContain('Some checks could not be assessed')
})

it('explains deduplicated missing/restricted resources without labeling them page defects', () => {
  const resource = { kind: 'sitemap', url: url + 'sitemap.xml', status: 'missing', http_status: 404 }
  const input = page(good)
  input.metadata = { ...(input.metadata as object), site_checks: [resource, resource, { kind: 'robots', url: url + 'robots.txt', status: 'restricted', http_status: 403 }] }
  const $ = render(buildWebsiteIssueReport([input]))
  expect($('article')).toHaveLength(0)
  expect($('section').text()).toContain('File not found')
  expect($('section').text()).toContain('Access restricted')
  expect($('section').text()).toContain('not automatically a website defect')
  expect($('summary').filter((_, node) => $(node).text() === 'Technical result')).toHaveLength(2)
  expect($('details[open]')).toHaveLength(0)
})

it('keeps long URLs and untrusted values as wrapped plain text in a responsive layout', () => {
  const longUrl = url + 'a'.repeat(500)
  const report = buildWebsiteIssueReport([page('<html><body></body></html>', longUrl)])
  report.groups[0].recommendedFix = '<script>unsafe()</script>'
  const $ = render(report)
  expect($('script')).toHaveLength(0)
  expect($('article').text()).toContain('<script>unsafe()</script>')
  expect($('dl').attr('class')).toContain('grid-cols-1')
  expect($('dl').attr('class')).toContain('sm:grid-cols-3')
  expect($('li').filter((_, node) => $(node).text() === longUrl).first().attr('class')).toContain('[overflow-wrap:anywhere]')
})
