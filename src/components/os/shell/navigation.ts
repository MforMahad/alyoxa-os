export type NavigationIcon = 'overview' | 'website' | 'audit' | 'report' | 'tasks' | 'people' | 'library'
export interface OSNavigationItem { label: string; href: string; icon: NavigationIcon }
/** Capability groups are independent of the underlying five module boundaries. */
export const osNavigation: { label: string; items: OSNavigationItem[] }[] = [
  { label: 'Workspace', items: [
    { label: 'Overview', href: '/app', icon: 'overview' },
    { label: 'My Websites', href: '/app/signal?tab=sources', icon: 'website' },
    { label: 'Website Audits', href: '/app#website-audits', icon: 'audit' },
    { label: 'Reports & Recommendations', href: '/app/ai', icon: 'report' },
  ] },
  { label: 'Workspace tools', items: [
    { label: 'Tasks', href: '/app/forge', icon: 'tasks' },
    { label: 'Requests & Approvals', href: '/app/pulse', icon: 'people' },
    { label: 'Library', href: '/app/vault', icon: 'library' },
  ] },
]

export function isOSNavigationActive(href: string, pathname: string, hash = '') {
  pathname = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  const [path, anchor] = href.split('#')
  if (anchor) return path === pathname && hash === '#' + anchor
  const base = path.split('?')[0]
  const matches = base === '/app' ? pathname === base : pathname === base || pathname.startsWith(base + '/')
  return matches && !(pathname === '/app' && hash === '#website-audits')
}
