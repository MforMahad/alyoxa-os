'use server'

import { createClient } from '@/lib/supabase/server'

export interface DeleteWorkspaceInput {
  workspaceId: string
}

export type DeleteWorkspaceResult =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function deleteWorkspace(
  input: DeleteWorkspaceInput
): Promise<DeleteWorkspaceResult> {
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
      error: 'Application user profile not found. Please complete verification.',
    }
  }

  const { data, error: deleteError } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)
    .select('id')
  
  if (deleteError) {
    return {
      success: false,
      error: 'Workspace could not be deleted.',
    }
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: 'Workspace not found or you are not authorized to delete it.',
    }
  }

  return {
    success: true,
  }
}