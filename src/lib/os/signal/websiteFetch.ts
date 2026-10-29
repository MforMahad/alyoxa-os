import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { IncomingMessage } from 'node:http'
import type { RequestOptions as HttpsRequestOptions } from 'node:https'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { createPinnedLookup, isIpLiteral, isPublicIpAddress, parseWebsiteUrl, WEBSITE_SCAN_MAX_RESPONSE_BYTES } from './websiteScanUtils'
import { evaluateRobotsPolicy } from './websiteIntelligence'
const REQUEST_TIMEOUT_MS = 8000
const MAX_REDIRECTS = 4
interface PinnedAddress { address: string; family: number }
export interface FetchResponse { body: Buffer; contentType: string; finalUrl: URL; statusCode: number; headers: Record<string, string | string[] | undefined> }
export class WebsiteScanError extends Error {}
export async function fetchWebsiteHtml(startUrl: URL): Promise<FetchResponse> {
  let currentUrl = startUrl
  const deadline = Date.now() + REQUEST_TIMEOUT_MS

  for (let redirectCount = 0; ; redirectCount += 1) {
    const remainingMs = deadline - Date.now()
    if (remainingMs <= 0) {
      throw new WebsiteScanError('Website request timed out.')
    }

    const address = await resolvePublicAddress(currentUrl.hostname, remainingMs)
    await checkRobots(currentUrl, deadline)
    const response = await requestPage(currentUrl, address, Math.max(1, deadline - Date.now()))

    if ('redirectLocation' in response) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw new WebsiteScanError('Website redirected too many times.')
      }

      try {
        currentUrl = parseWebsiteUrl(new URL(response.redirectLocation, currentUrl).toString())
      } catch (error) {
        throw error instanceof WebsiteScanError
          ? error
          : new WebsiteScanError('Website redirected to an invalid URL.')
      }
      continue
    }

    return { ...response, finalUrl: currentUrl }
  }
}

async function resolvePublicAddress(
  hostname: string,
  timeoutMs: number
): Promise<PinnedAddress> {
  const unwrappedHostname = hostname.replace(/^\[|\]$/g, '')

  try {
    const addresses = isIpLiteral(unwrappedHostname)
      ? [{ address: unwrappedHostname, family: isIP(unwrappedHostname) }]
      : await withTimeout(
          lookup(unwrappedHostname, { all: true, verbatim: true }),
          timeoutMs
        )

    if (!addresses.length || addresses.some(({ address }) => !isPublicIpAddress(address))) {
      throw new WebsiteScanError('Website resolves to a non-public network address.')
    }

    const selected = addresses[0]
    return { address: selected.address, family: selected.family }
  } catch (error) {
    if (error instanceof WebsiteScanError) {
      throw error
    }
    throw new WebsiteScanError('Website hostname could not be safely resolved.')
  }
}

function requestPage(
  url: URL,
  address: PinnedAddress,
  timeoutMs: number,
  robots = false,
): Promise<
  | { redirectLocation: string }
  | { body: Buffer; contentType: string; statusCode: number; headers: Record<string, string | string[] | undefined> }
