import * as cheerio from 'cheerio'
import { canonicalizeWebsiteUrl } from '../websiteScanUrl'
import type { AuditLink } from './contracts'

export function auditUrl(input: string, origin: string, base = origin + '/'): string {
  const url = canonicalizeWebsiteUrl(new URL(input, base).toString()).url
  if (url.origin !== origin) throw new Error('outside_audit_origin')
  return url.toString()
}

/** At most 200 anchors examined and 100 candidates returned; no forms, assets or JS. */
export function discoverAuditLinks(html: string, pageUrl: string, origin: string) {
  const $ = cheerio.load(html)
  let base = pageUrl
  // Resolve browser-style first, then enforce scope on each result. Ignoring an
  // external base would invent same-origin destinations for external links.
  const declared = $('base[href]').first().attr('href')
  if (declared) {
    try { base = new URL(declared, pageUrl).toString() }
    catch { return { links: [] as AuditLink[], truncated: true, excluded: 0 } }
  }
  const anchors = $('a[href]').toArray()
  const links = new Map<string, AuditLink>()
  let excluded = 0
  for (const element of anchors.slice(0, 200)) {
    try {
      const raw = $(element).attr('href') ?? ''
      if (!raw || raw.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(raw) || $(element).attr('download') !== undefined) { excluded++; continue }
      const url = auditUrl(raw, origin, base)
      if (/\.(?:pdf|zip|png|jpe?g|gif|svg|mp4|css|js)$/i.test(new URL(url).pathname)) { excluded++; continue }
      const priority = $(element).closest('nav,header').length ? 10 : 50
      const previous = links.get(url)
      if (!previous || priority < previous.priority) links.set(url, { url, priority })
    } catch { excluded++ }
  }
  let bytes = 0
  let truncated = anchors.length > 200 || links.size > 100
  const selected: AuditLink[] = []
  for (const link of [...links.values()].sort((a, b) => a.priority - b.priority || a.url.localeCompare(b.url))) {
    bytes += Buffer.byteLength(link.url) + 64
    if (selected.length >= 100 || bytes > 32000) { truncated = true; break }
    selected.push(link)
  }
  return { links: selected, truncated, excluded }
}
