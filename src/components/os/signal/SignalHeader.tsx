import React from 'react';
import { signalFeedSources, signalPatterns } from '@/data/os/signal';

export const SignalHeader: React.FC = () => {
  const activeFeedsCount = signalFeedSources.filter((s) => s.status === 'active').length;
  const totalInboundEventsPerMin = signalFeedSources.reduce(
    (acc, src) => acc + src.eventRate.eventsPerMinute,
    0
  );
  const activePatternsCount = signalPatterns.filter((p) => p.status === 'active').length;   

  return (
    <header className="h-12 w-full border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md px-6 flex items-center justify-between font-mono text-xs select-none sticky top-0 z-20">
      {/* Layer Identifier */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">LAYER //</span>
          <span className="text-[var(--foreground)] font-bold tracking-widest uppercase">
            SIGNAL.OBSERVE
          </span>
        </div>
        <span className="text-[var(--border)]">|</span>
        <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal)] animate-pulse" />
          <span>INGESTION_ACTIVE</span>
        </div>
      </div>

      {/* Operational Instrumentation */}
      <div className="flex items-center gap-6 text-[10px] text-[var(--muted)]">
        <div className="flex items-center gap-2">
          <span>INGEST_RATE:</span>
          <span className="text-[var(--signal)] font-bold">{totalInboundEventsPerMin}/m</span>
        </div>
        <div className="flex items-center gap-2">
          <span>ACTIVE_FEEDS:</span>
          <span className="text-[var(--foreground)]">
            {activeFeedsCount}/{signalFeedSources.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>ACTIVE_PATTERNS:</span>
          <span className="text-[var(--primary)] font-bold">{activePatternsCount}</span>
        </div>
      </div>
    </header>
  );
};