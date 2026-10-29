import { OverviewSidebar } from '@/components/os/OverviewSidebar';
import { AICoreHeader } from '@/components/os/ai/AICoreHeader';
import { AISubNav, AITab } from '@/components/os/ai/AISubNav';
import { AIContextWorkspace } from '@/components/os/ai/AIContextWorkspace';
import { AIDecisionsWorkspace } from '@/components/os/ai/AIDecisionsWorkspace';

import { AIWorkspacePlaceholder } from '@/components/os/ai/AIWorkspacePlaceholder';
import { buildWebsiteContexts } from '@/lib/os/signal/persistedWebsiteContexts';
import { listWorkspaceObservations } from '@/actions/signal/listWorkspaceObservations';

import { WebsiteObservationDetails } from '@/components/os/signal/WebsiteObservationDetails';

import { AIRunsWorkspace } from '@/components/os/ai/AIRunsWorkspace';

interface AIPageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function AIPage({ searchParams }: AIPageProps) {
  const persistedObservationsResult = await listWorkspaceObservations();
  const persistedObservationContexts = persistedObservationsResult.success
    ? buildWebsiteContexts(persistedObservationsResult.data)
    : [];
  const aiContexts = persistedObservationContexts;

  if (!persistedObservationsResult.success) {
    console.error('[AIPage] Persisted Signal observations were unavailable.');
  }

  const resolvedParams = await searchParams;
  const rawTab = resolvedParams?.tab;

  // Strict URL Tab validation
  const activeTab: AITab =
    rawTab === 'decisions' || rawTab === 'runs' ? rawTab : 'context';

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
      {/* Shared OS Navigation */}
      <OverviewSidebar />

      {/* Main AI Environment */}
      <div className="flex-1 flex flex-col min-w-0">
        <AICoreHeader configured={Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_WEBSITE_MODEL)} />
        <AISubNav activeTab={activeTab} />

        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
          {/* Environment Banner */}
          <section className="space-y-1.5 border-b border-[var(--border)] pb-5">
            <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase">
              INTELLIGENCE LAYER
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] uppercase font-mono">
              AI Core
            </h1>
            <p className="text-xs text-[var(--muted)] max-w-2xl">
              Central intelligence layer. Bringing together signals, patterns, and system context so AI can understand what is happening and determine what should happen next.
            </p>
          </section>

          {/* Active Stage */}
          <section>
            {activeTab === 'context' ? (
              <div className="space-y-5">
                {!persistedObservationsResult.success && <p role="alert">{persistedObservationsResult.error}</p>}
                <p>Real workspace observations only (up to 200 most recent). Recommendations are generated during scanning when AI is configured; absence of recommendations is not a successful AI run.</p>
                <AIContextWorkspace items={aiContexts} />
                {persistedObservationsResult.success && persistedObservationsResult.data.map(observation => <article key={observation.id} className="border border-[var(--border)] p-4 space-y-3"><h2>{observation.title}</h2><p>{observation.observed_at} ? {observation.public_id}</p><WebsiteObservationDetails metadata={observation.metadata} /></article>)}
              </div>
            ) : activeTab === 'decisions' ? (
              <AIDecisionsWorkspace
                decisions={[]}
                contexts={aiContexts}
              />
            ) : activeTab === 'runs' ? (
              <AIRunsWorkspace
                runs={[]}
                decisions={[]}
                contexts={aiContexts}
              />
            ) : (
              <AIWorkspacePlaceholder tab={activeTab} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
