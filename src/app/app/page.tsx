import Link from 'next/link'
import { PageHeader } from '@/components/os/shell/PageHeader'
import { StatusBadge } from '@/components/os/shell/StatusBadge'
import { WebsiteOverview } from '@/components/os/shell/WebsiteOverview'
import WorkspaceSignalEntry from '@/components/os/workspace/WorkspaceSignalEntry'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { listWorkspaceWebsiteScans } from '@/actions/signal/listWorkspaceWebsiteScans'
import { listWorkspaceFeedSources } from '@/actions/signal/listWorkspaceFeedSources'
import { listWorkspaceObservations } from '@/actions/signal/listWorkspaceObservations'
import { WorkspaceReadBoundary } from '@/components/os/shell/WorkspaceReadBoundary'

export default async function OSOverviewPage() {
 const active = await getActiveWorkspace()
 const [sources, scans, observations] = active.success ? await Promise.all([listWorkspaceFeedSources(active.data.id), listWorkspaceWebsiteScans(), listWorkspaceObservations()]) : [null,null,null]
 return <WorkspaceReadBoundary workspaceId={active.success ? active.data.id : null}><div className="os-overview-page">
  <PageHeader title="Your business workspace" description="Check your websites, understand the findings and decide what to fix next. Your work and saved information are one click away." action={active.success ? <a className="os-button os-button-teal" href="#website-checks">Check a website</a> : <Link className="os-button os-button-teal" href="/app/onboarding">Open workspace setup</Link>} />
  {!active.success ? <section className="os-panel os-section-body"><h2>Choose a workspace to continue</h2><p role="alert">{active.error}</p><Link href="/app/onboarding" className="os-text-link">Open workspace setup</Link></section> : <>
   {sources?.success ? <WebsiteOverview sources={sources.data} observations={observations?.success ? observations.data : []} resultsAvailable={Boolean(observations?.success)} /> : <section className="os-panel os-section-body"><h2>Your websites could not be loaded</h2><p role="alert">{sources?.error ?? 'Website list unavailable.'} Reload this page to try again.</p></section>}
   {observations && !observations.success && <p className="os-inline-error" role="alert">{observations.error} Website findings are unavailable, not confirmed clear.</p>}
   <div className="os-overview-columns">
    <section id="website-audits" className="os-panel os-scanner-panel"><div id="website-checks" className="os-section-heading"><h2>Check a website</h2><p>Quick Scan checks the homepage. Full Website Audit checks multiple pages when enabled. Both save results for this workspace.</p></div><div className="os-scanner"><WorkspaceSignalEntry /></div></section>
    <aside className="os-panel os-activity-panel"><div className="os-section-heading"><h2>What was checked recently?</h2><p>The latest homepage checks. Multi-page audit history is in Website Audits.</p></div>
     {!scans?.success ? <p role="alert" className="os-inline-error">{scans?.error ?? 'History unavailable.'} Reload to try again.</p> : !scans.data.length ? <div className="os-empty-state"><h3>No homepage checks yet</h3><p>Enter a website to start. Completed checks and their results will appear here.</p></div> : <ol className="os-activity-list">{scans.data.slice(0,4).map(scan => <li key={scan.id}><div><div className="flex flex-wrap items-center justify-between gap-2"><h3>Homepage check</h3><StatusBadge status={scan.status} /></div><time dateTime={scan.created_at}>{new Date(scan.created_at).toLocaleString('en',{timeZone:'UTC'})} UTC</time><p>{scan.status==='failed' ? 'This check could not finish. It does not confirm a website problem.' : scan.status==='completed' && !scan.observationCount ? 'No saved findings. Run a new check to verify this result.' : scan.observationCount ? 'Results are saved. Review them to see what to fix.' : 'Results will appear after the check finishes.'}</p><details><summary>Technical details</summary><p>Check ID: {scan.id}</p>{scan.error_message && <p>{scan.error_message}</p>}</details></div></li>)}</ol>}
     <Link href="/app/ai" className="os-text-link">View previous results &amp; recommendations</Link>
    </aside>
   </div>
  </>}
  <section className="os-panel os-section-body"><h2>More in your workspace</h2><p>Explore existing tools for work, collaboration and knowledge. These areas contain clearly labeled example records.</p><div className="os-tool-grid">{[['/app/forge','Tasks','Explore work items and their progress.'],['/app/pulse','Requests & Approvals','Explore requests and conversations.'],['/app/vault','Library','Find example files and saved information.']].map(([href,title,text])=><Link className="os-tool-link" key={href} href={href}><div><h3>{title}</h3><p>{text}</p></div><span aria-hidden="true">&rarr;</span></Link>)}</div></section>
 </div></WorkspaceReadBoundary>
}
