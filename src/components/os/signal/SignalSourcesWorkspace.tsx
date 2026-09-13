'use client';

import React, { useState, useMemo } from 'react';
import { FeedSource } from '@/data/os/signal';
import { FeedSourceRow } from './FeedSourceRow';
import { FeedSourceInspector } from './FeedSourceInspector';

interface SignalSourcesWorkspaceProps {
  sources: FeedSource[];
}

export const SignalSourcesWorkspace: React.FC<SignalSourcesWorkspaceProps> = ({ sources }) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    sources[0]?.id || ''
  );

  // Derived telemetry metrics
  const activeSourcesCount = useMemo(
    () => sources.filter((s) => s.status === 'active').length,
    [sources]
  );

  const totalEventsPerMinute = useMemo(
    () => sources.reduce((acc, s) => acc + s.eventRate.eventsPerMinute, 0),
    [sources]
  );

  const selectedSource = useMemo(
    () => sources.find((s) => s.id === selectedSourceId) || sources[0],
    [sources, selectedSourceId]
  );

  return (
    <div className="flex flex-col space-y-4">
      {/* Infrastructure Aggregate Telemetry Bar */}
      <div className="grid grid-cols-3 gap-2 font-mono text-xs bg-[var(--surface)]/20 p-3 border border-[var(--border)]">
        <div className="flex flex-col border-r border-[var(--border)]/40 pr-3">
          <span className="text-[10px] text-[var(--muted)] uppercase">Total Sources</span>
          <span className="text-base font-bold text-[var(--foreground)]">{sources.length}</span>
        </div>
        <div className="flex flex-col border-r border-[var(--border)]/40 pr-3">
          <span className="text-[10px] text-[var(--muted)] uppercase">Active Pipeline</span>
          <span className="text-base font-bold text-[var(--signal)]">
            {activeSourcesCount} <span className="text-xs font-normal text-[var(--muted)]">/ {sources.length} ONLINE</span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--muted)] uppercase">Total Ingestion Rate</span>
          <span className="text-base font-bold text-[var(--foreground)]">
            {totalEventsPerMinute} <span className="text-xs font-normal text-[var(--signal)]">events/min</span>
          </span>
        </div>
      </div>

      {/* Main Two-Panel Registry Workspace */}
      <div className="flex flex-col lg:flex-row border border-[var(--border)] bg-[var(--surface)]/10 min-h-[500px]">
        {/* Source Table Container */}
        <div className="flex-1 min-w-0 flex flex-col justify-between divide-y divide-[var(--border)]/40">
          <div className="divide-y divide-[var(--border)]/40">
            {/* Table Header */}
            <div className="px-4 py-2 font-mono text-[10px] text-[var(--muted)] uppercase tracking-widest bg-[var(--surface)]/30 flex justify-between items-center select-none">
              <div className="flex items-center gap-6">
                <span className="w-12">Code</span>
                <span className="w-64">Source Name</span>
                <span className="w-28 hidden sm:block">Type</span>
                <span className="w-24">Ingest Rate</span>
                <span className="w-20 hidden md:block">Last Active</span>
              </div>
              <span>Status</span>
            </div>

            {/* Source Rows */}
            {sources.map((src) => (
              <FeedSourceRow
                key={src.id}
                source={src}
                isSelected={src.id === selectedSource?.id}
                onSelect={() => setSelectedSourceId(src.id)}
              />
            ))}
          </div>

          <div className="px-4 py-2 font-mono text-[10px] text-[var(--muted)] bg-[var(--surface)]/20 border-t border-[var(--border)]/40 flex justify-between">
            <span>REGISTRY_STATE: ONLINE</span>
            <span>INBOUND_PROTOCOL: WEBHOOK_POLL</span>
          </div>
        </div>

        {/* Source Inspector Panel */}
        {selectedSource && <FeedSourceInspector source={selectedSource} />}
      </div>
    </div>
  );
};