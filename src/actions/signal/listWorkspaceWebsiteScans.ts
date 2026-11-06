'use server'

import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { createClient } from '@/lib/supabase/server'

function websiteString(value: unknown, key: 'entry_url' | 'normalized_domain') {
  const row = Array.isArray(value) ? value[0] : value
  return row && typeof row === 'object' && key in row && typeof row[key] === 'string' ? row[key] : ''
}

export async function listWorkspaceWebsiteScans() {
  const workspace = await getActiveWorkspace()
  if (!workspace.success) return { success: false as const, error: workspace.error }
  const client = await createClient()
  const { data, error } = await client.from('website_scans').select(`
    id, status, created_at, completed_at, error_message,
    website:websites!inner(normalized_domain, workspace_id, entry_url),
    observations:signal_observations(id)
  `).eq('website.workspace_id', workspace.data.id).order('created_at', { ascending: false }).limit(50)
  if (error) return { success: false as const, error: 'Website scan history could not be loaded.' }
  return { success: true as const, data: (data ?? []).map(scan => ({
    id: scan.id as string, status: scan.status as string, created_at: scan.created_at as string,
    error_message: scan.error_message as string | null,
    entry_url: websiteString(scan.website, 'entry_url'),
    normalized_domain: websiteString(scan.website, 'normalized_domain'),
    observationCount: Array.isArray(scan.observations) ? scan.observations.length : 0,
  })) }
}
