import { OverviewSidebar } from '@/components/os/OverviewSidebar';
import { SignalHeader } from '@/components/os/signal/SignalHeader';
import { SignalSubNav, SignalTab } from '@/components/os/signal/SignalSubNav';
import { PersistedSignalWorkspace } from '@/components/os/signal/PersistedSignalWorkspace';
import { listWorkspaceObservations } from '@/actions/signal/listWorkspaceObservations';
import { listWorkspaceWebsiteScans } from '@/actions/signal/listWorkspaceWebsiteScans';
import { listWorkspaceFeedSources } from '@/actions/signal/listWorkspaceFeedSources';

interface SignalPageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function SignalPage({ searchParams }: SignalPageProps) {
  const [observations, sources, history] = await Promise.all([listWorkspaceObservations(), listWorkspaceFeedSources(), listWorkspaceWebsiteScans()]);
  const resolvedParams = await searchParams;
  const rawTab = resolvedParams?.tab;

  // Strict validation for active tab
  const activeTab: SignalTab =
    rawTab === 'sources' || rawTab === 'patterns' || rawTab === 'insights'
      ? rawTab
      : 'live_stream';

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
      {/* Shared OS Navigation */}
      <OverviewSidebar />

      {/* Main Signal Environment */}
      <div className="flex-1 flex flex-col min-w-0">
        <SignalHeader sourceCount={sources.success ? sources.data.length : undefined} />
        <SignalSubNav activeTab={activeTab} />

        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
          {/* Signal Context Header */}
          <section className="space-y-1.5 border-b border-[var(--border)] pb-5">
            <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase flex items-center gap-2">
              <span className="text-[var(--signal)]">IN.00-IN.04</span>
              <span>{'//'}</span>
              <span>INTELLIGENCE_OBSERVATION_LAYER</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] uppercase font-mono">
              Signal Telemetry &amp; Ingestion
            </h1>
            <p className="text-xs text-[var(--muted)] max-w-2xl">
              Persisted website measurements, supporting evidence, coverage limits, and AI recommendations when configured.
            </p>
          </section>

          <section className="space-y-2 border border-[var(--border)] p-4 text-xs">
            <h2>Recent scan history (up to 50 scans)</h2>
            {!history.success ? <p role="alert">{history.error}</p> : history.data.length === 0 ? <p>No website scans recorded.</p> : history.data.map(scan => <article key={scan.id} className="border-b border-[var(--border)] py-2"><p>{scan.created_at} ? {scan.id}</p><p>{scan.status === 'completed' && scan.observationCount === 0 ? 'UNVERIFIED: completed status without retained observations. Submit a new analysis.' : scan.status} ? {scan.observationCount} retained observations</p>{scan.error_message && <p>{scan.error_message}</p>}</article>)}
          </section>
          {/* Active View Stage */}
          <section>
            {activeTab === 'patterns' ? <p>Cross-scan patterns are not generated yet. View measured observations in the stream.</p> : (
              <PersistedSignalWorkspace activeTab={activeTab === 'sources' ? 'sources' : 'live_stream'}
                observations={observations.success ? observations.data : []}
                sources={sources.success ? sources.data : []}
                observationError={observations.success ? undefined : observations.error}
                sourceError={sources.success ? undefined : sources.error} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}