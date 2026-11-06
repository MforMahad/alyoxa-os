// Offline renderer integration: no database, network, scans or AI.
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { renderToBuffer } from '@react-pdf/renderer'
const root=process.cwd(), cache=path.join(root,'node_modules/.cache');await mkdir(cache,{recursive:true})
const temp=await mkdtemp(path.join(cache,'alyoxa-pdf-'))
try {
 for(const file of ['websiteIssues.ts','websiteResultGroups.ts','reporting/data.ts','reporting/pagination.ts','reporting/templates.tsx']) {
  const source=await readFile(path.join(root,'src/lib/os/signal',file),'utf8')
  let output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  output=output.replace(/from '(\.[^']+)'/g,(_,s)=>`from '${s}.js'`)
  const target=path.join(temp,file.replace(/\.tsx?$/,'.js'));await mkdir(path.dirname(target),{recursive:true});await writeFile(target,output)
 }
 const {buildReport}=await import(pathToFileURL(path.join(temp,'reporting/data.js')))
 const {QuickScanPdf,FullAuditPdf,preparePdfFonts,pdfText}=await import(pathToFileURL(path.join(temp,'reporting/templates.js')))
 await preparePdfFonts()
 assert.equal(pdfText('Caf\u00e9 \u2014 r\u00e9sum\u00e9'), 'Caf\u00e9 \u2014 r\u00e9sum\u00e9')
 assert.match(pdfText('\u6f22'), /U\+6F22/)
 const page=(i)=>({url:`https://example.org/page-${i}`,status:'completed',observation_id:`saved-${i}`,metadata:{evidence:[{id:'title',label:'Title',value:'Caf\u00e9 \u2014 r\u00e9sum\u00e9 \u2022 na\u00efve'},{id:'description',label:'Description',value:''},{id:'language',value:'en'},{id:'h1',value:1},{id:'viewport',value:true},{id:'images',value:2},{id:'missing_alt',value:0}]}})
 const run={kind:'scan',id:'historical',status:'completed',createdAt:'2026-01-01T00:00:00Z',target:'https://example.org/',pageLimit:1,pages:[page(1)]}
 const worst=buildReport({...run,pages:[{...page(1),metadata:{evidence:[{id:'title',value:''},{id:'description',value:''},{id:'language',value:''},{id:'h1',value:0},{id:'viewport',value:false},{id:'images',value:3},{id:'missing_alt',value:2}]}}]})
 const worstPdf=await renderToBuffer(QuickScanPdf({report:worst}))
 const quick=await renderToBuffer(QuickScanPdf({report:buildReport(run)}))
 const pageCount=b=>(b.toString('latin1').match(/\/Type \/Page\b/g)||[]).length
 // Complete dense evidence takes precedence over the former three-page presentation cap.
 assert.ok(pageCount(worstPdf)>=pageCount(quick),'Dense evidence must not disappear to meet a page cap')
 assert.ok(pageCount(worstPdf)>=2)
 assert.match(quick.toString('latin1'),/^%PDF/);assert.ok(pageCount(quick)>=2&&pageCount(quick)<=3,`Quick pages: ${pageCount(quick)}`)
 assert.match(quick.toString('latin1'),/https:\/\/example.org/);assert.match(quick.toString('latin1'),/FontFile/)
 for(const count of [1,12,50]) {
  const full=await renderToBuffer(FullAuditPdf({report:buildReport({...run,kind:'audit',pageLimit:count,pages:Array.from({length:count},(_,i)=>page(i))})}))
  assert.ok(pageCount(full)>=2,`Full pages: ${pageCount(full)}`)
  console.log(`Full Audit ${count} URL(s): ${pageCount(full)} pages, PDF/fonts/links PASS`)
 }
 console.log(`Quick Scan: ${pageCount(quick)} pages; maximum-findings fixture: ${pageCount(worstPdf)} pages; Unicode fixture rendered with embedded local font; PASS`)
} finally {await rm(temp,{recursive:true,force:true})}
