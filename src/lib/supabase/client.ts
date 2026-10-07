import { createBrowserClient } from '@supabase/ssr'

function getRequiredEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

export function createClient() {
  const supabaseUrl = getRequiredEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL'
  )

  const supabasePublishableKey = getRequiredEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  )

  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey
  )
}