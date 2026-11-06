import React from 'react'
import { Document, Page, Text, View, Link, Font, StyleSheet, Svg, Path, Circle, Rect } from '@react-pdf/renderer'
import path from 'node:path'
import type { WebsitePdfReport } from './data'
import { safeLink } from './data'
import { paginateReportBlocks, wrapReportText } from './pagination'

Font.register({ family: 'Satoshi', fonts: [
  { src: path.join(process.cwd(), 'public/fonts/Satoshi-Regular.woff2'), fontWeight: 400 },
  { src: path.join(process.cwd(), 'public/fonts/Satoshi-Bold.woff2'), fontWeight: 700 },
] })
// Width-measured lines already split long tokens; automatic hyphens would alter saved values.
Font.registerHyphenationCallback(word => [word])
export async function preparePdfFonts() {
  await Promise.all([400, 700].map(fontWeight => Font.load({ fontFamily: 'Satoshi', fontWeight })))
}
export function pdfText(value: unknown) {
  const font = Font.getFont({ fontFamily: 'Satoshi', fontWeight: 400 }).data
  return Array.from(String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')).map(c =>
    c === '\n' || c === '\t' || !font || font.hasGlyphForCodePoint(c.codePointAt(0)!)
      ? c : `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`).join('')
}
const clean = pdfText
const C = { navy: '#061E32', ink: '#10263D', teal: '#009E98', aqua: '#54E1D0', pale: '#EDF8F7', line: '#DAE5EB', muted: '#5A6F80', gold: '#D98A24', cream: '#FFF7EB', red: '#B54F4F', white: '#FFFFFF' }
const s = StyleSheet.create({
  page: { fontFamily: 'Satoshi', color: C.ink, backgroundColor: C.white, fontSize: 9, lineHeight: 1.45, padding: '72 42 49' },
  cover: { height: 841.89, fontFamily: 'Satoshi', backgroundColor: C.navy, color: C.white, padding: '42 44', fontSize: 10, lineHeight: 1.5 },
  header: { position: 'absolute', left: 42, right: 42, top: 24, height: 25, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 10 },
  brand: { fontSize: 12, fontWeight: 700, letterSpacing: 1.1, marginLeft: 7 },
  headerLabel: { fontSize: 7.5, color: C.muted, marginLeft: 13 },
  headerRight: { marginLeft: 'auto', fontSize: 7.5, color: C.muted },
  footer: { position: 'absolute', top: 795, height: 24, left: 42, right: 42, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: C.muted },
  eyebrow: { fontSize: 8, fontWeight: 700, letterSpacing: 1.6, color: C.teal, marginBottom: 9 },
  title: { fontSize: 27, lineHeight: 1.12, fontWeight: 700, letterSpacing: -.7, marginBottom: 9 },
  subtitle: { color: C.muted, fontSize: 9, marginBottom: 22, maxWidth: 460 },
  heading: { fontSize: 14, fontWeight: 700, marginTop: 18, marginBottom: 10, lineHeight: 1.2 },
  body: { marginBottom: 9 },
  small: { fontSize: 7.5, color: C.muted, lineHeight: 1.5 },
  link: { fontSize: 8, color: '#007B79', textDecoration: 'none' },
  callout: { padding: 13, borderRadius: 7, backgroundColor: C.pale, marginBottom: 12 },
  metrics: { flexDirection: 'row', gap: 9, marginBottom: 20 },
  metric: { flexGrow: 1, flexBasis: 0, borderRadius: 7, padding: '12 10', backgroundColor: '#EFF6F9', minHeight: 82 },
  metricValue: { fontSize: 27, fontWeight: 700, lineHeight: 1.1, marginBottom: 7 },
  metricLabel: { fontSize: 7.5, color: C.muted },
  badge: { fontSize: 7, fontWeight: 700, borderRadius: 4, padding: '3 7', backgroundColor: C.pale, color: '#006B66', alignSelf: 'flex-start' },
  finding: { borderWidth: 1, borderColor: '#CDE8E5', borderLeftWidth: 3, borderLeftColor: C.teal, borderRadius: 7, padding: 8, marginBottom: 10, backgroundColor: '#F7FBFC' },
  findingTitle: { fontSize: 11, fontWeight: 700, lineHeight: 1.2, flex: 1, marginRight: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  evidence: { backgroundColor: '#EAF1F5', padding: 5, borderRadius: 4, marginTop: 9 },
  tableHead: { flexDirection: 'row', padding: '7 9', backgroundColor: '#E6EFF4', borderRadius: 4, fontSize: 7, fontWeight: 700 },
  tableRow: { flexDirection: 'row', padding: '6 9', borderBottomWidth: .5, borderBottomColor: C.line, fontSize: 7.5 },
  key: { width: '41%', paddingRight: 10 },
  value: { width: '59%' },
  note: { fontSize: 7.5, lineHeight: 1.4, color: C.muted, marginBottom: 5 },
})
function Mark({ light = false, size = 20 }: { light?: boolean; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 28 28"><Path d="M2 25 L13 3 L18 3 L7 25 Z" fill={light ? C.aqua : C.teal}/><Path d="M16 9 L26 25 L20 25 L13 14 Z" fill={light ? '#19B8BC' : '#007E86'}/><Circle cx="13" cy="23" r="2" fill={light ? C.white : C.navy}/></Svg>
}
function Url({ value, light = false, label }: { value: string; light?: boolean; label?: string }) {
  const url = safeLink(value)
  return url ? <Link src={url} style={{ ...s.link, ...(light ? { color: '#BFF4EF', fontSize: 11 } : {}) }}>{clean(label ?? url)}</Link>
    : <Text style={s.small}>URL unavailable</Text>
}
function Cover({ report: r }: { report: WebsitePdfReport }) {
  return <Page size="A4" style={s.cover}>
    <Svg fixed width="595" height="842" viewBox="0 0 595 842" style={{ position: 'absolute', top: 0, left: 0 }}>
      <Rect width="595" height="842" fill={C.navy}/>
      <Path d="M595 140 C500 330 520 580 230 760 L595 842 Z" fill="#083D50"/>
      <Path d="M595 330 C510 530 400 660 70 842 L595 842 Z" fill="#07566A"/>
      <Path d="M595 530 C390 650 360 780 155 842 L595 842 Z" fill="#008B91"/>
      <Path d="M595 600 C405 670 360 788 50 842 L595 842 Z" fill="#005262"/>
      <Path d="M595 530 C390 650 360 780 155 842" fill="none" stroke="#2FD5CA" strokeWidth="1" opacity=".6"/>
      <Path d="M0 774 L49 774 L110 842 L0 842 Z" fill="#00A4A7"/>
    </Svg>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><Mark size={31} light/><Text style={{ ...s.brand, fontSize: 22, marginLeft: 9 }}>ALYOXA</Text><Text style={{ marginLeft: 'auto', letterSpacing: 1.8, fontSize: 7 }}>INTELLIGENT REPORTS</Text></View>
    <View style={{ marginTop: r.kind === 'scan' ? 106 : 114 }}>
      <Text style={{ ...s.eyebrow, color: C.aqua, fontSize: 10 }}>WEBSITE INTELLIGENCE</Text>
      <Text style={{ fontSize: r.kind === 'scan' ? 57 : 48, fontWeight: 700, lineHeight: 1.07, letterSpacing: -1.7, marginTop: 9 }}>{r.kind === 'scan' ? 'Quick' : 'Full Website'}</Text>
      <Text style={{ fontSize: r.kind === 'scan' ? 66 : 65, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.7, color: C.aqua }}>{r.kind === 'scan' ? 'Scan.' : 'Audit.'}</Text>
      <Text style={{ fontSize: 16, marginTop: 14 }}>{r.kind === 'scan' ? 'One URL. A clearer next step.' : 'Measured Coverage Report'}</Text>
      <Text style={{ color: '#C1D6E1', marginTop: 15, fontSize: 10 }}>Clarity. Evidence. Your next steps.</Text>
    </View>
    <View style={{ marginTop: 44, maxWidth: 440 }}><Url value={r.target} light label={safeLink(r.target) ? new URL(r.target).origin : undefined}/><Text style={{ color: '#C1D6E1', fontSize: 7, marginTop: 5 }}>Full target URL and retained evidence follow inside.</Text><View style={{ height: 1, width: 50, backgroundColor: C.aqua, marginTop: 18, marginBottom: 18 }}/>
      <Text style={{ fontSize: 9, marginBottom: 6 }}>Saved run: {clean(r.status)}</Text>
      <Text style={{ fontSize: 8, color: '#C1D6E1', marginBottom: 13 }}>{clean(r.createdAt)}</Text>
      <Text style={{ fontSize: 10 }}>{r.findings.length} supported findings / {r.issues.coverage.analyzedPages} analyzed URL(s)</Text>
    </View>
    <Text style={{ position: 'absolute', left: 44, right: 44, bottom: 35, fontSize: 7.5, color: '#C1E1E5' }}>Based on retained HTML evidence. No synthetic score. No new scan or AI generation.</Text><Text fixed style={{ position: 'absolute', top: 814, left: 44, width: 140, fontSize: 7, color: '#C1E1E5' }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}/>
  </Page>
}
function Metrics({ report: r, compact = false }: { report: WebsitePdfReport; compact?: boolean }) {
  const c = r.issues.coverage
  return <View style={{ ...s.metrics, ...(compact ? { marginBottom: 12 } : {}) }}>
    {[['Analyzed URLs', c.analyzedPages, C.pale], ['Supported findings', r.findings.length, C.cream], ['Failed pages', c.failedPages, '#FFF0ED'], ['Skipped pages', c.skippedPages, '#EFF3FA']].map(([label, value, bg]) =>
      <View key={String(label)} style={{ ...s.metric, backgroundColor: String(bg), ...(compact ? { minHeight: 57, padding: 8 } : {}) }} wrap={false}><Text style={{ ...s.metricValue, ...(compact ? { fontSize: 20, marginBottom: 4 } : {}) }}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>)}
  </View>
}
function CoverageGraphic({ report: r }: { report: WebsitePdfReport }) {
  const c = r.issues.coverage, total = c.candidatePages
  const other = Math.max(0, total - c.completedPages - c.failedPages - c.skippedPages - c.pendingPages)
  const share = total ? c.completedPages / total : 0
  const segments: [string, number, string][] = [['Completed', c.completedPages, C.teal], ['Failed', c.failedPages, '#E77F70'], ['Skipped', c.skippedPages, '#E6B965'], ['Pending', c.pendingPages, '#A0B4CA']]
  if (other) segments.push(['Other / unverified', other, C.muted])
  return <View style={{ ...s.row, gap: 24, marginBottom: 22 }} wrap={false}>
    <View style={{ width: 155, height: 155 }}><Svg width="155" height="155" viewBox="0 0 130 130"><Circle cx="65" cy="65" r="49" fill="none" stroke="#E4EDF2" strokeWidth="15"/>{share > 0 && <Circle cx="65" cy="65" r="49" fill="none" stroke={C.teal} strokeWidth="15" strokeDasharray={`${share * 307.876} 307.876`} transform="rotate(-90 65 65)"/>}</Svg><View style={{ position: 'absolute', top: 57, left: 0, width: 155, alignItems: 'center' }}><Text style={{ fontSize: 27, lineHeight: 1.1, fontWeight: 700 }}>{total ? `${Math.round(share * 100)}%` : 'N/A'}</Text><Text style={s.small}>Completed</Text></View></View>
    <View style={{ flex: 1, paddingTop: 6 }}><Text style={{ ...s.heading, marginTop: 0 }}>Coverage overview</Text>{segments.map(([name, count, color]) => <View key={name} style={{ ...s.row, paddingVertical: 5, borderBottomWidth: .5, borderBottomColor: C.line }}><View style={{ width: 6, height: 6, backgroundColor: color, borderRadius: 3, marginTop: 3, marginRight: 8 }}/><Text style={{ flex: 1 }}>{name}</Text><Text style={{ fontWeight: 700 }}>{count}{total ? ` (${Math.round(count / total * 100)}%)` : ''}</Text></View>)}<Text style={{ ...s.small, marginTop: 8 }}>Denominator: {total} retained candidate(s), not all pages on the website. Percentages are rounded.</Text></View>
  </View>
}

const BODY_WIDTH = 511.28, BODY_HEIGHT = 700, BODY_TOP = 74, LINE = 11
interface Cell { lines: string[]; href?: string }
interface ReportBlock { id: string; section: string; kind: 'heading' | 'text' | 'row' | 'metrics' | 'chart'; height: number; keepWithNext?: boolean; lines?: string[]; cells?: Cell[]; widths?: number[]; size?: number; bold?: boolean; shade?: string; severity?: string }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function retainedValue(value: unknown): string {
  if (value === undefined) return 'Unavailable (value not retained)'
  if (typeof value === 'string') return value || '(empty string)'
  return JSON.stringify(value) ?? String(value)
}
function measure(text: string, size: number, bold = false) {
  const font = Font.getFont({fontFamily:'Satoshi',fontWeight:bold ? 700 : 400}).data
  if (!font) throw new Error('REPORT_FONTS_NOT_PREPARED')
  return font.layout(text).positions.reduce((n: number,p: {xAdvance:number}) => n + p.xAdvance,0) * size / font.unitsPerEm
}
function reportBlocks(r: WebsitePdfReport) {
  const blocks: ReportBlock[] = []; let serial = 0, section = 'Overview'
  let firstTableRow: ReportBlock | null = null, tableRows = 0
  function text(value: unknown, options: {size?:number; bold?:boolean; shade?:string; heading?:boolean; keep?:boolean; href?:string} = {}) {
    const size = options.size ?? 8.2, wrapped = wrapReportText(clean(value), BODY_WIDTH - 20, t => measure(t,size,options.bold))
    const lineHeight = options.heading ? size + 7 : LINE
    for (let offset = 0; offset < wrapped.length; offset += 8) {
      const lines = wrapped.slice(offset,offset+8)
      blocks.push({ id:`block-${serial++}`,section,kind:options.heading ? 'heading' : 'text',height:lines.length*lineHeight+(options.heading ? 15 : 9),lines,size,bold:options.bold,shade:options.shade,keepWithNext:options.heading || options.keep, cells:options.href ? [{lines,href:options.href}] : undefined })
    }
  }
  function heading(title:string, subtitle?:string, size=21.5) {
    section = title; text(title,{size,bold:true,heading:true}); if(subtitle) text(subtitle,{size:8.2,shade:C.muted,keep:true})
  }
  function row(values: {text:string;href?:string}[], header=false, widths=[.41,.59]) {
    if(header) { firstTableRow = null; tableRows = 0 }
    const size = header ? 7.2 : 7.5
    const columns=values.map((v,i)=>({lines:wrapReportText(clean(v.text),BODY_WIDTH*widths[i]-22,t=>measure(t,size,header)),href:v.href}))
    const length=Math.max(...columns.map(c=>c.lines.length))
    for(let offset=0;offset<length;offset+=6) {
      const cells=columns.map(c=>({lines:c.lines.slice(offset,offset+6),href:c.href}))
      const lineCount=Math.max(...cells.map(c=>c.lines.length),1)
      blocks.push({id:`block-${serial++}`,section,kind:'row',height:lineCount*LINE+12,cells,widths,size,bold:header,shade:header?'#E6EFF4':serial%2?'#F5F9FB':C.white,keepWithNext:header && offset+6>=length})
      if(!header) {
        if(tableRows === 1 && firstTableRow) firstTableRow.keepWithNext = true
        if(tableRows === 0) firstTableRow = blocks[blocks.length-1]
        tableRows++
      }
    }
  }
  function link(url:string, prefix='', keep=false, label?:string) {
    const valid=safeLink(url)
    text(prefix+(valid?(label??valid):'URL unavailable'),{size:8.2,href:valid??undefined,shade:valid?'#007B79':C.muted,keep})
  }
  heading(r.kind==='scan'?'Your next steps, clearly.':'Executive Summary & Coverage',r.kind==='scan'?'A single-URL Quick Scan based on saved HTML evidence.':'A navigation-limited audit of the retained candidate URLs, not a complete website census.',26)
  blocks.push({id:`block-${serial++}`,section,kind:'metrics',height:r.kind==='scan'?74:106})
  link(r.target,'Target: ',false,r.pages.some(p=>p.url===r.target||p.final_url===r.target)&&safeLink(r.target)?new URL(r.target).origin:undefined)
  text(`Run status: ${r.status}. ${r.status==='completed'?'Completed processing does not imply that every check passed.':'This run did not complete fully. Failed, skipped and unavailable checks are not healthy results.'}`)
  text(`Configured page cap: ${r.pageLimit} / retained candidates: ${r.pages.length} / pending pages: ${r.issues.coverage.pendingPages}.`,{size:7.5,shade:C.muted})
  text('Saved evidence only. No new scan, AI generation, synthetic score, ranking measurement or compliance certification.',{shade:C.muted})
  if(r.kind==='audit') blocks.push({id:`block-${serial++}`,section,kind:'chart',height:185})
  else text('Quick Scan coverage: one saved URL only. No site-wide crawl or rendered-browser, performance or ranking audit.',{shade:C.teal})
  if(r.truncated) text('Discovery was truncated; undiscovered pages remain unknown.',{shade:C.gold})
  function referenceLabel(url:string) {
    const index=r.pages.findIndex(p=>p.url===url||p.final_url===url)
    return index>=0&&safeLink(url)?`Page ${index+1} / ${new URL(url).hostname}`:url
  }
  const groups=new Map<string,WebsitePdfReport['findings']>()
  for(const finding of r.findings) {
    const key=JSON.stringify([finding.ruleId,finding.title,finding.severity,finding.recommendedFix])
    groups.set(key,[...(groups.get(key)??[]),finding])
  }
  heading('Verified Findings & Fixes','Findings are verified only against retained HTML. Severity is a review priority; rendered content and intent remain unverified.')
  if(!groups.size) text('No supported issues were detected in available measurements. This does not establish that the website is free of issues.')
  if(r.kind==='scan' && r.findings.length) {
    row([{text:'Verified issue / affected URL'},{text:'Actionable fix / retained references'}],true)
    for(const f of r.findings) row([{text:`${f.title} / ${f.severity}\n${referenceLabel(f.affectedUrl)}`,href:safeLink(f.affectedUrl)??undefined},{text:`${f.recommendedFix}\nRule: ${f.ruleId} / confidence: ${f.confidence}\n`+f.evidenceReferences.map(e=>`${e.evidenceId}: ${retainedValue(e.value)} / observation ${e.observationId}`).join('\n')}])
  } else {
    let priority=0
    for(const findings of groups.values()) {
      const f=findings[0]
      heading(`${++priority}. ${f.title}`,`${f.severity} priority / rule ${f.ruleId} / ${findings.length} affected URL(s)`,15)
      blocks[blocks.length-2].severity=f.severity
      text(f.recommendedFix,{keep:true})
      row([{text:'Affected URL'},{text:'Retained supporting evidence'}],true)
      for(const item of findings) row([{text:referenceLabel(item.affectedUrl),href:safeLink(item.affectedUrl)??undefined},{text:`Confidence: ${item.confidence}\n`+item.evidenceReferences.map(e=>`${e.evidenceId}: ${retainedValue(e.value)} / observation ${e.observationId}`).join('\n')}])
    }
  }
  if(r.suggestions.length) {
    heading('Saved AI Suggestions / Unverified','All retained evidence-linked suggestions are reproduced in full. They are advice, not verified website defects. No AI was invoked during export.')
    r.suggestions.forEach((v,i)=>{
      text(`Suggestion ${i+1}`,{bold:true,keep:true}); text(v.text); text('Caveat: '+v.caveat,{shade:C.muted}); link(v.pageUrl,'',false,referenceLabel(v.pageUrl)); text('Evidence IDs: '+v.evidenceIds.join(', '),{size:7.5,shade:C.muted})
    })
  } else text('Saved AI suggestions: no usable evidence-linked output was retained. No AI was invoked during export.',{shade:C.muted})
  heading('Retained Page Evidence','Complete measurement rows and coverage outcomes for this historical run. Long values continue naturally; nothing is clipped.')
  if(!r.pages.length) text('No page evidence was retained. Coverage remains unavailable.')
  const pageLimits=new Set<string>()
  for(const [index,p] of r.pages.entries()) {
    const m=record(p.metadata), evidence=Array.isArray(m.evidence)?m.evidence:[]
    section=`Page ${index+1} / Retained Evidence`
    text(`Page ${index+1} / ${p.status}`,{size:12,bold:true,heading:true})
    link(p.url,'Requested URL: ',true)
    if(p.final_url && p.final_url!==p.url) link(p.final_url,'Final URL: ',true)
    text(`Observation: ${p.observation_id??'unavailable'} / Admission: ${p.admitted===true?'admitted':p.admitted===false?'not admitted':'not retained'}`,{size:7.5,shade:C.muted,keep:evidence.length>0||Boolean(p.reason)})
    if(p.reason) text('Coverage reason: '+p.reason,{shade:C.muted,keep:evidence.length>0})
    if(evidence.length) {
      row([{text:'Measurement / evidence ID'},{text:'Complete retained value'}],true)
      for(const raw of evidence) {
        const e=record(raw), structured=raw!==null&&typeof raw==='object'&&!Array.isArray(raw)
        const value=structured&&Object.hasOwn(e,'value')?retainedValue(e.value):retainedValue(raw)
        row([{text:structured?`${e.label??e.id??'Unnamed measurement'}${e.label&&e.id?` (${e.id})`:''}`:'Unstructured retained measurement'},{text:value,href:safeLink(value)??undefined}])
        if(structured&&Object.hasOwn(e,'value')) {
          const extra=Object.fromEntries(Object.entries(e).filter(([key])=>!['id','label','value'].includes(key)))
          if(Object.keys(extra).length) row([{text:`Additional retained fields / ${e.id??e.label??'measurement'}`},{text:retainedValue(extra)}])
        }
      }
    } else text('Measurements unavailable. This is a coverage outcome, not a verified website issue.',{shade:C.muted})
    // These fields are retained measurements outside the detector evidence array.
    const extra=['http_status','content_type','response_bytes','page_description','headings','text_excerpt']
    for(const key of extra) if(m[key]!==undefined) row([{text:key},{text:retainedValue(m[key])}])
    if(Array.isArray(m.limitations)) m.limitations.filter((v):v is string=>typeof v==='string').forEach(v=>pageLimits.add(v))
  }
  heading('Technical Appendix','Rule coverage and saved resource outcomes. Unavailable measurements are not passed checks.')
  row([{text:'Supported rule'},{text:'Measured / unavailable analyzed URLs'}],true)
  for(const g of r.issues.groups) row([{text:g.title},{text:`${g.measuredPages} measured / ${g.unknownPages} unavailable`}])
  if(r.issues.resources.length) {
    text('Shared resource checks',{bold:true,keep:true})
    for(const resource of r.issues.resources) {
      link(resource.url); text(`${resource.kind}: ${resource.status} / HTTP ${resource.httpStatus??'unavailable'}`,{size:7.5,shade:C.muted})
    }
  }
  const resourceRecords=new Map<string,Set<string>>()
  for(const [source,m] of [['summary',record(r.summary)],...r.pages.map((p,i)=>[`page ${i+1} / observation ${p.observation_id??'unavailable'}`,record(p.metadata)] as const)] as const) {
    if(Array.isArray(m.site_checks)) for(const resource of m.site_checks) {
      const value=retainedValue(resource), sources=resourceRecords.get(value)??new Set<string>()
      sources.add(source); resourceRecords.set(value,sources)
    }
  }
  for(const [resource,sources] of resourceRecords) {
    row([{text:'Original retained resource record (JSON)'},{text:resource}])
    text('Retained resource references: '+[...sources].join('; '),{size:7.5,shade:C.muted})
  }
  heading('Scope, Limitations & Provenance')
  text(r.kind==='scan'?'Quick Scan scope: a single saved URL. No site-wide crawl, rendered-browser, performance or ranking audit.':'Full Audit scope: navigation-only discovery across the retained URLs. The page cap and excluded/failed pages limit coverage; undiscovered pages remain unknown.',{bold:true})
  const issueLimits=new Set(r.findings.flatMap(f=>f.limitations))
  for(const limit of [...new Set([...r.limitations.filter(v=>!pageLimits.has(v)),...issueLimits])]) text(limit,{size:7.5,shade:C.muted})
  if(pageLimits.size) {
    text(r.kind==='scan'?'Saved Quick Scan measurement limitations:':'Per-page measurement limitations (these describe each fetched HTML page, not the aggregate audit scope):',{bold:true,keep:true})
    for(const limit of pageLimits) text(limit,{size:7.5,shade:C.muted})
  }
  text(`Run: ${r.id}\nEvidence date: ${r.createdAt}\nInterpretation version: ${r.issues.version}\nUnsupported font glyphs use explicit Unicode codes, not inferred translations.`,{size:7.5,shade:C.muted})
  return blocks
}
function BlockView({block:b,report:r}:{block:ReportBlock;report:WebsitePdfReport}) {
  if(b.kind==='metrics') return <View style={{height:b.height}}><Metrics report={r} compact={r.kind==='scan'}/></View>
  if(b.kind==='chart') return <View style={{height:b.height}}><CoverageGraphic report={r}/></View>
  const size=b.size??8.2
  if(b.kind==='row') return <View style={{height:b.height,width:BODY_WIDTH,flexDirection:'row',backgroundColor:b.shade,borderBottomWidth:.5,borderBottomColor:C.line,paddingVertical:6}}>
    {b.cells?.map((cell,i)=><View key={i} style={{width:BODY_WIDTH*(b.widths?.[i]??.5),paddingHorizontal:10}}>{cell.lines.map((line,j)=>cell.href?<Link key={j} src={cell.href} style={{fontSize:size,lineHeight:1,height:LINE,color:'#007B79'}}>{line||' '}</Link>:<Text key={j} style={{fontSize:size,lineHeight:1,height:LINE,fontWeight:b.bold?700:400}}>{line||' '}</Text>)}</View>)}
  </View>
  const lineHeight=b.kind==='heading'?size+7:LINE
  return <View style={{height:b.height,paddingHorizontal:2,...(b.kind==='heading'?{paddingTop:5,borderLeftWidth:2,borderLeftColor:b.severity==='medium'?C.gold:C.teal,paddingLeft:10}:{})}}>
    {b.lines?.map((line,i)=>b.cells?.[0]?.href?<Link key={i} src={b.cells[0].href} style={{height:lineHeight,fontSize:size,lineHeight:1,color:b.shade??C.ink}}>{line||' '}</Link>:<Text key={i} style={{height:lineHeight,fontSize:size,lineHeight:1,fontWeight:b.bold?700:400,color:b.shade??C.ink}}>{line||' '}</Text>)}
  </View>
}
function ContentPages({report:r}:{report:WebsitePdfReport}) {
  const pages=paginateReportBlocks(reportBlocks(r),BODY_HEIGHT)
  return <>{pages.map((blocks,i)=><Page size="A4" style={s.page} key={i}>
    <View style={s.header} fixed><Mark size={18}/><Text style={s.brand}>ALYOXA</Text><Text style={s.headerLabel}>Intelligent Reports</Text><Text style={s.headerRight}>{r.kind==='scan'?'Quick Scan':'Full Website Audit'}</Text></View>
    <Text fixed style={{position:'absolute',top:57,left:42,fontSize:6.5,color:C.muted}}>{blocks[0]?.section}{i?' / continued':''}</Text>
    <View id="report-body" fixed style={{position:'absolute',top:BODY_TOP,left:42,width:BODY_WIDTH,height:BODY_HEIGHT}}>{blocks.map(block=><BlockView key={block.id} block={block} report={r}/>)}</View>
    <View style={s.footer} fixed><Text>ALYOXA / Saved evidence, clear next steps.</Text></View><Text fixed style={{position:'absolute',top:803,right:42,width:100,fontSize:7,color:C.muted,textAlign:'right'}} render={({pageNumber,totalPages})=>`Page ${pageNumber} of ${totalPages}`}/>
  </Page>)}</>
}
export function QuickScanPdf({report}:{report:WebsitePdfReport}) {
  return <Document title="ALYOXA Quick Scan" author="ALYOXA"><Cover report={report}/><ContentPages report={report}/></Document>
}
export function FullAuditPdf({report}:{report:WebsitePdfReport}) {
  return <Document title="ALYOXA Full Website Audit" author="ALYOXA"><Cover report={report}/><ContentPages report={report}/></Document>
}
