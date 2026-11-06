import React from 'react'
import { Document, Page, Text, View, Link, Font, StyleSheet, Svg, Path, Circle, Rect } from '@react-pdf/renderer'
import path from 'node:path'
import type { WebsitePdfReport, ReportPage } from './data'
import { safeLink } from './data'

Font.register({ family: 'Satoshi', fonts: [
  { src: path.join(process.cwd(), 'public/fonts/Satoshi-Regular.woff2'), fontWeight: 400 },
  { src: path.join(process.cwd(), 'public/fonts/Satoshi-Bold.woff2'), fontWeight: 700 },
] })
Font.registerHyphenationCallback(word => word.length > 40 ? word.match(/.{1,32}/gu) ?? [word] : [word])
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
function Url({ value, light = false }: { value: string; light?: boolean }) {
  const url = safeLink(value)
  return url ? <Link src={url} style={{ ...s.link, ...(light ? { color: '#BFF4EF', fontSize: 11 } : {}) }}>{clean(url)}</Link>
    : <Text style={s.small}>URL unavailable</Text>
}
function Label({ children }: { children: React.ReactNode }) { return <Text style={s.eyebrow}>{children}</Text> }
function Title({ title, subtitle }: { title: string; subtitle: string }) {
  return <View minPresenceAhead={80}><Label>WEBSITE INTELLIGENCE / SAVED EVIDENCE</Label><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text></View>
}
function Sheet({ report, children }: { report: WebsitePdfReport; children: React.ReactNode }) {
  return <Page size="A4" style={s.page} wrap>
    <View style={s.header} fixed><Mark size={18}/><Text style={s.brand}>ALYOXA</Text><Text style={s.headerLabel}>Intelligent Reports</Text><Text style={s.headerRight}>{report.kind === 'scan' ? 'Quick Scan' : 'Full Website Audit'}</Text></View>
    {children}
    <View style={s.footer} fixed><Text>ALYOXA / Saved evidence, clear next steps.</Text></View><Text fixed style={{ position: 'absolute', top: 803, right: 42, width: 100, fontSize: 7, color: C.muted, textAlign: 'right' }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}/>
  </Page>
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
    <View style={{ marginTop: 44, maxWidth: 440 }}><Url value={r.target} light/><View style={{ height: 1, width: 50, backgroundColor: C.aqua, marginTop: 18, marginBottom: 18 }}/>
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
function Status({ value }: { value: string }) {
  const caution = value !== 'completed' && value !== 'low'
  return <Text style={{ ...s.badge, backgroundColor: caution ? '#FFF0DA' : '#DDF3EC', color: caution ? '#91570B' : '#08735C' }}>{clean(value)}</Text>
}
function Executive({ report: r }: { report: WebsitePdfReport }) {
  return <><Title title="Executive Summary" subtitle="A measured review of your website, grounded in saved HTML evidence."/><Metrics report={r}/>
    <View style={{ ...s.row, gap: 16, marginBottom: 22 }}><View style={{ width: '52%' }}><Text style={s.heading}>Run status</Text><Status value={r.status}/><Text style={{ ...s.small, marginTop: 10 }}>{r.status === 'completed' ? 'This run completed. Review the actual coverage before drawing broader conclusions.' : 'This run did not complete fully. Failed, skipped and unavailable checks remain distinct from successful measurements.'}</Text></View><View style={{ ...s.callout, width: '45%', marginTop: 18 }}><Text style={{ fontWeight: 700, marginBottom: 5 }}>What this report is</Text><Text style={s.small}>An interpretation of saved measurements. It does not rerun a scan, measure rankings, certify compliance or assign a score.</Text></View></View>
    <Text style={s.heading}>Key takeaways</Text>
    {(r.findings.length ? ['Start with medium-priority findings, then review the remaining supported issues.', 'Every finding links a practical fix to an affected URL and retained evidence.', 'Use coverage and unavailable checks to understand the limits of this result.'] : ['No supported issues were detected in the available measurements.', 'This is not proof that the website is free of issues.', 'Review missing measurements and excluded or failed pages before drawing conclusions.']).map((text, i) => <View key={text} style={{ ...s.row, marginBottom: 13 }}><Text style={{ color: C.teal, fontWeight: 700, width: 23 }}>0{i + 1}</Text><Text style={{ flex: 1 }}>{text}</Text></View>)}
    <View style={{ ...s.callout, marginTop: 24, backgroundColor: '#F2F5F8' }}><Text style={s.small}>Evidence date: {clean(r.createdAt)}</Text><Text style={s.small}>Interpretation version {r.issues.version}. Evidence remains tied to this historical run, not the export date.</Text></View>
  </>
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
function Notes({ lines, compact = false }: { lines: string[]; compact?: boolean }) {
  return <View style={{ ...s.callout, ...(compact ? { padding: 9, marginBottom: 7 } : {}) }}><Text style={{ fontWeight: 700, fontSize: compact ? 8 : 10, marginBottom: 6 }}>Important notes</Text>{[...new Set(lines)].map((v, i) => <Text key={i} style={s.note}>- {clean(v)}</Text>)}</View>
}
function Coverage({ report: r }: { report: WebsitePdfReport }) {
  return <><Title title="Coverage & Analysis" subtitle="What was analyzed, what completed and what remains unverified."/><CoverageGraphic report={r}/>
    <View style={s.metrics}>{[['Page cap', r.pageLimit], ['Retained candidates', r.pages.length], ['Analyzed URLs', r.issues.coverage.analyzedPages]].map(([label, value]) => <View key={String(label)} style={{ ...s.metric, minHeight: 65 }}><Text style={{ ...s.metricValue, fontSize: 23 }}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>)}</View><Notes lines={r.limitations}/>
  </>
}
function PriorityPlan({ report: r }: { report: WebsitePdfReport }) {
  const groups = r.issues.groups.filter(g => g.issues.length).sort((a, b) => Number(b.severity === 'medium') - Number(a.severity === 'medium'))
  return <>{!groups.length && <Text style={s.body}>No supported fix can be prioritized from the retained evidence.</Text>}{groups.map(g => <View key={g.ruleId} style={{ ...s.finding, borderLeftColor: g.severity === 'medium' ? C.gold : C.teal, backgroundColor: g.severity === 'medium' ? C.cream : '#F4FAFB', padding: 11 }} wrap={false}><View style={s.row}><Text style={{ ...s.findingTitle, fontSize: 10 }}>{g.title}</Text><Status value={g.severity}/></View><Text style={{ fontSize: 8, marginTop: 5 }}>{g.recommendedFix}</Text><Text style={{ ...s.small, marginTop: 5 }}>{g.affectedUrls.length} affected URL(s). Evidence and links follow below.</Text></View>)}</>
}
function Findings({ report: r, compact = false, startIndex = 0 }: { report: WebsitePdfReport; compact?: boolean; startIndex?: number }) {
  if (!r.findings.length) return <View style={s.callout}><Text>No supported issues were detected in the available evidence. Unavailable checks are not clean results.</Text></View>
  return <>{r.findings.map((f, i) => <View key={`${f.ruleId}:${f.affectedUrl}`} wrap={false} style={{ ...s.finding, ...(compact ? { padding: 7, marginBottom: 6 } : {}), borderLeftColor: f.severity === 'medium' ? C.gold : C.teal, backgroundColor: f.severity === 'medium' ? '#FFFAF3' : '#F5FAFB' }}>
    <View style={s.row}><Text style={{ ...s.findingTitle, ...(compact ? { fontSize: 10 } : {}) }}>{String(i + 1 + startIndex).padStart(2, '0')} / {f.title}</Text><Text style={{ ...s.badge, backgroundColor: f.severity === 'medium' ? '#FFE9C9' : '#DBF3F0', color: f.severity === 'medium' ? '#8C5206' : '#006B66' }}>{f.severity}</Text></View>
    {!compact && <Text style={{ ...s.small, marginTop: 3 }}>Rule: {f.ruleId} / Confidence: {f.confidence} in retained HTML</Text>}
    {!compact && <View style={{ marginTop: 4, marginBottom: 4 }}><Url value={f.affectedUrl}/></View>}<Text style={{ fontSize: compact ? 7.5 : 9 }}>{f.recommendedFix}</Text>
    {!compact && <><View style={s.evidence}><Text style={{ fontSize: 7, fontWeight: 700, marginBottom: 4 }}>EVIDENCE / RETAINED</Text>{f.evidenceReferences.map((e, j) => <Text key={j} style={s.small}>{e.evidenceId}: {clean(e.value)} / observation: {clean(e.observationId)}</Text>)}</View>{f.limitations.filter(v => !v.startsWith('Observed in fetched HTML only')).map((v, j) => <Text key={j} style={{ ...s.note, marginTop: 7, marginBottom: 0 }}>{clean(v)}</Text>)}</>}
  </View>)}</>
}
function Suggestions({ report: r, compact = false }: { report: WebsitePdfReport; compact?: boolean }) {
  return <><Text style={{ ...s.heading, ...(compact ? { fontSize: 10, marginTop: 12, marginBottom: 7 } : {}) }} minPresenceAhead={45}>{compact ? 'Saved AI / up to 3 excerpts (unverified)' : 'Saved AI suggestions / unverified'}</Text><Text style={s.small}>{r.suggestions.length ? 'Advice grounded in retained references, not verified defects. No AI was invoked during export.' : 'No usable evidence-linked AI suggestions were retained. No AI was invoked during export.'}</Text>{(compact ? r.suggestions.slice(0, 3) : r.suggestions).map((v, i) => <View key={i} wrap={!compact} style={{ ...s.callout, marginTop: compact ? 5 : 8, padding: compact ? 4 : 12 }}><Text style={{ fontSize: compact ? 7.5 : 9 }}>{clean(compact && v.text.length > 100 ? v.text.slice(0, 100) + '... [excerpt]' : v.text)}</Text>{compact && <Text style={{ ...s.small, fontSize: 7 }}>{clean(v.caveat.length > 100 ? v.caveat.slice(0,100) + '... [excerpt]' : v.caveat)}</Text>}{!compact && <><Text style={{ ...s.small, marginTop: 6 }}>{clean(v.caveat)}</Text><Url value={v.pageUrl}/><Text style={s.small}>Evidence IDs: {v.evidenceIds.join(', ')}</Text></>}</View>)}</>
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function display(value: unknown): string { return ['string', 'number', 'boolean'].includes(typeof value) ? clean(value) : 'Unavailable' }
function Evidence({ pages, compact = false }: { pages: ReportPage[]; compact?: boolean }) {
  return <>{pages.map((p, i) => {
    const m = record(p.metadata), rows = Array.isArray(m.evidence) ? m.evidence.map(record) : []
    return <View key={`${p.url}:${i}`} style={{ marginBottom: compact ? 9 : 18 }}>
      <View minPresenceAhead={55} style={{ marginTop: compact ? 0 : 8, marginBottom: 6 }}><Url value={p.final_url ?? p.url}/><Text style={{ ...s.small, fontSize: compact ? 6.5 : 7 }}>State: {clean(p.status)} / {p.admitted === false ? 'Not admitted' : p.admitted === true ? 'Admitted' : 'Admission not retained'} / observation: {clean(p.observation_id ?? 'unavailable')}</Text>{p.reason && <Text style={s.small}>Coverage reason: {clean(p.reason)}</Text>}</View>
      {rows.length ? <><View style={s.tableHead} wrap={false}><Text style={s.key}>Measurement / evidence ID</Text><Text style={s.value}>Retained value</Text></View>{rows.map((e, j) => <View key={j} style={{ ...s.tableRow, ...(compact ? { paddingVertical: 4, fontSize: 6.8 } : {}), backgroundColor: j % 2 ? '#F6F9FB' : '#FFFFFF' }} wrap={false}><Text style={s.key}>{clean(e.label ?? e.id)}{e.label && e.id ? ` (${clean(e.id)})` : ''}</Text><Text style={s.value}>{display(e.value) || '(empty string)'}</Text></View>)}</> : <View style={s.callout}><Text style={s.small}>Measurements unavailable. This page is a coverage outcome, not a verified website issue.</Text></View>}
    </View>
  })}</>
}
function PageOverview({ report: r }: { report: WebsitePdfReport }) {
  return <><View style={s.tableHead} wrap={false}><Text style={{ width: '44%' }}>Affected / candidate URL</Text><Text style={{ width: '18%' }}>Status</Text><Text style={{ width: '38%' }}>Measured HTML</Text></View>{r.pages.map((p, i) => {
    const entries = record(p.metadata).evidence
    const evidence = Array.isArray(entries) ? entries.map(record) : []
    const value = (id: string) => { const items = evidence.filter(e => e.id === id); return items.length === 1 ? items[0].value : undefined }
    const title = value('title'), description = value('description'), h1 = value('h1')
    const measured = p.status === 'completed'
    return <View key={i} style={{ ...s.tableRow, backgroundColor: i % 2 ? '#F5F9FB' : C.white }} wrap={false}><View style={{ width: '44%', paddingRight: 9 }}><Url value={p.final_url ?? p.url}/></View><Text style={{ width: '18%', fontSize: 7, color: measured ? '#00766D' : p.status === 'failed' ? C.red : C.muted }}>{clean(p.status)}</Text><Text style={{ width: '38%', fontSize: 7 }}>{measured ? `Title: ${typeof title === 'string' ? title.trim() ? 'present' : 'empty' : 'unavailable'} / Description: ${typeof description === 'string' ? description.trim() ? 'present' : 'empty' : 'unavailable'} / H1: ${typeof h1 === 'number' ? h1 : 'unavailable'}` : 'Measurements unavailable'}</Text></View>
  })}</>
}
function Rules({ report: r, compact = false }: { report: WebsitePdfReport; compact?: boolean }) {
  return <><View style={s.tableHead} wrap={false}><Text style={{ width: '60%' }}>Supported rule / check</Text><Text style={{ width: '20%' }}>Measured</Text><Text style={{ width: '20%' }}>Unavailable</Text></View>{r.issues.groups.map(g => <View key={g.ruleId} style={{ ...s.tableRow, ...(compact ? { paddingVertical: 3, fontSize: 6.8 } : {}) }} wrap={false}><Text style={{ width: '60%' }}>{g.title}</Text><Text style={{ width: '20%' }}>{g.measuredPages}</Text><Text style={{ width: '20%' }}>{g.unknownPages}</Text></View>)}</>
}
function Resources({ report: r }: { report: WebsitePdfReport }) {
  return <><Text style={s.heading} minPresenceAhead={60}>Shared resource checks</Text>{!r.issues.resources.length && <Text style={s.small}>No supported robots/sitemap resource results were retained.</Text>}{r.issues.resources.map((v, i) => <View key={i} style={{ ...s.tableRow, flexDirection: 'column' }} wrap={false}><Text style={{ fontWeight: 700 }}>{v.kind}: {clean(v.status)} / HTTP {v.httpStatus ?? 'unavailable'}</Text><Url value={v.url}/></View>)}</>
}
function Provenance({ report: r }: { report: WebsitePdfReport }) {
  return <Text style={{ ...s.small, marginTop: 15 }}>Run: {clean(r.id)} / Interpretation version {r.issues.version}. Unsupported font glyphs use explicit Unicode codes, not inferred translations. Linked evidence belongs to the selected historical run.</Text>
}
function QuickEvidence({ report: r, short = false }: { report: WebsitePdfReport; short?: boolean }) {
  return <>{short && <Text style={{ ...s.heading, fontSize: 10, marginTop: 13 }} minPresenceAhead={55}>Evidence & coverage</Text>}<Evidence pages={r.pages} compact/>{short ? <Text style={s.small}>Unavailable rules: {r.issues.groups.filter(g => !g.measuredPages).map(g => g.title).join(', ') || 'None among the supported rules'}.</Text> : <Rules report={r} compact/>}<View style={{ marginTop: 9 }}><Notes lines={[...r.limitations, ...r.findings.flatMap(f => f.limitations.filter(v => !v.startsWith('Observed in fetched HTML only'))), 'Rendered content and intent are not verified. Priority is not a compliance or ranking assessment.']} compact/></View><Provenance report={r}/></>
}
export function QuickScanPdf({ report: r }: { report: WebsitePdfReport }) {
  const short = r.findings.length <= 2 && r.pages.length === 1 && !r.suggestions.length && evidenceHeight(r.pages[0]) + r.limitations.reduce((n,v) => n + lines(v,100)*11,0) + r.findings.length*45 < 440
  return <Document title="ALYOXA Quick Scan" author="ALYOXA">
    <Cover report={r}/>
    <Sheet report={r}><Title title="Your next steps, clearly." subtitle="One fetched URL. Supported issues and practical fixes from retained HTML."/><Metrics report={r} compact/><View style={{ marginBottom: 10 }}><Url value={r.target}/></View><Findings report={r} compact/>{short ? <><Text style={s.small}>AI suggestions unavailable for this result. No AI was invoked during export.</Text><QuickEvidence report={r} short/></> : <>{r.suggestions.length > 0 && <Suggestions report={{...r,suggestions:r.suggestions.slice(0,2)}} compact/>}<Text style={{ ...s.small, marginTop: 12 }}>Priority is a review order, not a ranking or compliance assessment. No supported finding is not proof of a clean website. Review the coverage and evidence on the following page.</Text></>}</Sheet>
    {!short && <Sheet report={r}><Title title="Evidence & Coverage" subtitle="The measured record behind this Quick Scan. Missing checks remain unavailable."/><QuickEvidence report={r}/>{r.suggestions.length > 2 && <Suggestions report={{...r,suggestions:r.suggestions.slice(2,3)}} compact/>}</Sheet>}
  </Document>
}
// Content budgets keep large documents bounded without a fixed item count.
// Estimates are deliberately conservative; React PDF retains final line wrapping.
function lines(text: unknown, width: number) { return Math.max(1, Math.ceil(clean(text).length / width)) }
function paginate<T>(items: T[], height: (item: T) => number, firstBudget = 620, laterBudget = 650) {
  const result: T[][] = []; let current: T[] = [], used = 0, budget = firstBudget
  for (const item of items) {
    const cost = height(item)
    if (current.length && used + cost > budget) { result.push(current); current = []; used = 0; budget = laterBudget }
    current.push(item); used += cost
  }
  if (current.length) result.push(current)
  return result
}
function evidenceHeight(p: ReportPage) {
  const rows = record(p.metadata).evidence
  return 65 + (Array.isArray(rows) ? rows.map(record).reduce((n, e) => n + 12 + 12 * Math.max(lines(e.label ?? e.id, 38), lines(display(e.value), 63)), 0) : 40)
}
export function FullAuditPdf({ report: r }: { report: WebsitePdfReport }) {
  const planGroups = r.issues.groups.filter(g => g.issues.length).length
  const findingPages = paginate(r.findings, f => 100 + 10 * (lines(f.affectedUrl, 75) + lines(f.recommendedFix, 86) + f.evidenceReferences.reduce((n,e) => n + lines(`${e.evidenceId}: ${display(e.value)} / ${e.observationId}`, 88), 0) + f.limitations.filter(v => !v.startsWith('Observed in fetched HTML only')).reduce((n,v) => n + lines(v, 95), 0)), Math.max(175, 580 - (planGroups*110 + 150)))
  const overviewPages = paginate(r.pages, p => 17 + 12 * Math.max(lines(p.final_url ?? p.url, 45), 2), 590)
  const evidencePages = paginate(r.pages, evidenceHeight, 610)
  const suggestionPages = paginate(r.suggestions, v => 85 + 15 * (lines(v.text, 90) + lines(v.caveat, 95)), 530)
  return <Document title="ALYOXA Full Website Audit" author="ALYOXA">
    <Cover report={r}/>
    <Sheet report={r}><Executive report={r}/></Sheet>
    <Sheet report={r}><Coverage report={r}/></Sheet>
    {(findingPages.length ? findingPages : [[]]).map((findings,i) => <Sheet report={r} key={`findings-${i}`}>
      <Title title={i === 0 ? 'From Evidence to Action' : `Verified Findings / continued`} subtitle="Prioritized fixes, affected URLs and the retained measurements that support them."/>
      {i === 0 && r.findings.length > 0 && <PriorityPlan report={r}/>}
      {i === 0 && <Text style={s.heading} minPresenceAhead={100}>Verified findings</Text>}<Text style={{ ...s.small, marginBottom: 13 }}>Observed in fetched HTML only; rendered content and intent are not verified. Severity is a review priority, not a compliance or ranking assessment.</Text><Findings report={{...r,findings}} startIndex={findingPages.slice(0,i).reduce((n,items) => n + items.length,0)}/>
    </Sheet>)}
    {overviewPages.map((pages,i) => <Sheet report={r} key={`overview-${i}`}><Title title={i ? 'Page-Level Evidence / continued' : 'Page-Level Evidence'} subtitle="A compact index of what completed, what failed and what remains unavailable."/><PageOverview report={{...r,pages}}/><View style={{ marginTop: 20 }}><Notes lines={['A completed fetch is not proof that all checks passed.', 'Failed and excluded URLs remain coverage outcomes, not website issues.', 'The following retained measurements provide the evidence behind this index.']}/></View></Sheet>)}
    {evidencePages.map((pages,i) => <Sheet report={r} key={`evidence-${i}`}><Title title={i ? 'Retained Measurements / continued' : 'Retained Measurements'} subtitle="Saved HTML values, exact observation references and explicit unavailable states."/><Evidence pages={pages}/></Sheet>)}
    {suggestionPages.map((suggestions,i) => <Sheet report={r} key={`suggestions-${i}`}><Title title="Saved AI Suggestions" subtitle="Unverified advice, kept separate from the measured findings."/><Suggestions report={{...r,suggestions}}/></Sheet>)}
    <Sheet report={r}><Title title="Technical Appendix" subtitle="Rule coverage, shared resource checks and evidence provenance."/><Rules report={r}/><Resources report={r}/>{!r.suggestions.length && <Text style={{ ...s.small, marginTop: 15 }}>AI suggestions: no usable evidence-linked output was retained. No AI was invoked during export.</Text>}<Text style={s.heading} minPresenceAhead={65}>How to interpret these checks</Text><Notes lines={['Measured / unavailable counts refer to unique analyzed URLs. Failed pages do not become clean checks.', 'Declared canonical URLs and JSON-LD counts, where retained, are measurements rather than validated implementations.', 'Individual image locations were not retained; missing-alt findings require page-level review.']}/><Provenance report={r}/></Sheet>
  </Document>
}
