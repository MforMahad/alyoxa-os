'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { WorkspaceDetails } from '@/actions/workspaces/getWorkspace'

interface WorkspaceContextValue {
  workspace: WorkspaceDetails | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
)

interface WorkspaceProviderProps {
  workspace: WorkspaceDetails | null
  children: ReactNode
}

export function WorkspaceProvider({
  workspace,
  children,
}: WorkspaceProviderProps) {
  return (
    <WorkspaceContext.Provider value={{ workspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error(
      'useWorkspace must be used inside WorkspaceProvider.'
    )
  }

  return context
}