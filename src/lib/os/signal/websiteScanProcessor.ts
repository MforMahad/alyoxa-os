import 'server-only'

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { IncomingMessage } from 'node:http'
import type { RequestOptions as HttpsRequestOptions } from 'node:https'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { randomUUID } from 'node:crypto'
import {
  createPinnedLookup,
  extractWebsitePage,
  isIpLiteral,
  isPublicIpAddress,
  normalizeFetchedUrl,
  parseWebsiteUrl,
  WEBSITE_SCAN_MAX_RESPONSE_BYTES,
} from './websiteScanUtils'
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'

const SCAN_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REQUEST_TIMEOUT_MS = 8000
const MAX_REDIRECTS = 4
const OBSERVATION_CATEGORY = 'website_content'

type ProcessWebsiteScanResult =
  | { status: 'completed'; scanId: string; observationPublicId: string }
  | { status: 'skipped'; reason: 'invalid_id' | 'not_found' | 'not_queued' }
  | { status: 'failed'; scanId: string }

interface PinnedAddress {
  address: string
  family: number
}

interface FetchResponse {
  body: Buffer
  contentType: string
  finalUrl: URL
  statusCode: number
}

class WebsiteScanError extends Error {}

export async function processWebsiteScan(
  scanId: string
): Promise<ProcessWebsiteScanResult> {
  if (!SCAN_ID_REGEX.test(scanId)) {
    return { status: 'skipped', reason: 'invalid_id' }
  }

  const supabase = createServiceRoleClient()
  const { data: existingScan, error: loadError } = await supabase
    .from('website_scans')
    .select('id, public_id, website_id, status')
    .eq('id', scanId)
    .maybeSingle()

  if (loadError) {
    console.error('[WebsiteScanProcessor] Failed loading scan.', {
      scanId,
      code: loadError.code,
    })
    return { status: 'failed', scanId }
  }

  if (!existingScan) {
    return { status: 'skipped', reason: 'not_found' }
  }

  if (existingScan.status !== 'queued') {
    return { status: 'skipped', reason: 'not_queued' }
  }

  const startedAt = new Date().toISOString()
  const { data: claimedScan, error: claimError } = await supabase
    .from('website_scans')
    .update({
      status: 'processing',
      started_at: startedAt,
      completed_at: null,
      error_message: null,
    })
    .eq('id', scanId)
    .eq('status', 'queued')
    .select('id')
    .maybeSingle()

  if (claimError) {
    console.error('[WebsiteScanProcessor] Failed claiming scan.', {
      scanId,
      code: claimError.code,
    })
    return { status: 'failed', scanId }
  }

  if (!claimedScan) {
    return { status: 'skipped', reason: 'not_queued' }
  }

  try {
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, workspace_id, entry_url, normalized_domain')
      .eq('id', existingScan.website_id)
      .maybeSingle()

    if (websiteError || !website) {
      throw new WebsiteScanError('The website for this scan could not be loaded.')
    }

    if (!website.entry_url || typeof website.entry_url !== 'string') {
      throw new WebsiteScanError('The website has no valid entry URL.')
    }

    const websiteUrl = parseWebsiteUrl(website.entry_url)
    const entryHostname = websiteUrl.hostname
      .replace(/^\[|\]$/g, '')
      .replace(/\.$/, '')
      .toLowerCase()
    if (entryHostname !== website.normalized_domain.toLowerCase()) {
      throw new WebsiteScanError('The website URL does not match its configured domain.')
    }

    const expectedSourceKey = `website:${website.normalized_domain}`
    const { data: source, error: sourceError } = await supabase
      .from('signal_feed_sources')
      .select('id, workspace_id, source_type, source_key')
      .eq('workspace_id', website.workspace_id)
      .eq('source_type', 'website')
      .eq('source_key', expectedSourceKey)
      .maybeSingle()

    if (sourceError || !source) {
      throw new WebsiteScanError('The website Signal source could not be resolved.')
    }

    if (
      source.workspace_id !== website.workspace_id ||
      source.source_type !== 'website' ||
      source.source_key !== expectedSourceKey
    ) {
      throw new WebsiteScanError('The website Signal source relationship is invalid.')
    }

    const fetched = await fetchWebsiteHtml(websiteUrl)
    const extracted = extractWebsitePage(fetched.body.toString('utf8'))
    const observationPublicId = `obs_${randomUUID().replace(/-/g, '')}`
    const description =
      extracted.description || extracted.text || 'Website page fetched successfully.'

    const { error: observationError } = await supabase
      .from('signal_observations')
      .insert({
        public_id: observationPublicId,
        source_id: source.id,
        website_scan_id: existingScan.id,
        source_event_id: `website_scan:${existingScan.public_id}`,
        severity: 'low',
        category: OBSERVATION_CATEGORY,
        title: extracted.title,
        description: description.slice(0, 5000),
        metadata: {
          version: 1,
          fetched_url: normalizeFetchedUrl(fetched.finalUrl),
          http_status: fetched.statusCode,
          content_type: fetched.contentType,
          response_bytes: fetched.body.byteLength,
          page_description: extracted.description,
          headings: extracted.headings,
          text_excerpt: extracted.text,
        },
        observed_at: new Date().toISOString(),
      })

    if (observationError) {
      console.error('[WebsiteScanProcessor] Failed persisting observation.', {
        scanId,
        code: observationError.code,
      })
      throw new WebsiteScanError('The website observation could not be saved.')
    }

    const completedAt = new Date().toISOString()
    const { data: completedScan, error: completeError } = await supabase
      .from('website_scans')
      .update({ status: 'completed', completed_at: completedAt, error_message: null })
      .eq('id', scanId)
      .eq('status', 'processing')
      .select('id')
      .maybeSingle()

    if (completeError || !completedScan) {
      console.error('[WebsiteScanProcessor] Failed completing scan.', {
        scanId,
        code: completeError?.code,
      })
      throw new WebsiteScanError('The website scan could not be completed.')
    }

    return { status: 'completed', scanId, observationPublicId }
  } catch (error) {
    const errorMessage =
      error instanceof WebsiteScanError
        ? error.message
        : 'The website could not be fetched or processed.'

    if (!(error instanceof WebsiteScanError)) {
      console.error('[WebsiteScanProcessor] Unexpected scan failure.', { scanId })
    }

    const { data: failedScan, error: failureUpdateError } = await supabase
      .from('website_scans')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage.slice(0, 1000),
      })
      .eq('id', scanId)
      .eq('status', 'processing')
      .select('id')
      .maybeSingle()

    if (failureUpdateError || !failedScan) {
      console.error('[WebsiteScanProcessor] Failed recording scan failure.', {
        scanId,
        code: failureUpdateError?.code,
      })
    }

    return { status: 'failed', scanId }
  }
}

