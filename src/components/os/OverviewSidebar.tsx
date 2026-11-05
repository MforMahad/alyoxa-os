'use client'
import { useEffect, useRef, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { osNavigation, isOSNavigationActive } from './shell/navigation'
import { OSIcon } from './shell/OSIcon'
import { useLocationHash } from './shell/useLocationHash'

interface Props { mobileOpen?: boolean; onCloseMobile?: () => void }
export function OverviewSidebar({ mobileOpen = false, onCloseMobile }: Props) {
  const pathname = usePathname()
  const hash = useLocationHash()
  const dialog = useRef<HTMLDialogElement>(null)
  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0 && href.split('#')[0] === pathname && pathname === '/app') {
      event.preventDefault()
      window.history.pushState(null, '', href)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
    onCloseMobile?.()
  }
  useEffect(() => {
    const element = dialog.current
    if (mobileOpen && element && !element.open) element.showModal()
    if (!mobileOpen && element?.open) element.close()
  }, [mobileOpen])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches && dialog.current?.open) { dialog.current.close(); onCloseMobile?.() } }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [onCloseMobile])
  useEffect(() => {
    const close = () => onCloseMobile?.()
    window.addEventListener('popstate', close)
    return () => window.removeEventListener('popstate', close)
  }, [onCloseMobile])
  const content = <div className="os-sidebar-content">
    <Link href="/app" className="os-brand" onClick={event => navigate(event, '/app')} aria-label="ALYOXA OS overview"><span className="os-brand-mark" aria-hidden="true">A</span><span>ALYOXA <span className="os-brand-suffix">OS</span></span></Link>
    <p className="os-sidebar-caption">Websites, work and knowledge.</p>
    {osNavigation.map(group => <nav key={group.label} aria-label={group.label} className="os-nav-group">
      <p className="os-nav-label">{group.label}</p>
      {group.items.map(item => {
        return <Link key={item.href} href={item.href} scroll={false} onClick={event => navigate(event, item.href)}
        aria-current={isOSNavigationActive(item.href, pathname, hash) ? 'page' : undefined} className="os-nav-link">
        <OSIcon name={item.icon} className="os-nav-icon" /><span>{item.label}</span>
      </Link>})}
    </nav>)}
    <div className="os-sidebar-footer">ALYOXA OS · Your business workspace</div>
  </div>
  return <>
    <aside className="os-sidebar hidden lg:block">{content}</aside>
    <dialog ref={dialog} aria-label="Workspace navigation" className="os-mobile-nav lg:hidden" onCancel={onCloseMobile} onClose={onCloseMobile}>
      <button className="os-mobile-close" onClick={onCloseMobile} aria-label="Close navigation">&times;</button>{content}
    </dialog>
  </>
}
