'use server'

import { cookies } from 'next/headers'
import { getWorkspace, type WorkspaceDetails } from './getWorkspace'
import { listUserWorkspaces } from './listUserWorkspaces'

export type GetActiveWorkspaceResult =
  | {
      success: true
      data: WorkspaceDetails
    }
  | {
      success: false
      error: string
    }

const ACTIVE_WORKSPACE_COOKIE = 'alyoxa_active_workspace'

export async function getActiveWorkspace(): Promise<GetActiveWorkspaceResult> {
  const cookieStore = await cookies()
  const workspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value

  // A selected workspace always gets revalidated through the normal
  // workspace access path. Never trust the cookie by itself.
  if (workspaceId) {
    const result = await getWorkspace(workspaceId)

    if (result.success) {
      return result
    }

    // Do not mutate cookies here. This function is a read/resolve operation.
    // A later setActiveWorkspace() call can replace a stale selection.
  }

  const workspaces = await listUserWorkspaces()

  if (!workspaces.success) {
    return {
      success: false,
      error: workspaces.error,
    }
  }

  if (workspaces.data.length === 0) {
    return {
      success: false,
      error: 'No active workspace found.',
    }
  }

  if (workspaces.data.length > 1) {
    return {
      success: false,
      error: 'Multiple workspaces found. Please select a workspace.',
    }
  }

  // Exactly one accessible workspace exists.
  // Use it as the resolved active workspace without mutating cookies here.
  const workspace = workspaces.data[0]

  return {
    success: true,
    data: {
      id: workspace.id,
      public_id: workspace.public_id,
      name: workspace.name,
      slug: workspace.slug,
      website_url: workspace.website_url,
      status: workspace.status,
      role: workspace.role,
      membershipStatus: workspace.membershipStatus,
    },
  }
}