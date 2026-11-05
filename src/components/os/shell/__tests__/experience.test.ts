let mockQuery = ''
jest.mock('next/navigation', () => ({ usePathname: () => '/app', useSearchParams: () => new URLSearchParams(mockQuery), useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('next/link', () => ({ __esModule: true, default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { scroll?: boolean }) => { const { children, ...anchor } = props; delete anchor.scroll; return createElement('a', anchor, children) } }))
jest.mock('@/components/os/workspace/WorkspaceProvider', () => ({ useWorkspace: () => ({ workspace: { id: 'workspace-a', name: 'Business', role: 'owner' } }) }))
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as cheerio from 'cheerio'
import { PageTabs } from '../PageTabs'
import { WebsiteOverview } from '../WebsiteOverview'
import { AIWebsiteResults } from '@/components/os/ai/AIWebsiteResults'
import WebsiteAuditPanel from '@/components/os/workspace/WebsiteAuditPanel'
import { auditViewScope, currentAuditResponse } from '@/components/os/workspace/auditViewState'
import { WorkspaceReadBoundary } from '../WorkspaceReadBoundary'
import Tasks from '@/app/app/forge/page'
import Requests from '@/app/app/pulse/page'
import Library from '@/app/app/vault/page'
import type { PersistedSignalFeedSource, PersistedSignalObservation } from '@/data/os/signal'

const sources = [{ id: 'source-a', source_type: 'website', name: 'First website', source_key: 'website:first.example.org' }, { id: 'source-b', source_type: 'website', name: 'Second website', source_key: 'website:second.example.org' }] as PersistedSignalFeedSource[]
const observations = [{ id: 'obs-a', source_id: 'source-a', website_scan_id: 'scan-a', category: 'website_content', title: 'First saved measurement', observed_at: '2026-11-01T12:00:00Z', metadata: { fetched_url: 'https://first.example.org/', evidence: [{ id: 'title', value: '' }] } },
  { id: 'obs-b', source_id: 'source-b', website_scan_id: 'scan-b', category: 'website_content', title: 'Second saved measurement', observed_at: '2026-11-01T12:00:00Z', metadata: { fetched_url: 'https://second.example.org/', evidence: [{ id: 'title', value: 'Second website title evidence' }] } }] as PersistedSignalObservation[]
const report = () => cheerio.load(renderToStaticMarkup(createElement(AIWebsiteResults, { workspaceId: 'workspace-a', sources, observations, scans: [], activeTab: 'context' })))
beforeEach(() => { mockQuery = '' })
it('withholds content labeled for a different workspace until the shell is refreshed', () => {
  const $ = cheerio.load(renderToStaticMarkup(createElement(WorkspaceReadBoundary, { workspaceId: 'workspace-b' }, 'Other workspace evidence')))
  expect($('body').text()).not.toContain('Other workspace evidence')
  expect($('button').text()).toBe('Refresh workspace')
})

it('keeps website and result selection when switching report tabs', () => {
  mockQuery = 'website=source-b&result=scan%3Ascan-b&tab=context'
  const $ = cheerio.load(renderToStaticMarkup(createElement(PageTabs, { label: 'Report views', active: 'context', items: [{ id: 'context', label: 'Results', href: '/app/ai?tab=context' }, { id: 'runs', label: 'Processing history', href: '/app/ai?tab=runs' }] })))
  expect($('a[aria-current="page"]').text()).toBe('Results')
  const query = new URL($('a').last().attr('href')!, 'https://app.example.org').searchParams
  expect(query.get('website')).toBe('source-b')
  expect(query.get('result')).toBe('scan:scan-b')
  expect(query.get('tab')).toBe('runs')
})
it('shows only the requested website and saved check, not the default website evidence', () => {
  mockQuery = 'website=source-b&result=scan%3Ascan-b'
  const $ = report()
  expect($('select[aria-label="Website results"] option[selected]').attr('value')).toBe('source-b')
  expect($('body').text()).toContain('Second website title evidence')
  expect($('body').text()).not.toContain('https://first.example.org/')
})
it('resolves a completed Quick Scan link to its own website rather than the first website', () => {
  mockQuery = 'result=scan%3Ascan-b'
  const $ = report()
  expect($('select[aria-label="Website results"] option[selected]').attr('value')).toBe('source-b')
  expect($('body').text()).toContain('Second website title evidence')
  expect($('body').text()).not.toContain('https://first.example.org/')
})
it('does not silently substitute another website or check when a selection is unavailable', () => {
  mockQuery = 'website=foreign-source'
  expect(report()('body').text()).toContain('selected website is unavailable')
  expect(report()('body').text()).not.toContain('Second website title evidence')
  mockQuery = 'website=source-b&result=scan%3Ascan-a'
  expect(report()('body').text()).toContain('selected check is not available')
  expect(report()('body').text()).not.toContain('Second website title evidence')
})
it('does not expose retained results while the workspace identity is changing', () => {
  const html = renderToStaticMarkup(createElement(AIWebsiteResults, { workspaceId: 'workspace-old', sources, observations, scans: [], activeTab: 'context' }))
  expect(html).not.toContain('Second website title evidence')
})
it('scopes asynchronous audit responses to both the workspace and requested history entry', () => {
  const response = { data: 'old audit evidence' }
  expect(currentAuditResponse(response, auditViewScope('a', 'first'), 'a', 'second')).toBeUndefined()
  expect(currentAuditResponse(response, auditViewScope('a', 'first'), 'b', 'first')).toBeUndefined()
  expect(currentAuditResponse(response, auditViewScope('a', 'first'), 'a', 'first')).toBe(response)
})
it('shows local audit loading and explains what the start action does', () => {
  const $ = cheerio.load(renderToStaticMarkup(createElement(WebsiteAuditPanel)))
  expect($('[role="status"]').text()).toContain('Loading the selected audit')
  expect($('button[type="submit"]').text()).toBe('Start website audit')
  expect($('body').text()).toContain('Maximum pages to check')
  expect($('aside, header, main')).toHaveLength(0)
})
it('shows measured findings and clearly bounded coverage, not invented website scores', () => {
  const $ = cheerio.load(renderToStaticMarkup(createElement(WebsiteOverview, { sources, observations, resultsAvailable: true })))
  expect($('.os-website-row').first().text()).toContain('1 supported findings')
  expect($('.os-website-row').last().text()).toContain('No supported issues')
  expect($('body').text()).toContain('does not verify the whole website')
  expect($('body').text()).not.toContain('health score')
  expect($('a').filter((_, node) => $(node).text() === 'View results & fixes')).toHaveLength(2)
})
it.each([['Tasks', Tasks], ['Requests & Approvals', Requests], ['Library', Library]] as const)('explains %s honestly and preserves its existing detailed views', async (title, Page) => {
  const $ = cheerio.load(renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) })))
  expect($('h1').text()).toBe(title)
  expect($('body').text()).toContain('demonstration records, not activity from your business')
  expect($('details.os-technical').attr('open')).toBeUndefined()
  expect($('nav a').length).toBeGreaterThan(2)
  expect($('aside.os-sidebar, main, header')).toHaveLength(0)
})