> {
  return new Promise((resolve, reject) => {
    let settled = false
    let receivedBytes = 0
    const chunks: Buffer[] = []
    const requestFunction = url.protocol === 'https:' ? httpsRequest : httpRequest
    const pinnedLookup = createPinnedLookup(address.address, address.family)

    const requestOptions: HttpsRequestOptions = {
      agent: false,
      headers: {
        accept: robots ? 'text/plain, */*;q=0.1' : 'text/html, application/xhtml+xml;q=0.9',
        'accept-encoding': 'identity',
        'user-agent': 'ALYOXA-WebsiteScanner/1.0',
      },
      lookup: pinnedLookup,
      servername: isIpLiteral(url.hostname) ? undefined : url.hostname,
    }

    const req = requestFunction(url, requestOptions, (response: IncomingMessage) => {
      const statusCode = response.statusCode ?? 0
      const redirectLocation = response.headers.location

      if ([301, 302, 303, 307, 308].includes(statusCode) && redirectLocation) {
        response.destroy()
        settle(() => resolve({ redirectLocation }))
        return
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.destroy()
        settle(() => reject(new WebsiteScanError(`Website returned HTTP ${statusCode}.`)))
        return
      }

      const contentType = response.headers['content-type']?.toLowerCase() ?? ''
      if (!robots && !/^text\/html(?:\s*;|$)|^application\/xhtml\+xml(?:\s*;|$)/.test(contentType)) {
        response.destroy()
        settle(() => reject(new WebsiteScanError('Website response is not HTML.')))
        return
      }

      const contentEncoding = response.headers['content-encoding']?.toLowerCase()
      if (contentEncoding && contentEncoding !== 'identity') {
        response.destroy()
        settle(() => reject(new WebsiteScanError('Website response encoding is not supported.')))
        return
      }

      const contentLength = Number(response.headers['content-length'])
      if (Number.isFinite(contentLength) && contentLength > WEBSITE_SCAN_MAX_RESPONSE_BYTES) {
        response.destroy()
        settle(() => reject(new WebsiteScanError('Website response exceeded the size limit.')))
        return
      }

      response.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        receivedBytes += buffer.byteLength

        if (receivedBytes > WEBSITE_SCAN_MAX_RESPONSE_BYTES) {
          req.destroy(new Error('Response size limit exceeded.'))
          settle(() => reject(new WebsiteScanError('Website response exceeded the size limit.')))
          return
        }

        chunks.push(buffer)
      })

      response.on('end', () => {
        settle(() =>
          resolve({ body: Buffer.concat(chunks), contentType, statusCode, headers: response.headers })
        )
      })

      response.on('error', () => {
        settle(() => reject(new WebsiteScanError('Website response could not be read.')))
      })
    })

    const timer = setTimeout(() => {
      req.destroy(new Error('Website request timed out.'))
      settle(() => reject(new WebsiteScanError('Website request timed out.')))
    }, timeoutMs)

    req.on('error', () => {
      settle(() => reject(new WebsiteScanError('Website request failed.')))
    })
    req.on('close', () => clearTimeout(timer))
    req.end()

    function settle(action: () => void) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      action()
    }
  })
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new WebsiteScanError('Website hostname resolution timed out.')),
      timeoutMs
    )

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        reject(new WebsiteScanError('Website hostname could not be safely resolved.'))
      }
    )
  })
}
async function checkRobots(url: URL, deadline: number): Promise<void> {
  let current = new URL('/robots.txt', url)
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new WebsiteScanError('Robots verification timed out.')
    const address = await resolvePublicAddress(current.hostname, remaining)
    let response
    try { response = await requestPage(current, address, Math.max(1, deadline - Date.now()), true) }
    catch (error) {
      if (error instanceof Error && /HTTP (404|410)\./.test(error.message)) return
      throw new WebsiteScanError('Robots directives could not be verified; content was not fetched.')
    }
    if ('redirectLocation' in response) {
      current = parseWebsiteUrl(new URL(response.redirectLocation, current).toString())
      continue
    }
    const body = response.body.toString('utf8')
    if (response.contentType.includes('text/html') || /^\s*</.test(body)) throw new WebsiteScanError('Robots response was not a readable policy; content was not fetched.')
    const policy = evaluateRobotsPolicy(body, url)
    if (!policy.allowed) throw new WebsiteScanError('Website robots directives disallow this page; content was not fetched.')
    const delayMs = policy.crawlDelaySeconds * 1000
    if (!Number.isFinite(delayMs) || delayMs >= deadline - Date.now()) throw new WebsiteScanError('Robots crawl delay exceeds the fetch budget; content was not fetched.')
    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs))
    return
  }
  throw new WebsiteScanError('Robots redirected too many times.')
}
