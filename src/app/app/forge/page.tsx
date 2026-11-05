import { PageHeader } from '@/components/os/shell/PageHeader'
import { ExampleWorkspace } from '@/components/os/shell/ExampleWorkspace'
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

  return <div className="os-module-page">
    <PageHeader title="Tasks" description="Review work items, their progress and supporting details." />
    <ForgeSubNav activeTab={activeTab} />
    <ExampleWorkspace purpose="Use the tabs to explore the existing task and processing views. Detailed records remain available below.">
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

    </ExampleWorkspace>
  </div>
}
