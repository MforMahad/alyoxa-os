'use client'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { OverviewSidebar } from '../OverviewSidebar'
import { useWorkspace } from '../workspace/WorkspaceProvider'
import { useLocationHash } from './useLocationHash'

function ContentPosition({ content }: { content: React.RefObject<HTMLElement | null> }) {
  const path = usePathname()
  const search = useSearchParams().toString()
  const hash = useLocationHash()
  useEffect(() => {
    let id = ''
    try { id = hash ? decodeURIComponent(hash.slice(1)) : '' } catch { /* Ignore malformed URL fragments. */ }
    const scrollToTarget = () => {
      const target = id ? document.getElementById(id) : null
      target?.scrollIntoView({ block: 'start' })
      return Boolean(target)
    }
    if (scrollToTarget()) return
    content.current?.scrollTo({ top: 0 })
    // The loading boundary may still be showing content without the anchor.
    // Wait for that page, without replacing or remounting the shell.
    if (!id || !content.current) return
    const observer = new MutationObserver(() => { if (scrollToTarget()) observer.disconnect() })
    observer.observe(content.current, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [path, search, hash, content])
  return null
}

export function OSAppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { workspace } = useWorkspace()
  const content = useRef<HTMLElement>(null)
  return <div className="os-app-shell">
    <a href="#workspace-content" className="os-skip-link">Skip to workspace</a>
    <Suspense fallback={<aside className="os-sidebar hidden lg:block" aria-label="Loading navigation" />}><OverviewSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} /></Suspense>
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
      <main ref={content} id="workspace-content" tabIndex={-1} className="os-content-scroll"><div className="os-content">{children}</div></main>
      <Suspense fallback={null}><ContentPosition content={content} /></Suspense>
    </div>
  </div>
}
