import 'server-only'

import { randomUUID } from 'node:crypto'
import { extractWebsitePage, normalizeFetchedUrl, parseWebsiteUrl } from './websiteScanUtils'
import { fetchWebsiteHtml, WebsiteScanError } from './websiteFetch'
import { analyzeWebsiteHtml } from './websiteIntelligence'
import { recommendWebsiteImprovements } from './websiteRecommendations'
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'

const SCAN_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const OBSERVATION_CATEGORY = 'website_content'

type ProcessWebsiteScanResult =
  | { status: 'completed'; scanId: string; observationPublicId: string }
  | { status: 'skipped'; reason: 'invalid_id' | 'not_found' | 'not_queued' }
  | { status: 'failed'; scanId: string }

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
    const analysis = analyzeWebsiteHtml(fetched.body.toString('utf8'), fetched.finalUrl, fetched.headers)
    const ai = await recommendWebsiteImprovements(analysis.evidence, analysis.limitations, analysis.excludedFromAI)
    const extracted = extractWebsitePage(fetched.body.toString('utf8'))
    const observationPublicId = `obs_${randomUUID().replace(/-/g, '')}`
    const description =
      extracted.description || extracted.text || 'Website page fetched successfully.'

    const { data: persistedObservation, error: observationError } = await supabase
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
          version: 2,
          coverage: 'partial',
          scope: 'website_origin',
          limitations: [...analysis.limitations, 'Existing website storage targets the origin; submitted path/query is not snapshotted by the database.'],
          evidence: analysis.evidence,
          ai,
          fetched_url: normalizeFetchedUrl(fetched.finalUrl),
          http_status: fetched.statusCode,
          content_type: fetched.contentType,
          response_bytes: fetched.body.byteLength,
          page_description: extracted.description,
          headings: extracted.headings,
          text_excerpt: extracted.text,
        },
        observed_at: new Date().toISOString(),
      }).select('id, public_id, source_id, website_scan_id').single()

    if (observationError || !persistedObservation?.id || persistedObservation.public_id !== observationPublicId ||
        persistedObservation.source_id !== source.id || persistedObservation.website_scan_id !== existingScan.id) {
      console.error('[WebsiteScanProcessor] Failed persisting observation.', {
        scanId,
        code: observationError?.code, message: observationError?.message, details: observationError?.details,
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
