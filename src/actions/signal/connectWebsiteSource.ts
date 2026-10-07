'use server'

import { createClient } from '@/lib/supabase/server'

export interface ConnectWebsiteSourceInput {
  workspaceId: string
}

export interface ConnectedWebsiteSource {
  source: {
    id: string
    public_id: string
  }
  website: {
    id: string
    public_id: string
  }
  scan: {
    id: string
    public_id: string
    status: string
    reused: boolean
  }
}

export type ConnectWebsiteSourceResult =
  | {
      success: true
      data: ConnectedWebsiteSource
    }
  | {
      success: false
      error: string
    }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function connectWebsiteSource(
  input: ConnectWebsiteSourceInput
): Promise<ConnectWebsiteSourceResult> {
  const supabase = await createClient()

  const workspaceId = input.workspaceId?.trim() ?? ''

  if (!UUID_REGEX.test(workspaceId)) {
    return {
      success: false,
      error: 'Invalid workspace identifier provided.',
    }
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return {
      success: false,
      error: 'Authentication required. Please sign in.',
    }
  }

  const { data: appUser, error: appUserError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single()

  if (appUserError || !appUser) {
    return {
      success: false,
      error:
        'Application user profile not found. Please complete verification.',
    }
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('website_url')
    .eq('id', workspaceId)
    .maybeSingle()

  if (workspaceError || !workspace) {
    return {
      success: false,
      error: 'Workspace not found or not accessible.',
    }
  }

  if (workspace.website_url) {
    let normalizedDomain: string | null = null
    try {
      const websiteUrl = new URL(workspace.website_url)
      if (websiteUrl.protocol === 'http:' || websiteUrl.protocol === 'https:') {
        normalizedDomain = websiteUrl.hostname.toLowerCase().replace(/\.$/, '')
      }
    } catch {
      normalizedDomain = null
    }

    if (normalizedDomain) {
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, public_id')
        .eq('workspace_id', workspaceId)
        .eq('normalized_domain', normalizedDomain)
        .maybeSingle()

      if (websiteError) {
        console.error('[WebsiteSource] Failed resolving active website.', {
          code: websiteError.code,
        })
        return {
          success: false,
          error: 'Website source could not be connected. Please try again.',
        }
      }

      if (website) {
        const { data: activeScan, error: activeScanError } = await supabase
          .from('website_scans')
          .select('id, public_id, status')
          .eq('website_id', website.id)
          .in('status', ['queued', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (activeScanError) {
          console.error('[WebsiteSource] Failed checking active scans.', {
            code: activeScanError.code,
          })
          return {
            success: false,
            error: 'Website scan status could not be checked. Please try again.',
          }
        }

        if (activeScan) {
          const sourceKey = `website:${normalizedDomain}`
          const { data: source, error: sourceError } = await supabase
            .from('signal_feed_sources')
            .select('id, public_id')
            .eq('workspace_id', workspaceId)
            .eq('source_type', 'website')
            .eq('source_key', sourceKey)
            .maybeSingle()

          if (sourceError || !source) {
            console.error('[WebsiteSource] Failed resolving active scan source.', {
              code: sourceError?.code,
            })
            return {
              success: false,
              error: 'The active website scan source could not be resolved.',
            }
          }

          return {
            success: true,
            data: {
              source: {
                id: source.id,
                public_id: source.public_id,
              },
              website: {
                id: website.id,
                public_id: website.public_id,
              },
              scan: {
                id: activeScan.id,
                public_id: activeScan.public_id,
                status: activeScan.status,
                reused: true,
              },
            },
          }
        }
      }
    }
  }

  const { data, error: rpcError } = await supabase.rpc(
    'connect_website_signal_source',
    {
      p_workspace_id: workspaceId,
    }
  )

  if (rpcError) {
    console.error('[WebsiteSource] Connection RPC failed.', {
      workspaceId,
      code: rpcError.code,
      message: rpcError.message,
      details: rpcError.details,
      hint: rpcError.hint,
    })
    return {
      success: false,
      error:
        'Website source could not be connected. Please verify your workspace website and try again.',
    }
  }

  const result = Array.isArray(data) ? data[0] : data

  if (!result) {
    return {
      success: false,
      error: 'Website source connection returned no result.',
    }
  }

  return {
    success: true,
    data: {
      source: {
        id: result.source_id,
        public_id: result.source_public_id,
      },
      website: {
        id: result.website_id,
        public_id: result.website_public_id,
      },
      scan: {
        id: result.scan_id,
        public_id: result.scan_public_id,   
        status: result.scan_status,
        reused: false,
      },
    },
  }
}