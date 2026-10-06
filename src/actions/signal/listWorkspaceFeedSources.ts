'use server'

import { getActiveWorkspaceScope } from '@/actions/workspaces/getActiveWorkspaceScope'
import { createClient } from '@/lib/supabase/server'
import type { PersistedSignalFeedSource } from '@/data/os/signal'

export type ListWorkspaceFeedSourcesResult =
  | {
      success: true
      data: PersistedSignalFeedSource[]
    }
  | {
      success: false
      error: string
    }

export async function listWorkspaceFeedSources(
  workspaceIdHint?: string
): Promise<ListWorkspaceFeedSourcesResult> {
  const activeWorkspace = await getActiveWorkspaceScope(workspaceIdHint)

  if (!activeWorkspace.success) {
    return {
      success: false,
      error: activeWorkspace.error,
    }
  }

  const supabase = await createClient()
  if (!activeWorkspace.sessionAuthenticated) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required. Please sign in.',
      }
    }
  }

  const { data, error } = await supabase
    .from('signal_feed_sources')
    .select(`
      id,
      public_id,
      source_type,
      name,
      source_key,
      status,
      description,
      metadata,
      created_at,
      updated_at
    `)
    .eq('workspace_id', activeWorkspace.workspaceId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[SignalFeedSources] Failed reading workspace sources.', {
      code: error.code,
    })
    return {
      success: false,
      error: 'Unable to retrieve Signal sources for the active workspace.',
    }
  }

  const sources: PersistedSignalFeedSource[] = (data ?? []).map((row) => ({
    id: row.id,
    public_id: row.public_id,
    source_type: row.source_type,
    name: row.name,
    source_key: row.source_key,
    status: row.status,
    description: row.description,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  return {
    success: true,
    data: sources,
  }
}
