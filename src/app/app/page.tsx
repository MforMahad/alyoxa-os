import { OverviewSidebar } from '@/components/os/OverviewSidebar';
import { OverviewHeader } from '@/components/os/OverviewHeader';
import OSConstellation from '@/components/os/OSConstellation';
import { nodeChannelsData, systemEventBusData } from '@/data/os/overview';

export default function OSOverviewPage() {
  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
      {/* Sidebar Navigation */}
      <OverviewSidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        <OverviewHeader />

        <main className="flex-1 p-6 space-y-8 overflow-x-hidden">
          {/* Context Header */}
          <section className="space-y-1.5 border-b border-[var(--border)] pb-5">
            <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase flex items-center gap-2">
              <span className="text-[var(--primary)]">SYS.ENV</span>
              <span>//</span>
              <span>OVERVIEW_ORCHESTRATION</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] uppercase font-mono">
              System Operational Overview
            </h1>
            <p className="text-xs text-[var(--muted)] max-w-2xl">
              All core nodes are synchronized. Autonomous reasoning pipeline is actively processing telemetry from 4 inbound sources.
            </p>
          </section>

          {/* Constellation Centerpiece Stage */}
          <section className="relative border border-[var(--border)] bg-[var(--surface)]/30 overflow-hidden">
            {/* Corner Tactical Markers */}
            <div className="absolute top-2 left-2 text-[10px] font-mono text-[var(--border)] select-none">+ L_TOP</div>
            <div className="absolute top-2 right-2 text-[10px] font-mono text-[var(--border)] select-none">R_TOP +</div>
            <div className="absolute bottom-2 left-2 text-[10px] font-mono text-[var(--border)] select-none">+ L_BOT</div>
            <div className="absolute bottom-2 right-2 text-[10px] font-mono text-[var(--border)] select-none">R_BOT +</div>

            {/* Approved Visual Centerpiece */}
            <div className="w-full h-[460px] flex items-center justify-center p-4">
              <OSConstellation />
            </div>
          </section>

          {/* Node Instrumentation Channels */}
          <section className="space-y-2">
            <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase">
              NODE TELEMETRY &amp; STATE
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[var(--border)] divide-y md:divide-y-0 md:divide-x divide-[var(--border)] bg-[var(--surface)]/20">
              {nodeChannelsData.map((channel) => (
                <div key={channel.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className={`${channel.accentClass} font-bold`}>
                      {channel.code} // {channel.name}
                    </span>
                    <span className="text-[var(--muted)]">{channel.state}</span>
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="text-[var(--foreground)] font-medium">{channel.metric}</div>
                    <div className="text-[10px] text-[var(--muted)]">{channel.subtext}</div>
                  </div>
                  <div className={`text-[9px] font-mono ${channel.accentClass} pt-2 border-t border-[var(--border)]/40`}>
                    {channel.status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Unified System Event Bus */}
          <section className="space-y-2 pt-2">
            <div className="flex items-center justify-between font-mono text-[10px] text-[var(--muted)]">
              <span className="uppercase tracking-widest">SYSTEM EVENT BUS (LIVE LOG STREAM)</span>
              <span>FILTER: ALL_NODES</span>
            </div>

            <div className="border border-[var(--border)] bg-[var(--surface)]/10 font-mono text-xs divide-y divide-[var(--border)]/60">
              {systemEventBusData.map((event) => (
                <div
                  key={event.id}
                  className="p-2.5 flex items-center justify-between hover:bg-[var(--surface)]/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-[var(--muted)]">{event.timestamp}</span>
                    <span className={`text-[10px] px-1 border ${event.badgeClass}`}>
                      {event.source}
                    </span>
                    <span className="text-[var(--foreground)]">{event.message}</span>
                  </div>
                  <span className={`text-[10px] ${event.statusClass || 'text-[var(--muted)]'}`}>
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}