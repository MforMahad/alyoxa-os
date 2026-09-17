import { OverviewSidebar } from '@/components/os/OverviewSidebar';
import { ForgeHeader } from '@/components/os/forge/ForgeHeader';
import { ForgeSubNav, type ForgeTab } from '@/components/os/forge/ForgeSubNav';
import { ForgeTasksWorkspace } from '@/components/os/forge/ForgeTasksWorkspace';
import { ForgeNodesWorkspace } from '@/components/os/forge/ForgeNodesWorkspace';
import { ForgeRecordsWorkspace } from '@/components/os/forge/ForgeRecordsWorkspace';
import {
  forgeTasksRegistry,
  forgeNodesRegistry,
  forgeRecordsRegistry,
} from '@/data/os/forge';
import { aiRunsRegistry } from '@/data/os/ai/aiRuns';

import { aiCoreContextRegistry } from '@/data/os/ai/aiCore';
import { aiDecisionsRegistry } from '@/data/os/ai/aiDecisions';

interface ForgePageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function ForgePage({ searchParams }: ForgePageProps) {
  const resolvedParams = await searchParams;
  const rawTab = resolvedParams?.tab;

  const activeTab: ForgeTab =
    rawTab === 'nodes' || rawTab === 'records' ? rawTab : 'tasks';

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
      <OverviewSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <ForgeHeader />
        <ForgeSubNav activeTab={activeTab} />

        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
          <section className="space-y-1.5 border-b border-[var(--border)] pb-5 font-mono">
            <div className="text-[10px] tracking-widest text-[var(--muted)] uppercase">
              EXECUTION LAYER
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] uppercase">
              Forge
            </h1>
            <p className="text-xs text-[var(--muted)] max-w-2xl">
              Execution boundary layer. Represents task reception, node targeting, and execution lifecycle records from upstream AI Core decisions.
            </p>
          </section>

          <section>
            {activeTab === 'tasks' ? (
              <ForgeTasksWorkspace
                tasks={forgeTasksRegistry}
                runs={aiRunsRegistry}
                decisions={aiDecisionsRegistry}
                contexts={aiCoreContextRegistry}
                nodes={forgeNodesRegistry}
              />
            ) : activeTab === 'nodes' ? (
              <ForgeNodesWorkspace nodes={forgeNodesRegistry} />
            ) : (
              <ForgeRecordsWorkspace records={forgeRecordsRegistry} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}