'use client'
import { useState, type ReactNode } from 'react'
import { OverviewSidebar } from '../OverviewSidebar'
import { useWorkspace } from '../workspace/WorkspaceProvider'

export function OSAppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { workspace } = useWorkspace()
  return <div className="os-app-shell">
    <a href="#workspace-content" className="os-skip-link">Skip to workspace</a>
    <OverviewSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
    <div className="os-workspace">
      <header className="os-workspace-header">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="os-menu-button lg:hidden">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="os-workspace-avatar" aria-hidden="true">{workspace?.name?.slice(0, 1).toUpperCase() ?? 'A'}</span>
          <div className="min-w-0"><p className="os-eyebrow">Your workspace</p><p className="truncate text-sm font-semibold">{workspace?.name ?? 'Welcome to ALYOXA'}</p></div>
        </div>
        {workspace && <span className="os-role-label">{workspace.role === 'owner' ? 'Workspace owner' : workspace.role === 'admin' ? 'Administrator' : 'Workspace member'}</span>}
      </header>
      <main id="workspace-content" tabIndex={-1} className="os-content">{children}</main>
    </div>
  </div>
}
