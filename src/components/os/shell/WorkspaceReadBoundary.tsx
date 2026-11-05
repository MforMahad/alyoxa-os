'use client'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '../workspace/WorkspaceProvider'

/** A persistent shell must never label another workspace's page as its own. */
export function WorkspaceReadBoundary({ workspaceId, children }: { workspaceId: string | null; children: ReactNode }) {
  const { workspace } = useWorkspace()
  const router = useRouter()
  if (workspaceId !== (workspace?.id ?? null)) return <section className="os-panel os-empty-state" role="alert"><h2>Your workspace selection changed</h2><p>Refresh this view before showing website results for the selected workspace.</p><button type="button" className="os-button os-button-teal" onClick={() => router.refresh()}>Refresh workspace</button></section>
  return children
}