async function fetchWebsiteHtml(startUrl: URL): Promise<FetchResponse> {
  let currentUrl = startUrl
  const deadline = Date.now() + REQUEST_TIMEOUT_MS

  for (let redirectCount = 0; ; redirectCount += 1) {
    const remainingMs = deadline - Date.now()
    if (remainingMs <= 0) {
      throw new WebsiteScanError('Website request timed out.')
    }

    const address = await resolvePublicAddress(currentUrl.hostname, remainingMs)
    const response = await requestPage(currentUrl, address, remainingMs)

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
  timeoutMs: number
): Promise<
  | { redirectLocation: string }
  | { body: Buffer; contentType: string; statusCode: number }
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
        accept: 'text/html, application/xhtml+xml;q=0.9',
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
        response.resume()
        settle(() => resolve({ redirectLocation }))
        return
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume()
        settle(() => reject(new WebsiteScanError(`Website returned HTTP ${statusCode}.`)))
        return
      }

      const contentType = response.headers['content-type']?.toLowerCase() ?? ''
      if (!/^text\/html(?:\s*;|$)|^application\/xhtml\+xml(?:\s*;|$)/.test(contentType)) {
        response.resume()
        settle(() => reject(new WebsiteScanError('Website response is not HTML.')))
        return
      }

      const contentEncoding = response.headers['content-encoding']?.toLowerCase()
      if (contentEncoding && contentEncoding !== 'identity') {
        response.resume()
        settle(() => reject(new WebsiteScanError('Website response encoding is not supported.')))
        return
      }

      const contentLength = Number(response.headers['content-length'])
      if (Number.isFinite(contentLength) && contentLength > WEBSITE_SCAN_MAX_RESPONSE_BYTES) {
        response.resume()
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
          resolve({ body: Buffer.concat(chunks), contentType, statusCode })
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