jest.mock('next/link', () => ({ __esModule: true, default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { scroll?: boolean }) => { const { children, ...anchor } = props; delete anchor.scroll; return createElement('a', anchor, children) } }))
jest.mock('next/navigation', () => ({ usePathname: () => '/app', useSearchParams: () => new URLSearchParams(), useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('@/components/os/workspace/WorkspaceProvider', () => ({ useWorkspace: () => ({ workspace: { id: 'workspace-a', name: 'Example business', role: 'owner' } }) }))
jest.mock('@/components/os/workspace/WorkspaceSignalEntry', () => ({ __esModule: true, default: () => createElement('div', { 'data-scanner': 'existing' }, 'Existing scanner') }))
jest.mock('@/actions/workspaces/getActiveWorkspace', () => ({ getActiveWorkspace: jest.fn() }))
jest.mock('@/actions/signal/listWorkspaceWebsiteScans', () => ({ listWorkspaceWebsiteScans: jest.fn() }))
jest.mock('@/actions/signal/listWorkspaceFeedSources', () => ({ listWorkspaceFeedSources: jest.fn() }))
jest.mock('@/actions/signal/listWorkspaceObservations', () => ({ listWorkspaceObservations: jest.fn() }))
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as cheerio from 'cheerio'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Overview from '@/app/app/page'
import { OSAppShell } from '../OSAppShell'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { listWorkspaceWebsiteScans } from '@/actions/signal/listWorkspaceWebsiteScans'
import { listWorkspaceFeedSources } from '@/actions/signal/listWorkspaceFeedSources'
import { listWorkspaceObservations } from '@/actions/signal/listWorkspaceObservations'
import { isOSNavigationActive, osNavigation } from '../navigation'
const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')
beforeEach(() => {
 jest.clearAllMocks()
 jest.mocked(getActiveWorkspace).mockResolvedValue({ success:true, data:{id:'workspace-a'} } as never)
 jest.mocked(listWorkspaceFeedSources).mockResolvedValue({success:true,data:[{id:'source-a',source_type:'website',source_key:'website:business.example.org',name:'Business'}]} as never)
 jest.mocked(listWorkspaceObservations).mockResolvedValue({success:true,data:[]})
 jest.mocked(listWorkspaceWebsiteScans).mockResolvedValue({success:true,data:[{id:'scan',status:'completed',created_at:'2026-11-01T12:00:00Z',observationCount:1,error_message:null}]})
})
it.each([
 ['/app','','Overview'], ['/app','#website-audits','Website Audits'], ['/app','#website-checks','Overview'],
 ['/app/signal','','My Websites'], ['/app/signal/history','','My Websites'], ['/app/ai','','Reports & Recommendations'],
 ['/app/ai/result','','Reports & Recommendations'], ['/app/forge/records','','Tasks'], ['/app/pulse','','Requests & Approvals'], ['/app/vault','','Library'],
 ['/app/ai?tab=runs','','Reports & Recommendations'], ['/app/signal/','','My Websites'],
])('highlights exactly one correct destination for %s %s', (path,hash,label) => {
 const active=osNavigation.flatMap(g=>g.items).filter(item=>isOSNavigationActive(item.href,path,hash))
 expect(active.map(item=>item.label)).toEqual([label])
})
it('does not highlight lookalike paths or expose unsupported destinations',()=>{
 expect(osNavigation.flatMap(g=>g.items).filter(item=>isOSNavigationActive(item.href,'/app/forgery'))).toEqual([])
 expect(JSON.stringify(osNavigation)).not.toContain('/app/settings')
 expect(JSON.stringify(osNavigation)).not.toContain('/app/automations')
})
it('places the shell only in the persistent layout, outside all page and loading boundaries',()=>{
 const layout=read('src/app/app/layout.tsx')
 expect(layout).toContain('<OSAppShell>{children}</OSAppShell>')
 for(const page of ['page.tsx','loading.tsx','ai/page.tsx','signal/page.tsx','forge/page.tsx','pulse/page.tsx','vault/page.tsx']) {
  expect(read('src/app/app/'+page)).not.toMatch(/<OSAppShell|<OverviewSidebar|<main/)
 }
 const $=cheerio.load(renderToStaticMarkup(createElement(OSAppShell,{},'Page content')))
 expect($('main.os-content-scroll')).toHaveLength(1)
 expect($('.os-sidebar')).toHaveLength(1)
 expect($('dialog').attr('aria-label')).toBe('Workspace navigation')
 expect($('a[href="#workspace-content"]').text()).toBe('Skip to workspace')
 const css=read('src/app/globals.css')
 expect(css).toContain('.os-app-shell { height: 100dvh; min-height: 0; width: 100%; overflow: hidden; }')
 expect(css).toContain('.os-content-scroll { flex: 1 1 0; min-height: 0; overflow: auto;')
 expect(css).toContain('.os-sidebar { height: 100dvh; max-height: 100dvh; min-height: 0; overflow-y: auto;')
})
it('shows named websites and actionable next steps rather than decorative metrics',async()=>{
 const $=cheerio.load(renderToStaticMarkup(await Overview()))
 expect(listWorkspaceFeedSources).toHaveBeenCalledWith('workspace-a')
 expect($('.os-website-row h3').text()).toBe('business.example.org')
 expect($('body').text()).toContain('No saved check in the recent history')
 expect($('[data-scanner="existing"]')).toHaveLength(1)
 expect($('#website-audits')).toHaveLength(1)
 expect($('#website-checks')).toHaveLength(1)
 expect($('.os-overview-hero')).toHaveLength(0)
 expect($('.os-workspace-snapshot')).toHaveLength(0)
 expect($('a[href="/app/ai?website=source-a"]')).toHaveLength(1)
})
it('reports unavailable reads rather than inventing a clean site',async()=>{
 jest.mocked(listWorkspaceObservations).mockResolvedValue({success:false,error:'Findings unavailable'})
 jest.mocked(listWorkspaceWebsiteScans).mockResolvedValue({success:false,error:'History unavailable'})
 const $=cheerio.load(renderToStaticMarkup(await Overview()))
 expect($('[role="alert"]').text()).toContain('History unavailable')
 expect($('.os-website-row').text()).toContain('could not be loaded')
})
it('does not query website data without an accessible workspace',async()=>{
 jest.mocked(getActiveWorkspace).mockResolvedValue({success:false,error:'No active workspace found.'})
 const $=cheerio.load(renderToStaticMarkup(await Overview()))
 expect(listWorkspaceFeedSources).not.toHaveBeenCalled()
 expect(listWorkspaceObservations).not.toHaveBeenCalled()
 expect($('body').text()).toContain('workspace selection changed')
 expect($('a[href="#website-checks"]')).toHaveLength(0)
})
it('separates failed checks and unverifiable completions from website problems',async()=>{
 jest.mocked(listWorkspaceWebsiteScans).mockResolvedValue({success:true,data:[{id:'failed',status:'failed',created_at:'2026-11-01T12:00:00Z',observationCount:0,error_message:'Fetch unavailable'},{id:'old',status:'completed',created_at:'2026-11-01T11:00:00Z',observationCount:0,error_message:null}]})
 const $=cheerio.load(renderToStaticMarkup(await Overview()))
 expect($('.os-activity-list').text()).toContain('could not finish')
 expect($('.os-activity-list').text()).toContain('No saved findings')
 expect($('.os-activity-list details[open]')).toHaveLength(0)
})
