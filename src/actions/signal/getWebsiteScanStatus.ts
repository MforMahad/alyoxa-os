'use server'

import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { createClient } from '@/lib/supabase/server'
import type { LatestWebsiteScanStatus } from './getLatestWebsiteScanStatus'

export type GetWebsiteScanStatusResult =
  | {
      success: true
      data: LatestWebsiteScanStatus | null
    }
  | {
      success: false
      error: string
    }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function getWebsiteScanStatus(
  scanId: string
): Promise<GetWebsiteScanStatusResult> {
  if (!UUID_REGEX.test(scanId)) {
    return { success: false, error: 'Invalid scan identifier provided.' }
  }

  const activeWorkspace = await getActiveWorkspace()

  if (!activeWorkspace.success) {
    return { success: false, error: activeWorkspace.error }
  }

  const supabase = await createClient()

  const { data: scan, error: scanError } = await supabase
    .from('website_scans')
    .select(
      'id, website_id, status, created_at, started_at, completed_at, error_message'
    )
    .eq('id', scanId)
    .maybeSingle()

  if (scanError) {
    console.error('[WorkspaceWebsiteScan] Failed loading requested scan.', {
      code: scanError.code,
    })

    return {
      success: false,
      error: 'Unable to load the requested website scan status.',
    }
  }

  if (!scan) {
    return { success: true, data: null }
  }

  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('id, workspace_id, normalized_domain')
    .eq('id', scan.website_id)
    .eq('workspace_id', activeWorkspace.data.id)
    .maybeSingle()

  if (websiteError) {
    console.error('[WorkspaceWebsiteScan] Failed validating scan workspace.', {
      code: websiteError.code,
    })

    return {
      success: false,
      error: 'Unable to validate the requested scan workspace.',
    }
  }

  if (!website) {
    return { success: true, data: null }
  }

  return {
    success: true,
    data: {
      id: scan.id,
      status: scan.status,
      created_at: scan.created_at,
      started_at: scan.started_at,
      completed_at: scan.completed_at,
      error_message: scan.error_message,
      website_domain: website.normalized_domain,
    },
  }
}