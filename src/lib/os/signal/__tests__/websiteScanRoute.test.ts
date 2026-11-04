jest.mock('@/lib/os/signal/websiteScanProcessor', () => ({ processWebsiteScan: jest.fn() }))
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/internal/website-scans/[scanId]/route'
import { processWebsiteScan } from '../websiteScanProcessor'

it('returns 202 for a durable deferred step so dispatch cannot report a queue failure', async () => {
  const previous = process.env.WEBSITE_SCAN_TRIGGER_SECRET
  process.env.WEBSITE_SCAN_TRIGGER_SECRET = 'test-trigger-only'
  try {
    const scanId = '998578ff-72ea-4fd3-b024-e7b55e6b46bb'
    jest.mocked(processWebsiteScan).mockResolvedValue({ status: 'deferred', scanId })
    const response = await POST(new NextRequest('https://app.example.org', { method: 'POST', headers: { authorization: 'Bearer test-trigger-only' } }), { params: Promise.resolve({ scanId }) })
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ status: 'deferred', scanId })
  } finally {
    if (previous === undefined) delete process.env.WEBSITE_SCAN_TRIGGER_SECRET
    else process.env.WEBSITE_SCAN_TRIGGER_SECRET = previous
  }
})

it('returns HTTP 502 for processor failure without returning database diagnostics', async () => {
  const previous = process.env.WEBSITE_SCAN_TRIGGER_SECRET
  process.env.WEBSITE_SCAN_TRIGGER_SECRET = 'test-trigger-only'
  try {
    const scanId = '998578ff-72ea-4fd3-b024-e7b55e6b46bb'
    jest.mocked(processWebsiteScan).mockResolvedValue({ status: 'failed', scanId })
    const request = new NextRequest(`https://app.example.org/api/internal/website-scans/${scanId}`, {
      method: 'POST', headers: { authorization: 'Bearer test-trigger-only' },
    })
    const response = await POST(request, { params: Promise.resolve({ scanId }) })
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ status: 'failed', scanId })
  } finally {
    if (previous === undefined) delete process.env.WEBSITE_SCAN_TRIGGER_SECRET
    else process.env.WEBSITE_SCAN_TRIGGER_SECRET = previous
  }
})
