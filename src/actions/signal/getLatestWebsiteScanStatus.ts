'use server'

import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { createClient } from '@/lib/supabase/server'

export interface LatestWebsiteScanStatus {
  id: string
  website_domain: string
  status: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

export type GetLatestWebsiteScanStatusResult =
  | {
      success: true
      data: LatestWebsiteScanStatus | null
    }
  | {
      success: false
      error: string
    }

export async function getLatestWebsiteScanStatus(
  requestedWebsiteDomain?: string
): Promise<GetLatestWebsiteScanStatusResult> {
  const activeWorkspace = await getActiveWorkspace()

  if (!activeWorkspace.success) {
    return {
      success: false,
      error: activeWorkspace.error,
    }
  }

  const websiteUrl = activeWorkspace.data.website_url
  if (!requestedWebsiteDomain && !websiteUrl) {
    return { success: true, data: null }
  }

  let normalizedDomain: string
  try {
    const rawUrl = requestedWebsiteDomain ?? websiteUrl!
    const parsedUrl = new URL(
      rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`
    )
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return {
        success: false,
        error: 'The active workspace website URL is invalid.',
      }
    }
    normalizedDomain = parsedUrl.hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return {
      success: false,
      error: 'The active workspace website URL is invalid.',
    }
  }

  const supabase = await createClient()
  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('id')
    .eq('workspace_id', activeWorkspace.data.id)
    .eq('normalized_domain', normalizedDomain)
    .maybeSingle()

  if (websiteError) {
    console.error('[WorkspaceWebsiteScan] Failed resolving primary website.', {
      code: websiteError.code,
    })
    return {
      success: false,
      error: 'Unable to load the active workspace website status.',
    }
  }

  if (!website) {
    return { success: true, data: null }
  }

  const { data: activeScan, error: activeScanError } = await supabase
    .from('website_scans')
    .select('id, status, created_at, started_at, completed_at, error_message')
    .eq('website_id', website.id)
    .in('status', ['queued', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (activeScanError) {
    console.error('[WorkspaceWebsiteScan] Failed loading active scans.', {
      code: activeScanError.code,
    })
    return {
      success: false,
      error: 'Unable to load the latest website scan status.',
    }
  }

  if (activeScan) {
    return {
      success: true,
      data: { ...activeScan, website_domain: normalizedDomain },
    }
  }

  const { data: scan, error: scanError } = await supabase
    .from('website_scans')
    .select('id, status, created_at, started_at, completed_at, error_message')
    .eq('website_id', website.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (scanError) {
    console.error('[WorkspaceWebsiteScan] Failed loading latest scan.', {
      code: scanError.code,
    })
    return {
      success: false,
      error: 'Unable to load the latest website scan status.',
    }
  }

  return {
    success: true,
    data: scan ? { ...scan, website_domain: normalizedDomain } : null,
  }
}