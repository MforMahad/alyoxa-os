
import { PulseHeader } from '@/components/os/pulse/PulseHeader';
import { PulseSubNav } from '@/components/os/pulse/PulseSubNav';
import { PulseRequestsWorkspace } from '@/components/os/pulse/PulseRequestsWorkspace';
import { PulseThreadsWorkspace } from '@/components/os/pulse/PulseThreadsWorkspace';
import { PulseApprovalsWorkspace } from '@/components/os/pulse/PulseApprovalsWorkspace';
import { PulseActivityWorkspace } from '@/components/os/pulse/PulseActivityWorkspace';

import {
  pulseRequestsRegistry,
  pulseThreadsRegistry,
  pulseApprovalsRegistry,
  pulseActivitiesRegistry,
} from '@/data/os/pulse';

import { forgeTasksRegistry } from '@/data/os/forge';
import { OverviewSidebar } from '@/components/os/OverviewSidebar';
import { aiDecisionsRegistry } from '@/data/os/ai/aiDecisions';

interface PulsePageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

const VALID_TABS = ['requests', 'threads', 'approvals', 'activity'] as const;
type PulseTab = (typeof VALID_TABS)[number];

export default async function PulsePage({ searchParams }: PulsePageProps) {
  const resolvedSearchParams = await searchParams;
  const rawTab = resolvedSearchParams?.tab ?? '';

  const activeTab: PulseTab = VALID_TABS.includes(rawTab as PulseTab)
    ? (rawTab as PulseTab)
    : 'requests';

  const counts = {
    requests: pulseRequestsRegistry.length,
    threads: pulseThreadsRegistry.length,
    approvals: pulseApprovalsRegistry.length,
    activity: pulseActivitiesRegistry.length,
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <OverviewSidebar />

      <main className="flex flex-1 flex-col overflow-y-auto">
        <PulseHeader />
        <PulseSubNav activeTab={activeTab} counts={counts} />

        {activeTab === 'requests' && (
          <PulseRequestsWorkspace
            requests={pulseRequestsRegistry}
            decisions={aiDecisionsRegistry}
            tasks={forgeTasksRegistry}
          />
        )}

        {activeTab === 'threads' && (
          <PulseThreadsWorkspace
            threads={pulseThreadsRegistry}
            requests={pulseRequestsRegistry}
          />
        )}

        {activeTab === 'approvals' && (
          <PulseApprovalsWorkspace
            approvals={pulseApprovalsRegistry}
            requests={pulseRequestsRegistry}
            decisions={aiDecisionsRegistry}
            tasks={forgeTasksRegistry}
          />
        )}

        {activeTab === 'activity' && (
          <PulseActivityWorkspace
            activities={pulseActivitiesRegistry}
            requests={pulseRequestsRegistry}
          />
        )}
      </main>
    </div>
  );
}