import type { Config, Handler } from '@netlify/functions'
import {
  runWebsiteScanBackgroundDispatch,
  WebsiteScanDispatchError,
} from '../../src/lib/os/signal/websiteScanDispatcher'

export const handler: Handler = async (event) => {
  try {
    const { scanId, result } = await runWebsiteScanBackgroundDispatch({
      authorization: event.headers.authorization,
      body: event.body,
      expectedSecret: process.env.WEBSITE_SCAN_TRIGGER_SECRET,
      appUrl: process.env.ALYOXA_SCAN_APP_URL || process.env.URL,
    })

    if (result.status === 'already_claimed') {
      console.info('[WebsiteScanImmediateDispatcher] Scan was already claimed or is no longer queued.', {
        scanId,
      })
    }

    return { statusCode: 204 }
  } catch (error) {
    console.error('[WebsiteScanImmediateDispatcher] Invocation failed.', {
      httpStatus:
        error instanceof WebsiteScanDispatchError ? error.httpStatus : undefined,
    })
    throw new Error('Website scan scanner-endpoint dispatch failed.')
  }
}

export const config: Config = {
  background: true,
  method: 'POST',
}