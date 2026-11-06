// Offline synthetic fixtures only. No Supabase, network, scanners, model calls or secrets.
import { mkdtemp,mkdir,readFile,writeFile,rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { cloneElement } from 'react'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { renderToBuffer } from '@react-pdf/renderer'
const root=process.cwd(),cache=path.join(root,'node_modules/.cache'),output=path.join(root,'preview-output/pdf-pagination')
await mkdir(cache,{recursive:true});await mkdir(output,{recursive:true})
const temp=await mkdtemp(path.join(cache,'alyoxa-pagination-'))
try {
 for(const file of ['websiteIssues.ts','websiteResultGroups.ts','reporting/data.ts','reporting/pagination.ts','reporting/templates.tsx']) {
  const source=await readFile(path.join(root,'src/lib/os/signal',file),'utf8')
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace(/from '(\.[^']+)'/g,(_,s)=>`from '${s}.js'`)
  const target=path.join(temp,file.replace(/\.tsx?$/,'.js'));await mkdir(path.dirname(target),{recursive:true});await writeFile(target,code)
 }
 const {buildReport,safeLink}=await import(pathToFileURL(path.join(temp,'reporting/data.js')))
 const {QuickScanPdf,FullAuditPdf,preparePdfFonts,pdfText}=await import(pathToFileURL(path.join(temp,'reporting/templates.js')))
 await preparePdfFonts()
 const manifest=[]
 function fixture(id,count,dense,long,kind='audit') {
  const origin=`https://${id}.sample.example/`,pages=[]
  for(let i=0;i<count;i++) {
   const url=origin+(long?'retained-path-'.repeat(55):'page-')+i
   const failed=kind==='audit'&&i%11===9,skipped=kind==='audit'&&i%11===10
   const status=failed?'failed':skipped?'skipped':'completed'
   const observation_id=status==='completed'?`OBS-${id}-${i}`:null
   const final_url=status==='completed'&&i%4===2?url+'/resolved':null
   const evidence=[{id:'title',value:dense&&i%3===0?'':`TITLE-${id}-${i}-Caf\u00e9`},{id:'description',value:dense?'':'A retained synthetic description.'},{id:'language',value:dense&&i%5===0?'':'en'},{id:'h1',value:dense&&i%4===0?0:1},{id:'viewport',value:!(dense&&i%7===0)},{id:'images',value:8},{id:'missing_alt',value:dense&&i%2===0?2:0}]
   for(let j=0;j<(dense?10:2);j++) evidence.push({id:`custom-${j}`,value:j===1?{token:`JSON-${id}-${i}-${j}-END`,samples:[true,null,3]}:`VAL-${id}-${i}-${j}-START `+(long&&j===0?'UnbrokenValue'.repeat(100)+'\n':dense&&j%3===0?'Retained measurement detail. '.repeat(13):'Measured fixture content. ')+` VAL-${id}-${i}-${j}-END`})
   evidence.forEach((e,j)=>e.label=`MEAS-${id}-${i}-${j}`)
   const recommendations=kind==='scan'&&dense?Array.from({length:5},(_,j)=>({recommendation:`REC-${id}-${j}-START `+'Review this synthetic saved evidence, not an AI-generated result. '.repeat(long?20:2)+` REC-${id}-${j}-END`,caveat:`CAVEAT-${id}-${j}-START `+'Unverified fixture advice; human review required. '.repeat(long?10:1)+` CAVEAT-${id}-${j}-END`,evidenceIds:['title']})):[]
   pages.push({url,final_url,status,admitted:!skipped,reason:failed?'FIXTURE-fetch-timeout':skipped?'FIXTURE-robots-exclusion':null,observation_id,metadata:status==='completed'?{fetched_url:final_url??url,evidence,ai:{status:recommendations.length?'available':'unavailable',recommendations},limitations:['Single fetched HTML page only; no site-wide crawl, rendered browser, performance audit, or ranking measurement.'],...(long?{text_excerpt:`EXCERPT-${id}-${i}-START `+'All retained text must survive a page boundary. '.repeat(30)+` EXCERPT-${id}-${i}-END`}:{}),site_checks:i===0?[{kind:'robots',url:origin+'robots.txt',status:'available',http_status:200,retained_token:`RESOURCE-${id}-END`}]:[]}:null})
  }
  return buildReport({kind,id:`SAMPLE-FIXTURE-${id}`,status:pages.some(p=>p.status!=='completed')?'partial':'completed',createdAt:'SAMPLE FIXTURE ONLY / 2026-11-06T12:00:00Z',target:pages[0].url,pageLimit:count,truncated:count===30,pages})
 }
 for(const kind of ['scan','audit']) {
  const cases=kind==='scan'?[['quick-sparse',1,false,false],['quick-dense',1,true,false],['quick-long',1,true,true]]:[1,5,12,30,50].flatMap(n=>[[`full-${n}-sparse`,n,false,false],[`full-${n}-dense`,n,true,false]]).concat([['full-12-long',12,true,true]])
  for(const [id,count,dense,long] of cases) {
   const r=fixture(id,count,dense,long,kind);let layout
   const element=cloneElement(kind==='scan'?QuickScanPdf({report:r}):FullAuditPdf({report:r}),{onRender:props=>{layout=props._INTERNAL__LAYOUT__DATA_}})
   const bytes=await renderToBuffer(element),file=path.join(output,id+'.pdf')
   await writeFile(file,bytes)
   const content=layout.children.slice(1).map(p=>p.children.find(c=>c.props?.id==='report-body'))
   assert.ok(content.every(Boolean),'Missing body layout')
   const used=content.map(b=>Math.max(...b.children.map(c=>c.box.top+c.box.height),0))
   assert.ok(used.every(n=>n<=700.1),'Body overflow')
   if(content.length>1)assert.ok(used.at(-1)>=245,'Near-empty overflow tail')
   const measurements=r.pages.flatMap(p=>(p.metadata?.evidence??[]).map(e=>({label:e.label,value:pdfText(typeof e.value==='string'?(e.value||'(empty string)'):JSON.stringify(e.value))})))
   const urls=[r.target,...r.pages.flatMap(p=>[p.url,p.final_url]),...r.findings.map(f=>f.affectedUrl),...r.suggestions.map(s=>s.pageUrl),...r.issues.resources.map(s=>s.url)].map(safeLink).filter(Boolean)
   const expected=[`Configured page cap: ${r.pageLimit} / retained candidates: ${r.pages.length} / pending pages: ${r.issues.coverage.pendingPages}.`,...urls,...r.limitations,...r.findings.flatMap(f=>[f.title,f.ruleId,f.recommendedFix,...f.limitations]),...measurements.flatMap(e=>[e.label,e.value]),...r.pages.flatMap(p=>[p.observation_id,p.reason,p.metadata?.text_excerpt,...(p.metadata?.site_checks??[]).map(v=>JSON.stringify(v))]),...r.suggestions.flatMap(s=>[s.text,s.caveat,...s.evidenceIds])].filter(v=>typeof v==='string').map(pdfText)
   const result={id,kind,candidates:count,pages:layout.children.length,measurements:measurements.length,suggestions:r.suggestions.length,bodyHeights:used.map(n=>Math.round(n)),file,expected,urls:[...new Set(urls)]}
   manifest.push(result);console.log(JSON.stringify({id,pages:result.pages,measurements:result.measurements,suggestions:result.suggestions,bodyHeights:result.bodyHeights}))
  }
 }
 await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2))
 console.log(`PASS: ${manifest.length} fixture PDFs; complete-evidence manifest saved to ${output}`)
} finally {await rm(temp,{recursive:true,force:true})}
