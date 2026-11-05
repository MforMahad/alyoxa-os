import type { NavigationIcon } from './navigation'
const paths: Record<NavigationIcon, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  website: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c-4 5-4 13 0 18 M12 3c4 5 4 13 0 18',
  audit: 'M14 3H5v18h14V8z M14 3v5h5 M8 12l2 2 5-5 M8 18h7',
  report: 'M4 3h16v18H4z M8 16v-3 M12 16V8 M16 16v-5',
  tasks: 'M9 6h12 M9 12h12 M9 18h12 M3 6l1 1 2-3 M3 12l1 1 2-3 M3 18l1 1 2-3',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M18 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
  library: 'M3 4h5v17H3z M10 4h5v17h-5z M17 5l4-1 3 16-4 1z',
}
export function OSIcon({ name, className = '' }: { name: NavigationIcon; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={paths[name]} /></svg>
}
