'use server'

import { createClient } from '@/lib/supabase/server'

export interface UpdateWorkspaceInput {
  workspaceId: string
  name: string
  slug: string
  websiteUrl: string
}

export interface UpdatedWorkspace {
  id: string
  public_id: string
  name: string
  slug: string
  website_url: string | null
  status: string
  updated_at: string
}

export type UpdateWorkspaceResult =
  | {
      success: true
      data: UpdatedWorkspace
    }
  | {
      success: false
      error: string
    }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

export async function updateWorkspace(
  input: UpdateWorkspaceInput
): Promise<UpdateWorkspaceResult> {
  const supabase = await createClient()

  const workspaceId = input.workspaceId?.trim() ?? ''
  const name = input.name?.trim() ?? ''
  const slug = normalizeSlug(input.slug ?? '')
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

  if (name.length < 2) {
    return {
      success: false,
      error: 'Workspace name must be at least 2 characters long.',
    }
  }

  if (name.length > 200) {
    return {
      success: false,
      error: 'Workspace name is too long.',
    }
  }

  if (slug.length < 2) {
    return {
      success: false,
      error: 'Workspace slug must be at least 2 characters long.',
    }
  }

  if (slug.length > 200) {
    return {
      success: false,
      error: 'Workspace slug is too long.',
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
  // Workspace update
  //
  // Authorization is enforced by the database RLS policy.
  // We do NOT trust a client-provided role.
  // --------------------------------------------------------------------------

  const { data, error: updateError } = await supabase
    .from('workspaces')
    .update({
      name,
      slug,
      website_url: websiteUrl,
    })
    .eq('id', workspaceId)
    .select(
      'id, public_id, name, slug, website_url, status, updated_at'
    )
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