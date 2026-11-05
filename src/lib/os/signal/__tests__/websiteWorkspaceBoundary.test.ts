jest.mock('next/navigation', () => ({ useRouter: jest.fn(), usePathname: () => '/app' }))
jest.mock('@/actions/signal/submitWebsiteAnalysis', () => ({ submitWebsiteAnalysis: jest.fn() }))
jest.mock('@/actions/signal/getLatestWebsiteScanStatus', () => ({ getLatestWebsiteScanStatus: jest.fn() }))
jest.mock('@/actions/signal/getWebsiteScanStatus', () => ({ getWebsiteScanStatus: jest.fn() }))
jest.mock('@/components/os/workspace/WorkspaceProvider', () => ({ useWorkspace: jest.fn() }))

import WorkspaceSignalEntry from '@/components/os/workspace/WorkspaceSignalEntry'
import { useWorkspace } from '@/components/os/workspace/WorkspaceProvider'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

it('uses a distinct React state boundary for each active workspace', () => {
  jest.mocked(useWorkspace).mockReturnValue({ workspace: { id: 'workspace-a' } } as never)
  const first = WorkspaceSignalEntry()
  jest.mocked(useWorkspace).mockReturnValue({ workspace: { id: 'workspace-b' } } as never)
  const second = WorkspaceSignalEntry()
  expect(first.key).toBe('workspace-a')
  expect(second.key).toBe('workspace-b')
  expect(second.type).toBe(first.type)
})

it('renders Quick Scan without revealing Full Audit before server activation', () => {
  jest.mocked(useWorkspace).mockReturnValue({ workspace: { id: 'workspace-a', name: 'Workspace A', website_url: '' } } as never)
  const html = renderToStaticMarkup(createElement(WorkspaceSignalEntry))
  expect(html).toContain('Primary website')
  expect(html).not.toContain('Full Website Audit')
  expect(html).not.toContain('Website scan mode')
})
