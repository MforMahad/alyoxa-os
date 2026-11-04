import { createClient } from '@supabase/supabase-js'
import type { Config } from '@netlify/functions'
import { sharedCrawlEnabled } from '../../src/lib/os/signal/audit/contracts'
import {
  dispatchOldestQueuedWebsiteScan,
  dispatchCoordinatedQueuedWebsiteScan,
  WebsiteScanDispatchBudget,
  type CoordinatedScanQueueClient,
  type WebsiteScanQueueClient,
} from '../../src/lib/os/signal/websiteScanDispatcher'

// Temporary production pause. Restore this guard and the schedule together.
const DISPATCH_PAUSED = true

export default async function dispatchWebsiteScans(): Promise<void | Response> {
  if (DISPATCH_PAUSED) return new Response('Scan dispatch temporarily paused.', { status: 503 })

  const budget = new WebsiteScanDispatchBudget()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const triggerSecret = process.env.WEBSITE_SCAN_TRIGGER_SECRET
  const appUrl = process.env.ALYOXA_SCAN_APP_URL || process.env.URL

  if (!supabaseUrl || !serviceRoleKey || !triggerSecret || !appUrl) {
    throw new Error('Website scan dispatcher environment is incomplete.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  const result = sharedCrawlEnabled() ? await dispatchCoordinatedQueuedWebsiteScan({
    queueClient: supabase as unknown as CoordinatedScanQueueClient,
    appUrl, triggerSecret, budget,
  }) : await dispatchOldestQueuedWebsiteScan({
    queueClient: supabase as unknown as WebsiteScanQueueClient,
    appUrl,
    triggerSecret,
    budget,
  })

  // The helper already logged the safe uncertain-result metadata.
  if (result.status === 'dispatch_uncertain') return

  if (result.status === 'idle') {
    console.info('[WebsiteScanDispatcher] No queued scan.')
    return
  }

  if (result.status === 'queue_error') {
    console.error('[WebsiteScanDispatcher] Failed querying queued scans.', {
      code: result.code,
    })
    throw new Error('Website scan queue query failed.')
  }

  if (result.status === 'dispatch_failed') {
    console.error('[WebsiteScanDispatcher] Scan endpoint dispatch failed.', {
      scanId: result.scanId,
      httpStatus: result.httpStatus,
    })
    return
  }

  console.info('[WebsiteScanDispatcher] Scan endpoint dispatched.', {
    scanId: result.scanId,
    httpStatus: result.httpStatus,
  })
}

export const config: Config = {}
