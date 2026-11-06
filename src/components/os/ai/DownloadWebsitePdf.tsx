 'use client'
import { useState } from 'react'
import styles from './WebsiteResults.module.css'
export function DownloadWebsitePdf({ kind, runId }: { kind: 'scan'|'audit'; runId: string }) {
 const [busy,setBusy]=useState(false), [error,setError]=useState('')
 async function download() {
  setBusy(true); setError('')
  try {
   const response=await fetch(`/api/reports/website/${kind}/${encodeURIComponent(runId)}`, {credentials:'same-origin',cache:'no-store'})
   if (!response.ok || !response.headers.get('content-type')?.startsWith('application/pdf')) throw new Error(response.status===409 ? 'This run is still processing or its retained evidence is incomplete.' : 'PDF unavailable. Check workspace access and try again.')
   const url=URL.createObjectURL(await response.blob()), link=document.createElement('a'); link.href=url; link.download=`alyoxa-${kind}-${runId}.pdf`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),60000)
  } catch(e) { setError(e instanceof Error ? e.message : 'PDF unavailable.') } finally { setBusy(false) }
 }
 return <section className={styles.download} aria-label="Download PDF report"><div><p className={styles.downloadEyebrow}>ALYOXA / Intelligent Reports</p><h2>The full picture. Beautifully presented.</h2><p>Take your saved findings, coverage and actionable fixes with you. Access and retained evidence are checked securely before export.</p></div><div className={styles.downloadAction}><button type="button" className={styles.downloadButton} disabled={busy} aria-busy={busy} onClick={download}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>{busy ? 'Preparing your report...' : 'Download PDF Report'}</button><span>Private export / Saved evidence only</span></div>{error && <p className={styles.downloadError} role="alert">{error}</p>}</section>
}
