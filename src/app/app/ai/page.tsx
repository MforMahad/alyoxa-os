import { OverviewSidebar } from '@/components/os/OverviewSidebar';
import { AICoreHeader } from '@/components/os/ai/AICoreHeader';
import { AISubNav, AITab } from '@/components/os/ai/AISubNav';
import { AIContextWorkspace } from '@/components/os/ai/AIContextWorkspace';
import { AIDecisionsWorkspace } from '@/components/os/ai/AIDecisionsWorkspace';

import { AIWorkspacePlaceholder } from '@/components/os/ai/AIWorkspacePlaceholder';
import {
  aiCoreContextRegistry,
  buildPersistedSignalObservationContexts,
} from '@/data/os/ai/aiCore';
import { listWorkspaceObservations } from '@/actions/signal/listWorkspaceObservations';

import { aiRunsRegistry } from '@/data/os/ai/aiRuns';
import { aiDecisionsRegistry } from '@/data/os/ai/aiDecisions';
import { AIRunsWorkspace } from '@/components/os/ai/AIRunsWorkspace';

interface AIPageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function AIPage({ searchParams }: AIPageProps) {
  const persistedObservationsResult = await listWorkspaceObservations();
  const persistedObservationContexts = persistedObservationsResult.success
    ? buildPersistedSignalObservationContexts(persistedObservationsResult.data)
    : [];
  const aiContexts = [...aiCoreContextRegistry, ...persistedObservationContexts];

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
        <AICoreHeader />
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
              <AIContextWorkspace items={aiContexts} />
            ) : activeTab === 'decisions' ? (
              <AIDecisionsWorkspace
                decisions={aiDecisionsRegistry}
                contexts={aiContexts}
              />
            ) : activeTab === 'runs' ? (
              <AIRunsWorkspace
                runs={aiRunsRegistry}
                decisions={aiDecisionsRegistry}
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