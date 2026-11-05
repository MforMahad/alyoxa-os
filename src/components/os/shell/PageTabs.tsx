'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
export function PageTabs({ label, items, active }: { label: string; items: { id: string; label: string; href: string }[]; active: string }) {
  const current = useSearchParams()
  return <nav aria-label={label} className="os-page-tabs">{items.map(item => {
    const [path, query] = item.href.split('?')
    const params = new URLSearchParams(current.toString())
    new URLSearchParams(query).forEach((value, key) => params.set(key, value))
    return <Link key={item.id} href={path + '?' + params.toString()} scroll={false} aria-current={active === item.id ? 'page' : undefined}>{item.label}</Link>
  })}</nav>
}
