import * as cheerio from 'cheerio'
import { canonicalizeWebsiteUrl } from './websiteScanUrl'
import type { WebsiteEvidence } from './websiteIntelligence'

export const SITEMAP_MAX_BYTES = 262144
export interface SiteResourceCheck {
  kind: 'robots' | 'sitemap'
  url: string
  final_url: string | null
  http_status: number | null
  status: string
  sitemap_refs?: string[]
  document_type?: 'urlset' | 'sitemapindex'
  url_count?: number
  references?: string[]
  truncated?: boolean
  limitation?: string
  checked_at?: string
}
export interface SiteResourceRequest {
  url: string
  fetch_url: string
  redirect_count: number
  visited: string[]
}

function boundedUrls(values: string[]) {
  const result: string[] = []
  let bytes = 0
  for (const value of values) {
    if (result.length >= 10 || bytes + Buffer.byteLength(value) > 8000) break
    if (value.length > 2048 || result.includes(value)) continue
    try {
      const url = canonicalizeWebsiteUrl(value).canonicalUrl
      if (!result.includes(url)) { result.push(url); bytes += Buffer.byteLength(url) }
    } catch { /* Retain only supported HTTP(S) references; never fetch here. */ }
  }
  return result
}

/** Parse declarations only, including external references without following them. */
export function robotsSiteCheck(body: string, requestedUrl: string, finalUrl: string | null, status: number | null, state = 'available'): SiteResourceCheck {
  const declarations = [...body.matchAll(/^[ \t]*Sitemap:[ \t]*(\S+)(?:[ \t]+#.*)?[ \t]*$/gim)].slice(0, 21).map(m => m[1])
  const references = boundedUrls(declarations)
  return { kind: 'robots', url: requestedUrl, final_url: finalUrl, http_status: status, status: state,
    sitemap_refs: references, truncated: declarations.length > references.length }
}

/** Existing Cheerio XML mode does not resolve external entities. Reject declarations
 * before parsing and bound bytes/tags regardless; no XML schema validation claimed. */
export function sitemapSiteCheck(body: Buffer, requestedUrl: string, finalUrl: string, httpStatus: number): SiteResourceCheck {
  const base: SiteResourceCheck = { kind: 'sitemap', url: requestedUrl, final_url: finalUrl, http_status: httpStatus, status: 'unrecognized_xml' }
  if (body.length > SITEMAP_MAX_BYTES) return { ...base, status: 'size_limit' }
  const xml = body.toString('utf8')
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) return { ...base, status: 'unsafe_xml_declaration' }
  if ((xml.match(/</g)?.length ?? 0) > 10000) return { ...base, status: 'element_limit' }
  const encoding = xml.match(/<\?xml[^?]*encoding\s*=\s*['"]([^'"]+)/i)?.[1]
  if (encoding && !/^(?:utf-8|us-ascii)$/i.test(encoding)) return { ...base, status: 'unsupported_encoding' }
  const $ = cheerio.load(xml, { xml: true })
  const root = $.root().children().first()
  const localName = (node: unknown) => node && typeof node === 'object' && 'name' in node && typeof node.name === 'string' ? node.name.split(':').pop() : ''
  const type = localName(root[0])
  if (!['urlset', 'sitemapindex'].includes(type ?? '') || $.root().children().length !== 1) return base
  const entries = root.children().toArray().filter(node => localName(node) === (type === 'urlset' ? 'url' : 'sitemap'))
  const locations = entries.slice(0, 100).flatMap(node => $(node).children().toArray().filter(child => localName(child) === 'loc').slice(0, 1).map(child => $(child).text().trim()))
  return { ...base, status: 'parsed', document_type: type as 'urlset' | 'sitemapindex', url_count: entries.length,
    references: boundedUrls(locations), truncated: entries.length > 10,
    limitation: 'Bounded XML structure inspection; well-formedness/schema validity and listed URLs are not verified. Index references are not followed.' }
}

export function siteCheckEvidence(checks: SiteResourceCheck[]): WebsiteEvidence[] {
  return checks.flatMap((check, index) => {
    const prefix = check.kind === 'robots' ? 'robots' : `sitemap_${index}`
    const title = check.kind === 'robots' ? 'robots.txt' : `Sitemap ${check.url}`
    const evidence: WebsiteEvidence[] = [
      { id: `${prefix}_status`, label: `${title} check`, value: check.status },
      { id: `${prefix}_http_status`, label: `${title} HTTP status`, value: check.http_status ?? 'Not recorded' },
      { id: `${prefix}_final_url`, label: `${title} final URL`, value: check.final_url ?? 'Not recorded' },
    ]
    if (check.sitemap_refs) evidence.push({ id: `${prefix}_sitemaps`, label: 'Declared Sitemap references (bounded)', value: check.sitemap_refs.join('\n').slice(0, 2000) })
    if (check.document_type) evidence.push({ id: `${prefix}_type`, label: `${title} document type`, value: check.document_type })
    if (typeof check.url_count === 'number') evidence.push({ id: `${prefix}_url_count`, label: `${title} entries observed`, value: check.url_count })
    return evidence
  })
}
