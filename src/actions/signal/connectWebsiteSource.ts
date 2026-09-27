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

  const { data, error: rpcError } = await supabase.rpc(
    'connect_website_signal_source',
    {
      p_workspace_id: workspaceId,
    }
  )

  if (rpcError) {   
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
      },
    },
  }
}