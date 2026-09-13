import { OverviewSidebar } from '@/components/os/OverviewSidebar';
import { SignalHeader } from '@/components/os/signal/SignalHeader';
import { SignalSubNav, SignalTab } from '@/components/os/signal/SignalSubNav';
import { SignalStreamWorkspace } from '@/components/os/signal/SignalStreamWorkspace';
import { SignalSourcesWorkspace } from '@/components/os/signal/SignalSourcesWorkspace';
import { SignalPatternsWorkspace } from '@/components/os/signal/SignalPatternsWorkspace';
import { SignalInsightsWorkspace } from '@/components/os/signal/SignalInsightsWorkspace';
import { SignalWorkspacePlaceholder } from '@/components/os/signal/SignalWorkspacePlaceholder';
import {
  signalObservations,
  signalFeedSources,
  signalPatterns,
  signalInsights,
} from '@/data/os/signal';

interface SignalPageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function SignalPage({ searchParams }: SignalPageProps) {
  const resolvedParams = await searchParams;
  const rawTab = resolvedParams?.tab;

  // Strict validation for active tab
  const activeTab: SignalTab =
    rawTab === 'sources' || rawTab === 'patterns' || rawTab === 'insights'
      ? rawTab
      : 'live_stream';

  return (
    <div className="flex min-h-screen `bg-[var(--background)] text-[var(--foreground)]` font-sans antialiased">
      {/* Shared OS Navigation */}
      <OverviewSidebar />

      {/* Main Signal Environment */}
      <div className="flex-1 flex flex-col min-w-0">
        <SignalHeader />
        <SignalSubNav activeTab={activeTab} />

        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
          {/* Signal Context Header */}
          <section className="space-y-1.5 border-b `border-[var(--border)]` pb-5">
            <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase flex items-center gap-2">
              <span className="`text-[var(--signal)]`">IN.00-IN.04</span>
              <span>//</span>
              <span>INTELLIGENCE_OBSERVATION_LAYER</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight `text-[var(--foreground)]` uppercase font-mono">
              Signal Telemetry &amp; Ingestion
            </h1>
            <p className="text-xs `text-[var(--muted)]` max-w-2xl">
              Continuous observation runtime. Capturing inbound webhook streams, user telemetry, auth sequences, and system state transitions.
            </p>
          </section>

          {/* Active View Stage */}
          <section>
            {activeTab === 'sources' ? (
              <SignalSourcesWorkspace sources={signalFeedSources} />
            ) : activeTab === 'patterns' ? (
              <SignalPatternsWorkspace
                patterns={signalPatterns}
                sources={signalFeedSources}
                observations={signalObservations}
              />
            ) : activeTab === 'insights' ? (
              <SignalInsightsWorkspace
                insights={signalInsights}
                observations={signalObservations}
                patterns={signalPatterns}
                sources={signalFeedSources}
              />
            ) : activeTab === 'live_stream' ? (
              <SignalStreamWorkspace
                observations={signalObservations}
                sources={signalFeedSources}
              />
            ) : (
              <SignalWorkspacePlaceholder />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}