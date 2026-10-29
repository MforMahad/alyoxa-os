jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/actions/signal/submitWebsiteAnalysis', () => ({ submitWebsiteAnalysis: jest.fn() }))
jest.mock('@/actions/signal/getLatestWebsiteScanStatus', () => ({ getLatestWebsiteScanStatus: jest.fn() }))
jest.mock('@/actions/signal/getWebsiteScanStatus', () => ({ getWebsiteScanStatus: jest.fn() }))
jest.mock('@/components/os/workspace/WorkspaceProvider', () => ({ useWorkspace: jest.fn() }))

import WorkspaceSignalEntry from '@/components/os/workspace/WorkspaceSignalEntry'
import { useWorkspace } from '@/components/os/workspace/WorkspaceProvider'

it('uses a distinct React state boundary for each active workspace', () => {
  jest.mocked(useWorkspace).mockReturnValue({ workspace: { id: 'workspace-a' } } as never)
  const first = WorkspaceSignalEntry()
  jest.mocked(useWorkspace).mockReturnValue({ workspace: { id: 'workspace-b' } } as never)
  const second = WorkspaceSignalEntry()
  expect(first.key).toBe('workspace-a')
  expect(second.key).toBe('workspace-b')
  expect(second.type).toBe(first.type)
})
