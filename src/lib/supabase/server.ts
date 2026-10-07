import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getRequiredEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

export async function createClient() {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabasePublishableKey = getRequiredEnv(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  )
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot persist response cookies.
          // The proxy handles session refresh and cookie persistence.
        }
      },
    },
  })
}