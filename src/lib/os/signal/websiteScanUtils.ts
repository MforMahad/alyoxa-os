import * as cheerio from 'cheerio'
import ipaddr from 'ipaddr.js'
import type { LookupOptions } from 'node:dns'
import { isIP } from 'node:net'
import type { LookupFunction } from 'node:net'

export const WEBSITE_SCAN_MAX_RESPONSE_BYTES = 2 * 1024 * 1024
export const WEBSITE_SCAN_MAX_TEXT_CHARS = 2500

export interface ExtractedWebsitePage {
  title: string
  description: string
  headings: string[]
  text: string
}

export function createPinnedLookup(address: string, family: number): LookupFunction {
  return (_hostname, options: LookupOptions, callback) => {
    if (typeof options === 'object' && options.all) {
      callback(null, [{ address, family }])
      return
    }

    callback(null, address, family)
  }
}

export function parseWebsiteUrl(value: string): URL {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error('Website URL is invalid.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Website URL must use HTTP or HTTPS.')
  }

  if (url.username || url.password) {
    throw new Error('Website URLs containing credentials are not allowed.')
  }

  const expectedPort = url.protocol === 'https:' ? '443' : '80'
  if (url.port && url.port !== expectedPort) {
    throw new Error('Website URL uses a disallowed port.')
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.test') ||
    hostname.endsWith('.invalid') ||
    hostname.endsWith('.example')
  ) {
    throw new Error('Local and reserved website destinations are not allowed.')
  }

  url.hostname = hostname
  url.hash = ''
  return url
}

export function isPublicIpAddress(address: string): boolean {
  try {
    const parsed = ipaddr.parse(address)

    if (parsed.kind() === 'ipv6') {
      const ipv6Address = parsed as ipaddr.IPv6
      if (ipv6Address.isIPv4MappedAddress()) {
        return ipv6Address.toIPv4Address().range() === 'unicast'
      }
    }

    return parsed.range() === 'unicast'
  } catch {
    return false
  }
}

export function extractWebsitePage(html: string): ExtractedWebsitePage {
  const $ = cheerio.load(html)
  const title = normalizeText($('title').first().text()).slice(0, 250)
  const description = normalizeText(
    $('meta[name="description" i]').first().attr('content') ?? ''
  ).slice(0, 500)

  $('script, style, noscript, svg, template, iframe').remove()

  const headings = $('h1, h2, h3')
    .toArray()
    .map((heading) => normalizeText($(heading).text()).slice(0, 160))
    .filter(Boolean)
    .slice(0, 8)

  const text = normalizeText($('body').text()).slice(0, WEBSITE_SCAN_MAX_TEXT_CHARS)
  const usefulText = text || description || headings.join('. ')

  return {
    title: title || headings[0] || 'Website page',
    description,
    headings,
    text: usefulText,
  }
}

export function normalizeFetchedUrl(url: URL): string {
  return `${url.origin}${url.pathname}`.slice(0, 2048)
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function isIpLiteral(hostname: string): boolean {
  return isIP(hostname.replace(/^\[|\]$/g, '')) !== 0
}