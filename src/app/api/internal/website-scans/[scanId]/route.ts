import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { processWebsiteScan } from '@/lib/os/signal/websiteScanProcessor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const expectedSecret = process.env.WEBSITE_SCAN_TRIGGER_SECRET
  if (!expectedSecret) {
    console.error('[WebsiteScanRoute] Trigger secret is not configured.')
    return NextResponse.json({ error: 'Scanner is not configured.' }, { status: 503 })
  }

  const authorization = request.headers.get('authorization') ?? ''
  const suppliedSecret = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''

  if (!secretsMatch(suppliedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { scanId } = await context.params
  let result
  try {
    result = await processWebsiteScan(scanId)
  } catch {
    console.error('[WebsiteScanRoute] Processor failed unexpectedly.')
    return NextResponse.json({ error: 'Website scan failed.' }, { status: 502 })
  }

  if (result.status === 'completed') {
    return NextResponse.json(result)
  }

  if (result.status === 'skipped') {
    const status =
      result.reason === 'invalid_id' ? 400 : result.reason === 'not_found' ? 404 : 409
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result, { status: 502 })
}

function secretsMatch(supplied: string, expected: string): boolean {
  const suppliedBuffer = Buffer.from(supplied)
  const expectedBuffer = Buffer.from(expected)

  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  )
}