import 'server-only'

import { cookies } from 'next/headers'
import { getActiveWorkspace } from './getActiveWorkspace'

export type ActiveWorkspaceScopeResult =
  | {
      success: true
      workspaceId: string
      sessionAuthenticated: boolean
    }
  | {
      success: false
      error: string
    }

const ACTIVE_WORKSPACE_COOKIE = 'alyoxa_active_workspace'
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function getActiveWorkspaceScope(
  workspaceIdHint?: string
): Promise<ActiveWorkspaceScopeResult> {
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value

  if (activeWorkspaceId) {
    if (!UUID_REGEX.test(activeWorkspaceId)) {
      return { success: false, error: 'Active workspace could not be validated.' }
    }

    if (workspaceIdHint && workspaceIdHint !== activeWorkspaceId) {
      return { success: false, error: 'Workspace is not the active workspace.' }
    }

    return {
      success: true,
      workspaceId: activeWorkspaceId,
      sessionAuthenticated: false,
    }
  }

  if (workspaceIdHint) {
    if (!UUID_REGEX.test(workspaceIdHint)) {
      return { success: false, error: 'Invalid workspace identifier provided.' }
    }

    // This ID only scopes the query. Callers must authenticate and rely on RLS
    // or an active-membership check before returning or mutating tenant data.
    return {
      success: true,
      workspaceId: workspaceIdHint,
      sessionAuthenticated: false,
    }
  }

  const activeWorkspace = await getActiveWorkspace()
  if (!activeWorkspace.success) {
    return { success: false, error: activeWorkspace.error }
  }

  if (workspaceIdHint && workspaceIdHint !== activeWorkspace.data.id) {
    return { success: false, error: 'Workspace is not the active workspace.' }
  }

  return {
    success: true,
    workspaceId: activeWorkspace.data.id,
    sessionAuthenticated: true,
  }
}