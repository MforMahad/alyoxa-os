import { NextRequest } from 'next/server'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { createClient } from '@/lib/supabase/server'
import { loadReport, ReportReadError } from '@/lib/os/signal/reporting/repository'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string; runId: string }> }) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return new Response(null, { status: 403, headers })
  const { kind, runId } = await params
  if (!['scan','audit'].includes(kind) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId)) return new Response(null, {status:404,headers})
  try {
    const workspace = await getActiveWorkspace()
    if (!workspace.success) return new Response(null, { status: 401, headers })
    const client = await createClient()
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) return new Response(null, { status: 401, headers })
    const report = await loadReport(client, workspace.data.id, kind as 'scan'|'audit', runId)
    const [{ renderToBuffer }, { QuickScanPdf, FullAuditPdf, preparePdfFonts }] = await Promise.all([import('@react-pdf/renderer'), import('@/lib/os/signal/reporting/templates')])
    await preparePdfFonts()
    const bytes = await renderToBuffer((kind === 'scan' ? QuickScanPdf : FullAuditPdf)({ report }))
    return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type':'application/pdf', 'Content-Disposition':`attachment; filename="alyoxa-${kind}-${runId}.pdf"` } })
  } catch (error) {
    const code = error instanceof ReportReadError ? error.code : error instanceof Error && ['RUN_IN_PROGRESS','EVIDENCE_INCOMPLETE','EXPORT_TOO_LARGE'].includes(error.message) ? error.message : 'EXPORT_UNAVAILABLE'
    return Response.json({ error: code }, {status: code === 'EXPORT_TOO_LARGE' ? 413 : code === 'NOT_FOUND' ? 404 : ['RUN_IN_PROGRESS','EVIDENCE_INCOMPLETE'].includes(code) ? 409 : 503, headers})
  }
}
