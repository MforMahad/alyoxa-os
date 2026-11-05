jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => createElement('a', props, children) }))
jest.mock('next/navigation', () => ({ usePathname: () => '/app' }))
jest.mock('@/components/os/workspace/WorkspaceProvider', () => ({ useWorkspace: () => ({ workspace: { name: 'Example business', role: 'owner' } }) }))
jest.mock('@/components/os/workspace/WorkspaceSignalEntry', () => ({ __esModule: true, default: () => createElement('div', { 'data-scanner': 'existing' }, 'Existing scanner') }))
jest.mock('@/components/os/OSConstellation', () => ({ __esModule: true, default: () => createElement('div', {}, 'Architecture diagram') }))
jest.mock('@/actions/workspaces/getActiveWorkspace', () => ({ getActiveWorkspace: jest.fn() }))
jest.mock('@/actions/signal/listWorkspaceWebsiteScans', () => ({ listWorkspaceWebsiteScans: jest.fn() }))
jest.mock('@/actions/signal/listWorkspaceFeedSources', () => ({ listWorkspaceFeedSources: jest.fn() }))
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as cheerio from 'cheerio'
import Overview from '@/app/app/page'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { listWorkspaceWebsiteScans } from '@/actions/signal/listWorkspaceWebsiteScans'
import { listWorkspaceFeedSources } from '@/actions/signal/listWorkspaceFeedSources'
import { isOSNavigationActive, osNavigation } from '../navigation'

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(getActiveWorkspace).mockResolvedValue({ success: true, data: { id: 'workspace-a' } } as never)
  jest.mocked(listWorkspaceFeedSources).mockResolvedValue({ success: true, data: [{ source_type: 'website' }, { source_type: 'website' }, { source_type: 'other' }] } as never)
  jest.mocked(listWorkspaceWebsiteScans).mockResolvedValue({ success: true, data: [
    { id: 'scan', status: 'completed', created_at: '2026-11-01T12:00:00Z', observationCount: 1 },
    { id: 'waiting', status: 'queued', created_at: '2026-11-01T11:00:00Z', observationCount: 0 },
  ] } as never)
})

it('uses shared navigation with real destinations and keeps all five module routes accessible', () => {
  const hrefs = osNavigation.flatMap(group => group.items.map(item => item.href))
  expect(hrefs).toEqual(['/app', '/app/signal?tab=sources', '/app#website-audits', '/app/ai', '/app/forge', '/app/pulse', '/app/vault'])
  expect(hrefs).not.toContain('/app/settings')
  expect(hrefs).not.toContain('/app/automations')
  expect(isOSNavigationActive('/app#website-audits', '/app', '#website-audits')).toBe(true)
  expect(isOSNavigationActive('/app', '/app', '#website-audits')).toBe(false)
  expect(isOSNavigationActive('/app/signal?tab=sources', '/app/signal')).toBe(true)
})

it('shows bounded real workspace activity, working scanner links and architecture through disclosure', async () => {
  const $ = cheerio.load(renderToStaticMarkup(await Overview()))
  expect(listWorkspaceFeedSources).toHaveBeenCalledWith('workspace-a')
  expect($('.os-workspace-snapshot strong').toArray().map(node => $(node).text())).toEqual(['2', '2', '1'])
  expect($('[data-scanner="existing"]')).toHaveLength(1)
  expect($('#website-audits')).toHaveLength(1)
  expect($('#website-checks')).toHaveLength(1)
  expect($('a[href="#website-checks"]')).toHaveLength(1)
  expect($('main').text()).toContain('Latest 50 scans at most')
  expect($('.os-architecture').attr('open')).toBeUndefined()
  expect($('main').text()).not.toContain('EXAMPLE_TIMESTAMP')
  expect($('dialog').attr('aria-label')).toBe('Workspace navigation')
  expect($('a[href="#workspace-content"]').text()).toBe('Skip to workspace')
})

it('does not turn failed reads into reassuring zero counts', async () => {
  jest.mocked(listWorkspaceFeedSources).mockResolvedValue({ success: false, error: 'Website list unavailable' })
  jest.mocked(listWorkspaceWebsiteScans).mockResolvedValue({ success: false, error: 'History unavailable' })
  const $ = cheerio.load(renderToStaticMarkup(await Overview()))
  expect($('.os-workspace-snapshot strong').toArray().map(node => $(node).text())).toEqual(['—', '—', '—'])
  expect($('[role="alert"]').text()).toContain('History unavailable')
})

it('keeps onboarding empty states actionable and avoids fetching another workspace', async () => {
  jest.mocked(getActiveWorkspace).mockResolvedValue({ success: false, error: 'No active workspace found.' })
  const $ = cheerio.load(renderToStaticMarkup(await Overview()))
  expect(listWorkspaceFeedSources).not.toHaveBeenCalled()
  expect(listWorkspaceWebsiteScans).not.toHaveBeenCalled()
  expect($('a[href="/app/onboarding"]')).toHaveLength(1)
  expect($('[data-scanner]')).toHaveLength(0)
})

it('keeps failed and unverifiable scans distinct from retained findings', async () => {
  jest.mocked(listWorkspaceWebsiteScans).mockResolvedValue({ success: true, data: [
    { id: 'failed', status: 'failed', created_at: '2026-11-01T12:00:00Z', observationCount: 0, error_message: 'Fetch unavailable' },
    { id: 'historical', status: 'completed', created_at: '2026-11-01T11:00:00Z', observationCount: 0, error_message: null },
  ] })
  const $ = cheerio.load(renderToStaticMarkup(await Overview()))
  expect($('.os-activity-list').text()).toContain('Needs attention')
  expect($('.os-activity-list').text()).toContain('no saved findings')
  expect($('.os-activity-list details').attr('open')).toBeUndefined()
})
