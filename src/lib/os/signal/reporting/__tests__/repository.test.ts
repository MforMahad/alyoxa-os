import { loadReport } from '../repository'
import type { SupabaseClient } from '@supabase/supabase-js'
function mockClient(responses: unknown[]) {
 const calls: unknown[][]=[]
 const client={from:jest.fn((table:string)=>{calls.push(['from',table]);const q:Record<string,unknown>={};for(const name of ['select','eq','in','order'])q[name]=(...args:unknown[])=>{calls.push([name,...args]);return q};q.then=(resolve:(value:unknown)=>void)=>Promise.resolve(responses.shift()).then(resolve);q.range=jest.fn(async (...args:unknown[])=>{calls.push(['range',...args]);return responses.shift()});q.maybeSingle=jest.fn(async()=>responses.shift());return q})}
 return {client:client as unknown as SupabaseClient,calls}
}
it('rejects cross-workspace or unknown runs before reading evidence',async()=>{const m=mockClient([{data:null,error:null}]);await expect(loadReport(m.client,'tenant-a','audit','foreign')).rejects.toThrow('NOT_FOUND');expect(m.calls).toContainEqual(['eq','workspace_id','tenant-a']);expect(m.calls.filter(c=>c[0]==='from')).toHaveLength(1)})
it('paginates past 200 observations and scopes every query to the workspace',async()=>{
 const pages=Array.from({length:205},(_,i)=>({id:String(i),url:`https://example.org/${i}`,status:'failed',admitted:true,observation_id:null,reason:'fetch_failed'}))
 const m=mockClient([{data:{status:'failed',created_at:'2026-01-01',start_url:'https://example.org',page_limit:100,summary_observation_id:null},error:null},...[pages.slice(0,100),pages.slice(100,200),pages.slice(200)].map(data=>({data,error:null}))]);const r=await loadReport(m.client,'tenant-a','audit','historical');expect(r.pages).toHaveLength(205);expect(m.calls).toContainEqual(['range',200,299]);expect(m.calls.filter(c=>c[0]==='eq'&&c[1]==='workspace_id')).toHaveLength(4)
})
it('fails closed on truncated linked evidence',async()=>{const m=mockClient([{data:{status:'completed',start_url:'https://example.org',summary_observation_id:'missing'},error:null},{data:[],error:null},{data:[],error:null}]);await expect(loadReport(m.client,'tenant-a','audit','old')).rejects.toThrow('EVIDENCE_INCOMPLETE')})

it('does not invent a historical target for a failed Quick Scan without evidence',async()=>{const m=mockClient([{data:{status:'failed',created_at:'2026-01-01',website:{entry_url:'https://changed.example.org'}},error:null},{data:[],error:null}]);const r=await loadReport(m.client,'tenant-a','scan','old');expect(r.target).toBe('URL unavailable');expect(r.issues.coverage.failedPages).toBe(1);expect(r.findings).toEqual([])})

it('loads all 205 linked historical observations in bounded, tenant-scoped batches',async()=>{
 const pages=Array.from({length:205},(_,i)=>({id:String(i),url:`https://example.org/${i}`,status:'completed',admitted:true,observation_id:`saved-${i}`}))
 const observations=pages.map(p=>({id:p.observation_id,metadata:{evidence:[{id:'title',value:''}]}}))
 const responses=[{data:{status:'partial',created_at:'2025-01-01',start_url:'https://example.org',page_limit:100,summary_observation_id:null},error:null},...[pages.slice(0,100),pages.slice(100,200),pages.slice(200),observations.slice(0,100),observations.slice(100,200),observations.slice(200)].map(data=>({data,error:null}))]
 const m=mockClient(responses),r=await loadReport(m.client,'tenant-a','audit','old')
 expect(r.pages).toHaveLength(205);expect(r.findings).toHaveLength(205);expect(r.createdAt).toBe('2025-01-01')
 expect(m.calls.filter(c=>c[0]==='in')).toHaveLength(3)
 expect(m.calls.filter(c=>c[0]==='eq'&&c[1]==='source.workspace_id')).toEqual(Array(3).fill(['eq','source.workspace_id','tenant-a']))
})
