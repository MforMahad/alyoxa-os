'use server'

import { createClient } from '@/lib/supabase/server'

export interface UpdateWorkspaceWebsiteInput {
  workspaceId: string
  websiteUrl: string
}

export type UpdateWorkspaceWebsiteResult =
  | {
      success: true
      data: {
        id: string
        website_url: string
        updated_at: string
      }
    }
  | {
      success: false
      error: string
    }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeWebsiteUrl(value: string): string | null {
  const trimmed = value.trim()

  if (!trimmed || trimmed.length > 2048) {
    return null
  }

  try {
    const url = new URL(trimmed)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }

    if (!url.hostname) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}

export async function updateWorkspaceWebsite(
  input: UpdateWorkspaceWebsiteInput
): Promise<UpdateWorkspaceWebsiteResult> {
  const supabase = await createClient()

  const workspaceId = input.workspaceId?.trim() ?? ''
  const websiteUrl = normalizeWebsiteUrl(input.websiteUrl ?? '')

  // --------------------------------------------------------------------------
  // Input validation
  // --------------------------------------------------------------------------

  if (!UUID_REGEX.test(workspaceId)) {
    return {
      success: false,
      error: 'Invalid workspace identifier provided.',
    }
  }

  if (!websiteUrl) {
    return {
      success: false,
      error: 'Please enter a valid website URL.',
    }
  }

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // ALYOXA application identity
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Workspace website update
  //
  // Authorization remains database-owned through the existing RLS policy.
  // We do not trust a client-provided role.
  // --------------------------------------------------------------------------

  const { data, error: updateError } = await supabase
    .from('workspaces')
    .update({
      website_url: websiteUrl,
    })
    .eq('id', workspaceId)
    .select('id, website_url, updated_at')
    .single()

  if (updateError || !data) {
    return {
      success: false,
      error:
        'Workspace not found or you are not authorized to update it.',
    }
  }

  return {
    success: true,
    data,
  }
}