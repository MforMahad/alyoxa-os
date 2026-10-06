import type { ReactNode } from 'react'

import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { WorkspaceProvider } from '@/components/os/workspace/WorkspaceProvider'

interface AppLayoutProps {
  children: ReactNode
}

export default async function AppLayout({
  children,
}: AppLayoutProps) {
  const result = await getActiveWorkspace()

  const workspace = result.success ? result.data : null

  return (
    <WorkspaceProvider workspace={workspace}>
      {children}
    </WorkspaceProvider>
  )
}