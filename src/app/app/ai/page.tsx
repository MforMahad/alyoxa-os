import { OverviewSidebar } from '@/components/os/OverviewSidebar';
import { AICoreHeader } from '@/components/os/ai/AICoreHeader';
import { AISubNav, AITab } from '@/components/os/ai/AISubNav';
import { listWorkspaceObservations } from '@/actions/signal/listWorkspaceObservations';
import { listWorkspaceFeedSources } from '@/actions/signal/listWorkspaceFeedSources';
import { listWorkspaceWebsiteScans } from '@/actions/signal/listWorkspaceWebsiteScans';
import { getActiveWorkspace } from '@/actions/workspaces/getActiveWorkspace';
import { AIWebsiteResults } from '@/components/os/ai/AIWebsiteResults';

interface AIPageProps {
  searchParams?: Promise<{
    tab?: string;
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
            <div className="space-y-4">
              {!workspace.success && <p role="alert">{workspace.error}</p>}
              {!persistedObservationsResult.success && <p role="alert">{persistedObservationsResult.error}</p>}
              {!sources.success && <p role="alert">{sources.error}</p>}
              {!scans.success && <p role="alert">{scans.error}</p>}
              <AIWebsiteResults workspaceId={workspace.success ? workspace.data.id : null}
                observations={persistedObservationsResult.success ? persistedObservationsResult.data : []}
                sources={sources.success ? sources.data : []} scans={scans.success ? scans.data : []} activeTab={activeTab} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
