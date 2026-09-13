import React from 'react';
import { FeedSource } from '@/data/os/signal';

interface FeedSourceInspectorProps {
  source: FeedSource;
}

export const FeedSourceInspector: React.FC<FeedSourceInspectorProps> = ({ source }) => {
  return (
    <aside className="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--background)] p-5 space-y-6 font-mono text-xs overflow-y-auto select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">SOURCE //</span>
          <span className="text-[var(--foreground)] font-bold tracking-wider uppercase">
            {source.code}
          </span>
        </div>
        <div
          className={`text-[9px] px-1.5 py-0.5 border tracking-wider uppercase ${
            source.status === 'active'
              ? 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10'
              : source.status === 'degraded'
              ? 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10'
              : 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]'
          }`}
        >
          {source.status}
        </div>
      </div>

      {/* Metadata Properties */}
      <div className="space-y-4">
        {/* Source Name & Identity */}
        <div className="space-y-1">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            Source Identity
          </div>
          <div className="text-[var(--foreground)] font-bold text-sm">
            {source.name}
          </div>
          <div className="text-[11px] text-[var(--muted)] font-mono">
            TYPE // {source.type.toUpperCase()}
          </div>
        </div>

        {/* Source Type & Transport */}
        <div className="grid grid-cols-2 gap-4 py-2 border-y border-[var(--border)]/40">
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">
              Ingestion Type
            </div>
            <div className="text-[var(--foreground)] font-bold uppercase">
              {source.type.replace('_', ' ')}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">
              Protocol
            </div>
            <div className="text-[var(--signal)] font-bold">
              {source.endpointUrl ? 'HTTPS / POST' : 'INTERNAL_BUS'}
            </div>
          </div>
        </div>

        {/* Ingestion Metrics */}
        <div className="space-y-2">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            Telemetry Rate
          </div>
          <div className="p-3 bg-[var(--surface)]/30 border border-[var(--border)] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted)]">DISPLAY_RATE:</span>
              <span className="text-[var(--foreground)] font-bold">
                {source.eventRate.displayRate}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted)]">EVENTS_PER_MIN:</span>
              <span className="text-[var(--signal)] font-bold">
                {source.eventRate.eventsPerMinute} / m
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--muted)]">LAST_ACTIVE:</span>
              <span className="text-[var(--foreground)]">{source.lastActive}</span>
            </div>
          </div>
        </div>

        {/* Endpoint URL if available */}
        {source.endpointUrl && (
          <div className="space-y-1.5 pt-2">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
              Ingestion Endpoint
            </div>
            <div className="p-2.5 bg-[var(--surface)]/30 border border-[var(--border)] text-[10px] text-[var(--foreground)]/90 break-all select-all font-mono">
              {source.endpointUrl}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};