import Link from 'next/link'
import { PageHeader } from '@/components/os/shell/PageHeader'
import { StatusBadge } from '@/components/os/shell/StatusBadge'
import { SignalSubNav, SignalTab } from '@/components/os/signal/SignalSubNav';
import { PersistedSignalWorkspace } from '@/components/os/signal/PersistedSignalWorkspace';
import { listWorkspaceObservations } from '@/actions/signal/listWorkspaceObservations';
import { listWorkspaceWebsiteScans } from '@/actions/signal/listWorkspaceWebsiteScans';
import { listWorkspaceFeedSources } from '@/actions/signal/listWorkspaceFeedSources';
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace';
import { WorkspaceReadBoundary } from '@/components/os/shell/WorkspaceReadBoundary';

interface SignalPageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function SignalPage({ searchParams }: SignalPageProps) {
  const [observations, sources, history, workspace] = await Promise.all([listWorkspaceObservations(), listWorkspaceFeedSources(), listWorkspaceWebsiteScans(), getActiveWorkspace()]);
  const resolvedParams = await searchParams;
  const rawTab = resolvedParams?.tab;

  // Strict validation for active tab
  const activeTab: SignalTab =
    rawTab === 'sources' || rawTab === 'patterns' || rawTab === 'insights'
      ? rawTab
      : 'live_stream';

  return <WorkspaceReadBoundary workspaceId={workspace.success ? workspace.data.id : null}><div className="os-module-page">
    <PageHeader title="My Websites" description="See which websites are connected, what has been checked and the measurements saved for this workspace." action={<Link href="/app#website-checks" className="os-button os-button-teal">Check a website</Link>} />
    <SignalSubNav activeTab={activeTab} />
    <section className="os-panel os-section-body">
      {activeTab === 'patterns' ? <><h2>Trends are not available yet</h2><p>ALYOXA does not currently compare checks over time. You can still review each saved result.</p><Link href="/app/ai" className="os-text-link">View previous results</Link></> : <PersistedSignalWorkspace activeTab={activeTab === 'sources' ? 'sources' : 'live_stream'} observations={observations.success ? observations.data : []} sources={sources.success ? sources.data : []} observationError={observations.success ? undefined : observations.error} sourceError={sources.success ? undefined : sources.error} />}
    </section>
    <details className="os-panel os-section-body"><summary>Recent homepage check history</summary><p>Up to 50 recent checks. A check that could not finish is not a confirmed website problem.</p>
    {!history.success ? <p role="alert">{history.error} Try reloading this page.</p> : !history.data.length ? <p>No homepage checks yet. Use Check a website to get started.</p> : history.data.map(scan => <article className="os-history-row" key={scan.id}><StatusBadge status={scan.status} /><time dateTime={scan.created_at}>{new Date(scan.created_at).toLocaleString('en', {timeZone:'UTC'})} UTC</time><p>{scan.observationCount ? 'Saved findings are available in Reports & Recommendations.' : scan.status === 'completed' ? 'No measurements were retained. Run a new check to verify this result.' : 'Measurements will be available after a successful check.'}</p><details><summary>Technical details</summary><p>Check ID: {scan.id}</p>{scan.error_message && <p>{scan.error_message}</p>}</details></article>)}
    </details>
  </div></WorkspaceReadBoundary>
}
