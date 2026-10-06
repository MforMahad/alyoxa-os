'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type SetActiveWorkspaceResult =
  | {
      success: true
      workspaceId: string
    }
  | {
      success: false
      error: string
    }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ACTIVE_WORKSPACE_COOKIE = 'alyoxa_active_workspace'

export async function setActiveWorkspace(
  workspaceId: string
): Promise<SetActiveWorkspaceResult> {
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
    .select('id')
    .eq('workspace_id', normalizedWorkspaceId)
    .eq('user_id', appUser.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) {
    return {
      success: false,
      error: 'Workspace not found or not accessible.',
    }
  }

  const cookieStore = await cookies()

  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, normalizedWorkspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return {
    success: true,
    workspaceId: normalizedWorkspaceId,
  }
}