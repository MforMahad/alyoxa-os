'use client'
import { useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  window.addEventListener('popstate', callback)
  return () => { window.removeEventListener('hashchange', callback); window.removeEventListener('popstate', callback) }
}
export function useLocationHash() {
  // Route changes must also re-read the hash after Next's client navigation.
  usePathname()
  return useSyncExternalStore(subscribe, () => window.location.hash, () => '')
}
