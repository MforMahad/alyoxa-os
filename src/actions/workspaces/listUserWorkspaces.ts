'use server'

import { createClient } from '@/lib/supabase/server'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface WorkspaceListItem {
  id: string
  public_id: string
  name: string
  slug: string
  website_url: string | null
  status: string
  role: WorkspaceRole
  membershipStatus: 'active'
}

export type ListUserWorkspacesResult =
  | {
      success: true
      data: WorkspaceListItem[]
    }
  | {
      success: false
      error: string
    }

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return value === 'owner' || value === 'admin' || value === 'member'
}

export async function listUserWorkspaces(): Promise<ListUserWorkspacesResult> {
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
        'Application user profile not found. Please complete verification.',
    }
  }

  const { data: memberships, error: membershipError } = await supabase
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
    .eq('user_id', appUser.id)
    .eq('status', 'active')

  if (membershipError) {
    return {
      success: false,
      error: 'Unable to retrieve your workspaces. Please try again.',
    }
  }

  if (!memberships || memberships.length === 0) {
    return {
      success: true,
      data: [],
    }
  }

  const workspaces: WorkspaceListItem[] = []

  for (const membership of memberships) {
    const workspace = Array.isArray(membership.workspace)
      ? membership.workspace[0]
      : membership.workspace

    if (!workspace) {
      continue
    }

    if (!isWorkspaceRole(membership.role)) {
      continue
    }

    workspaces.push({
      id: workspace.id,
      public_id: workspace.public_id,
      name: workspace.name,
      slug: workspace.slug,
      website_url: workspace.website_url,
      status: workspace.status,
      role: membership.role,
      membershipStatus: 'active',
    })
  }

  return {
    success: true,
    data: workspaces,
  }
}