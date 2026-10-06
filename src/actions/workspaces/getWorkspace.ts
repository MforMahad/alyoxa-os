'use server'

import { createClient } from '@/lib/supabase/server'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface WorkspaceDetails {
  id: string
  public_id: string
  name: string
  slug: string
  website_url: string | null
  status: string
  role: WorkspaceRole
  membershipStatus: 'active'
}

export type GetWorkspaceResult =
  | {
      success: true
      data: WorkspaceDetails
    }
  | {
      success: false
      error: string
    }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return value === 'owner' || value === 'admin' || value === 'member'
}

export async function getWorkspace(
  workspaceId: string
): Promise<GetWorkspaceResult> {
  const supabase = await createClient()

  const normalizedWorkspaceId = workspaceId?.trim() ?? ''

  if (!UUID_REGEX.test(normalizedWorkspaceId)) {
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

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select(
      `
        role,
        status,
        workspace:workspaces!workspace_memberships_workspace_id_fkey (
          id,
          public_id,
          name,
          slug,
          website_url,
          status
        )
      `
    )
    .eq('workspace_id', normalizedWorkspaceId)
    .eq('user_id', appUser.id)
    .eq('status', 'active')
    .single()

  if (membershipError || !membership) {
    return {
      success: false,
      error: 'Workspace not found or not accessible.',
    }
  }

  const workspace = Array.isArray(membership.workspace)
    ? membership.workspace[0]
    : membership.workspace

  if (!workspace) {
    return {
      success: false,
      error: 'Workspace not found or not accessible.',
    }
  }

  if (!isWorkspaceRole(membership.role)) {
    return {
      success: false,
      error: 'Workspace access could not be validated.',
    }
  }

  return {
    success: true,
    data: {
      id: workspace.id,
      public_id: workspace.public_id,
      name: workspace.name,
      slug: workspace.slug,
      website_url: workspace.website_url,
      status: workspace.status,
      role: membership.role,
      membershipStatus: 'active',
    },
  }
}