import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auditWorkerEnabled } from '@/lib/os/signal/audit/contracts'
import { createAuditRepository } from '@/lib/os/signal/audit/repository'
import { processAuditBatch } from '@/lib/os/signal/audit/processor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  if (!auditWorkerEnabled()) return NextResponse.json({ status: 'disabled' }, { status: 503 })
  const secret = process.env.WEBSITE_SCAN_TRIGGER_SECRET
  if (!secret) return NextResponse.json({ error: 'Worker unavailable.' }, { status: 503 })
  const authorization = request.headers.get('authorization') ?? ''
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(secret) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  // The local acceptance harness pins its database before any privileged work.
  const expectedProject = request.headers.get('x-alyoxa-audit-project')
  // Read the runtime environment, matching the service-role client's lookup,
  // rather than a NEXT_PUBLIC value that Next.js can inline at build time.
  const environment = process.env
  if (expectedProject && expectedProject.replace(/\/$/, '') !== environment.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')) return NextResponse.json({ error: 'Audit project mismatch.' }, { status: 409 })
  try { return NextResponse.json(await processAuditBatch(createAuditRepository())) }
  catch { return NextResponse.json({ error: 'Audit processing could not be confirmed.' }, { status: 502 }) }
}
