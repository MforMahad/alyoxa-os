import Link from 'next/link'
import { OSAppShell } from '@/components/os/shell/OSAppShell'
import { PageHeader } from '@/components/os/shell/PageHeader'
import { StatusBadge } from '@/components/os/shell/StatusBadge'
import { OSIcon } from '@/components/os/shell/OSIcon'
import OSConstellation from '@/components/os/OSConstellation'
import WorkspaceSignalEntry from '@/components/os/workspace/WorkspaceSignalEntry'
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace'
import { listWorkspaceWebsiteScans } from '@/actions/signal/listWorkspaceWebsiteScans'
import { listWorkspaceFeedSources } from '@/actions/signal/listWorkspaceFeedSources'

export default async function OSOverviewPage() {
  const active = await getActiveWorkspace()
  const [sources, scans] = active.success ? await Promise.all([listWorkspaceFeedSources(active.data.id), listWorkspaceWebsiteScans()]) : [null, null]
  const websites = sources?.success ? sources.data.filter(source => source.source_type === 'website') : null
  const recent = scans?.success ? scans.data : null
  return <OSAppShell>
    <PageHeader eyebrow="Overview" title="Make room for your next move." description="Your websites, work and knowledge. Connected in one workspace." />
    <section className="os-overview-hero" aria-label="Get started">
      <div className="os-hero-copy"><span className="os-hero-kicker">Clarity starts here</span><h2>Understand your website.<br /><span>Know what to do next.</span></h2>
        <p>Check your website, explore what was found, and turn clear recommendations into your next steps.</p>
        <div className="os-hero-actions"><a href="#website-checks" className="os-button os-button-primary">Check a website <span aria-hidden="true">&rarr;</span></a><Link href="/app/ai" className="os-hero-secondary">View saved results <span aria-hidden="true">&rarr;</span></Link></div>
      </div>
      <div className="os-hero-steps" aria-label="How it works">
        {[['01', 'Add your website', 'Start with a public website URL.'], ['02', 'Choose your check', 'Check the homepage or run an available multi-page audit.'], ['03', 'Find your next step', 'Review findings, affected pages and recommended fixes.']].map(([number, title, description]) => <div className="os-hero-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></div>)}
      </div>
    </section>
    {!active.success ? <section className="os-panel os-empty-state"><h2>Choose a workspace to get started</h2><p role="alert">{active.error}</p><Link className="os-text-link" href="/app/onboarding">Open workspace setup &rarr;</Link></section> : <>
      <div className="os-workspace-snapshot" aria-label="Recent website activity">
        <div><span>Websites added</span><strong>{websites?.length ?? '\u2014'}</strong><small>{websites ? 'Connected website sources' : 'Website list unavailable'}</small></div>
        <div><span>Recent homepage scans</span><strong>{recent?.length ?? '\u2014'}</strong><small>Latest 50 scans at most</small></div>
        <div><span>Homepage scans in progress</span><strong>{recent ? recent.filter(scan => ['queued', 'processing'].includes(scan.status)).length : '\u2014'}</strong><small>From the recent scan history</small></div>
      </div>
      {sources && !sources.success && <p role="alert" className="os-inline-error">{sources.error}</p>}
      <div className="os-overview-columns">
        <section id="website-audits" className="os-scanner-panel os-panel">
          <div id="website-checks" className="os-section-heading"><div><p className="os-eyebrow">Website intelligence</p><h2>A little insight. A clearer direction.</h2><p>Start a check or review your audit history. Full audits appear when enabled for this workspace.</p></div></div>
          <div className="os-scanner"><WorkspaceSignalEntry /></div>
        </section>
        <aside className="os-activity-panel os-panel" aria-label="Recent homepage scans">
          <div className="os-section-heading"><p className="os-eyebrow">Your activity</p><h2>Recent checks</h2><p>Homepage scans in this workspace.</p></div>
          {!scans?.success ? <p role="alert" className="os-inline-error">{scans?.error ?? 'Scan history is unavailable.'}</p> : scans.data.length === 0 ? <div className="os-empty-state"><OSIcon name="audit" className="h-8 w-8" /><h3>Your first insight is one check away.</h3><p>Add a website to see its check history here.</p></div> : <ol className="os-activity-list">{scans.data.slice(0, 4).map(scan => <li key={scan.id}><span className="os-activity-marker" aria-hidden="true" /><div><div className="flex flex-wrap items-center justify-between gap-2"><h3>Homepage check</h3><StatusBadge status={scan.status} /></div><time dateTime={scan.created_at}>{new Date(scan.created_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC</time>{scan.status === 'completed' && scan.observationCount === 0 && <p>Finished status has no saved findings. Run a new check to verify.</p>}{scan.error_message && <details><summary>Why this check needs attention</summary><p className="break-words">{scan.error_message}</p></details>}</div></li>)}</ol>}
          <Link href="/app/signal" className="os-text-link">Browse measurements & history <span aria-hidden="true">&rarr;</span></Link>
        </aside>
      </div>
    </>}
    <section className="os-tools-section" aria-label="Workspace tools"><div className="os-section-heading"><p className="os-eyebrow">Beyond your website</p><h2>A workspace that grows with you.</h2><p>Your existing tools for work, collaboration and saved information. These areas currently include example content.</p></div>
      <div className="os-tool-grid">{([{ href: '/app/forge', icon: 'tasks', title: 'Tasks', text: 'Explore tasks, processing steps and work history.' }, { href: '/app/pulse', icon: 'people', title: 'Requests & Approvals', text: 'Explore requests, conversations and approval workflows.' }, { href: '/app/vault', icon: 'library', title: 'Library', text: 'Explore saved files, information and folders.' }] as const).map(tool => <Link href={tool.href} key={tool.href} className="os-tool-link"><OSIcon name={tool.icon} className="os-tool-icon" /><div><h3>{tool.title}</h3><p>{tool.text}</p></div><span aria-hidden="true">&rarr;</span></Link>)}</div>
    </section>
    <details className="os-architecture"><summary>Under the surface: how ALYOXA OS is organized</summary><p>Signal, AI Core, Forge, Pulse and Vault connect measurements, reasoning, work, collaboration and knowledge. This diagram describes the architecture, not live system activity.</p><div className="mx-auto max-w-4xl p-4"><OSConstellation /></div></details>
  </OSAppShell>
}
