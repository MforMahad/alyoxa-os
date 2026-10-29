import type { createClient } from '@/lib/supabase/server'

/** Read-only protection against historical completed rows with no retained result. */
export async function retainedScanStatus(
  client: Awaited<ReturnType<typeof createClient>>, scan: { id: string; status: string; error_message: string | null },
): Promise<{ status: string; error_message: string | null }> {
  if (scan.status !== 'completed') return { status: scan.status, error_message: scan.error_message }
  const { data, error } = await client.from('signal_observations').select('id')
    .eq('website_scan_id', scan.id).limit(1).maybeSingle()
  if (error || !data) return { status: 'unverified', error_message: error
    ? 'Retained scan evidence could not be verified.'
    : 'This historical scan is marked completed but has no retained observation. Run a new analysis.' }
  return { status: scan.status, error_message: scan.error_message }
}
