import { PageHeader } from '@/components/os/shell/PageHeader'
import { ExampleWorkspace } from '@/components/os/shell/ExampleWorkspace'

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

  return <div className="os-module-page">
    <PageHeader title="Requests &amp; Approvals" description="Review requests, conversations and decisions that need attention." />
    <PulseSubNav activeTab={activeTab} counts={counts} />
    <ExampleWorkspace purpose="Use the tabs to explore the existing request and collaboration views. Detailed records remain available below.">
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

    </ExampleWorkspace>
  </div>
}
