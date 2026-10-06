'use server'

import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { createClient } from '@/lib/supabase/server'
import type { PersistedSignalObservation } from '@/data/os/signal'

export type ListWorkspaceObservationsResult =
  | {
      success: true
      data: PersistedSignalObservation[]
    }
  | {
      success: false
      error: string
    }

export async function listWorkspaceObservations(): Promise<ListWorkspaceObservationsResult> {
  const activeWorkspace = await getActiveWorkspace()

  if (!activeWorkspace.success) {
    return {
      success: false,
      error: activeWorkspace.error,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('signal_observations')
    .select(`
      id,
      public_id,
      source_id,
      website_scan_id,
      source_event_id,
      severity,
      category,
      title,
      description,
      metadata,
      observed_at,
      created_at,
      source:signal_feed_sources!inner(workspace_id)
    `)
    .eq('source.workspace_id', activeWorkspace.data.id)
    .order('observed_at', { ascending: false })

  if (error) {
    console.error('[SignalObservations] Failed reading workspace observations.', {
      code: error.code,
    })
    return {
      success: false,
      error: 'Unable to retrieve Signal observations for the active workspace.',
    }
  }

  const observations: PersistedSignalObservation[] = (data ?? []).map((row) => ({
    id: row.id,
    public_id: row.public_id,
    source_id: row.source_id,
    website_scan_id: row.website_scan_id,
    source_event_id: row.source_event_id,
    severity: row.severity,
    category: row.category,
    title: row.title,
    description: row.description,
    metadata: row.metadata,
    observed_at: row.observed_at,
    created_at: row.created_at,
  }))

  return {
    success: true,
    data: observations,
  }
}