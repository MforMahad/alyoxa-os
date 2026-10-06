import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureVerifiedApplicationUser } from '@/lib/os/users/ensureVerifiedApplicationUser'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  const supabase = await createClient()

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  const user = userData.user

  if (verifyError && (!user || !user.email_confirmed_at)) {
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  if (userError || !user) {
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  const provisioned = await ensureVerifiedApplicationUser(supabase, user)

  if (!provisioned.ok) {
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  return NextResponse.redirect(new URL('/app', request.url))
}
