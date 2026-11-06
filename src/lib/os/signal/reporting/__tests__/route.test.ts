jest.mock('@/actions/workspaces/getActiveWorkspace',()=>({getActiveWorkspace:jest.fn()}))
jest.mock('@/lib/supabase/server',()=>({createClient:jest.fn()}))
jest.mock('../repository',()=>({loadReport:jest.fn(),ReportReadError:class ReportReadError extends Error {constructor(public code:string){super(code)}}}))
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/reports/website/[kind]/[runId]/route'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { createClient } from '@/lib/supabase/server'
import { loadReport,ReportReadError } from '../repository'
const id='998578ff-72ea-4fd3-b024-e7b55e6b46bb'
const params={params:Promise.resolve({kind:'audit',runId:id})}
beforeEach(()=>jest.resetAllMocks())
it('rejects cross-site and malformed requests before querying a session',async()=>{expect((await GET(new NextRequest('https://example.org',{headers:{'sec-fetch-site':'cross-site'}}),params)).status).toBe(403);expect((await GET(new NextRequest('https://example.org'),{params:Promise.resolve({kind:'audit',runId:'invalid'})})).status).toBe(404);expect(getActiveWorkspace).not.toHaveBeenCalled()})
it('rejects missing workspace authorization without loading evidence',async()=>{jest.mocked(getActiveWorkspace).mockResolvedValue({success:false,error:'No access'});const r=await GET(new NextRequest('https://example.org'),params);expect(r.status).toBe(401);expect(r.headers.get('cache-control')).toBe('private, no-store');expect(loadReport).not.toHaveBeenCalled()})
async function session(user:unknown={id:'user-a'}) {
 jest.mocked(getActiveWorkspace).mockResolvedValue({success:true,data:{id:'tenant-a'}} as Awaited<ReturnType<typeof getActiveWorkspace>>)
 jest.mocked(createClient).mockResolvedValue({auth:{getUser:async()=>({data:{user},error:null})}} as unknown as Awaited<ReturnType<typeof createClient>>)
}
it('requires a verified signed-session user',async()=>{await session(null);expect((await GET(new NextRequest('https://example.org'),params)).status).toBe(401);expect(loadReport).not.toHaveBeenCalled()})
it('passes only the active workspace and returns private 404 for inaccessible runs',async()=>{await session();jest.mocked(loadReport).mockRejectedValue(new ReportReadError('NOT_FOUND'));expect((await GET(new NextRequest('https://example.org'),params)).status).toBe(404);expect(loadReport).toHaveBeenCalledWith(expect.anything(),'tenant-a','audit',id)})
it('returns explicit incomplete/in-progress errors and redacts unexpected failures',async()=>{await session();for(const code of ['RUN_IN_PROGRESS','EVIDENCE_INCOMPLETE'] as const){jest.mocked(loadReport).mockRejectedValue(new ReportReadError(code));const r=await GET(new NextRequest('https://example.org'),params);expect(r.status).toBe(409);expect(await r.json()).toEqual({error:code})}jest.mocked(loadReport).mockRejectedValue(new Error('private database diagnostics'));const r=await GET(new NextRequest('https://example.org'),params);expect(r.status).toBe(503);expect(await r.text()).not.toContain('private database')})
