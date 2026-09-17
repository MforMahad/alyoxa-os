import 'server-only'

import type { User } from '@supabase/supabase-js'
import type { createClient } from '@/lib/supabase/server'

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

export type EnsureVerifiedApplicationUserResult =
  | { ok: true }
  | { ok: false }

function isUniqueViolation(code: string | undefined): boolean {
  return code === '23505'
}

export async function ensureVerifiedApplicationUser(
  supabase: ServerSupabaseClient,
  user: User
): Promise<EnsureVerifiedApplicationUserResult> {
  if (!user.email || !user.email_confirmed_at) {
    return { ok: false }
  }

  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (selectError) {
    return { ok: false }
  }

  if (existing) {
    return { ok: true }
  }

  const { error: insertError } = await supabase.from('users').insert({
    public_id: `usr_${user.id}`,
    auth_id: user.id,
    email: user.email,
    email_verified_at: user.email_confirmed_at,
  })

  if (!insertError) {
    return { ok: true }
  }

  if (!isUniqueViolation(insertError.code)) {
    return { ok: false }
  }

  const { data: raced, error: racedSelectError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (racedSelectError || !raced) {
    return { ok: false }
  }

  return { ok: true }
}
