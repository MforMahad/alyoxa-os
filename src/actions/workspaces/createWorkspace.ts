'use server'

import { createClient } from '@/lib/supabase/server'

export interface CreateWorkspaceInput {
  name: string
  slug: string
  websiteUrl: string
}

export type CreateWorkspaceResult =
  | {
      success: true
      data: {
        id: string
        public_id: string
        name: string
        slug: string
        website_url: string
        status: string
      }
    }
  | {
      success: false
      error: string
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

export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<CreateWorkspaceResult> {
  const supabase = await createClient()

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
        'Your ALYOXA OS user profile could not be found. Please sign in again.',
    }
  }

  const name = input.name?.trim() ?? ''
  const slug = input.slug?.trim() ?? ''
  const websiteUrl = normalizeWebsiteUrl(input.websiteUrl ?? '')

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

  if (!slug || slug.length < 2) {
    return {
      success: false,
      error: 'A valid workspace slug is required.',
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

  const { data, error: rpcError } = await supabase.rpc(
    'create_personal_workspace',
    {
      p_name: name,
      p_slug: slug,
    }
  )

  if (rpcError) {
    return {
      success: false,
      error: 'Unable to create workspace. Please try again.',
    }
  }

  const workspace = Array.isArray(data) ? data[0] : data

  if (!workspace) {
    return {
      success: false,
      error: 'Workspace creation failed. Please try again.',
    }
  }

  const { data: updatedWorkspace, error: websiteError } = await supabase
    .from('workspaces')
    .update({
      website_url: websiteUrl,
    })
    .eq('id', workspace.id)
    .select('id, public_id, name, slug, website_url, status')
    .single()

  if (websiteError || !updatedWorkspace) {
    return {
      success: false,
      error:
        'Workspace was created, but its website could not be saved. Please try again.',
    }
  }

  return {
    success: true,
    data: updatedWorkspace,
  }
}