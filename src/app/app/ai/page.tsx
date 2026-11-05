import { PageHeader } from '@/components/os/shell/PageHeader'
import { AISubNav, AITab } from '@/components/os/ai/AISubNav';
import { listWorkspaceObservations } from '@/actions/signal/listWorkspaceObservations';
import { listWorkspaceFeedSources } from '@/actions/signal/listWorkspaceFeedSources';
import { listWorkspaceWebsiteScans } from '@/actions/signal/listWorkspaceWebsiteScans';
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace';
import { AIWebsiteResults } from '@/components/os/ai/AIWebsiteResults';

interface AIPageProps {
  searchParams?: Promise<{
    tab?: string;
    website?: string;
    result?: string;
  }>;
}

export default async function AIPage({ searchParams }: AIPageProps) {
  const [persistedObservationsResult, sources, scans, workspace] = await Promise.all([
    listWorkspaceObservations(), listWorkspaceFeedSources(), listWorkspaceWebsiteScans(), getActiveWorkspace(),
  ]);

  if (!persistedObservationsResult.success) {
    console.error('[AIPage] Persisted Signal observations were unavailable.');
  }

  const resolvedParams = await searchParams;
  const rawTab = resolvedParams?.tab;

  // Strict URL Tab validation
  const activeTab: AITab =
    rawTab === 'decisions' || rawTab === 'runs' ? rawTab : 'context';

  return <div className="os-module-page"><PageHeader title="Reports &amp; Recommendations" description="Choose a website and a previous check to understand the findings and review available suggestions." /><AISubNav activeTab={activeTab} />
            <div className="space-y-4">
              {!workspace.success && <p role="alert">{workspace.error}</p>}
              {!persistedObservationsResult.success && <p role="alert">{persistedObservationsResult.error}</p>}
              {!sources.success && <p role="alert">{sources.error}</p>}
              {!scans.success && <p role="alert">{scans.error}</p>}
              <AIWebsiteResults workspaceId={workspace.success ? workspace.data.id : null}
                observations={persistedObservationsResult.success ? persistedObservationsResult.data : []}
                sources={sources.success ? sources.data : []} scans={scans.success ? scans.data : []} activeTab={activeTab} />
            </div>
  </div>
}
