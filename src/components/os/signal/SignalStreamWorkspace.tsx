'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Observation, FeedSource } from '@/data/os/signal';
import { ObservationStreamRow } from './ObservationStreamRow';
import { ObservationInspector } from './ObservationInspector';

interface SignalStreamWorkspaceProps {
  observations: Observation[];
  sources: FeedSource[];
}

export const SignalStreamWorkspace: React.FC<SignalStreamWorkspaceProps> = ({
  observations,
  sources,
}) => {
  const [selectedObsId, setSelectedObsId] = useState<string>(
    observations[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');

  // Source lookup map
  const sourceMap = useMemo(() => {
    return new Map<string, FeedSource>(sources.map((s) => [s.id, s]));
  }, [sources]);

  // Filter pipeline
  const filteredObservations = useMemo(() => {
    return observations.filter((obs) => {
      const source = sourceMap.get(obs.sourceId);
      const sourceCode = source?.code || '';

      // Filter by source code
      if (selectedSourceFilter !== 'ALL' && sourceCode !== selectedSourceFilter) {
        return false;
      }

      // Filter by query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesType = obs.eventType.toLowerCase().includes(q);
        const matchesSummary = obs.summary.toLowerCase().includes(q);
        const matchesCode = sourceCode.toLowerCase().includes(q);
        return matchesType || matchesSummary || matchesCode;
      }

      return true;
    });
  }, [observations, sourceMap, selectedSourceFilter, searchQuery]);

  // Fix #1: Keep inspector selection aligned with active stream view
  useEffect(() => {
    if (filteredObservations.length > 0) {
      const isSelectedInFiltered = filteredObservations.some(
        (o) => o.id === selectedObsId
      );
      if (!isSelectedInFiltered) {
        setSelectedObsId(filteredObservations[0].id);
      }
    }
  }, [filteredObservations, selectedObsId]);

  // Active observation resolution
  const selectedObservation = useMemo(() => {
    return (
      filteredObservations.find((o) => o.id === selectedObsId) ||
      filteredObservations[0]
    );
  }, [filteredObservations, selectedObsId]);

  const selectedSource = selectedObservation
    ? sourceMap.get(selectedObservation.sourceId)
    : undefined;

  return (
    <div className="flex flex-col space-y-4">
      {/* Search & Source Filter Toolstrip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs bg-[var(--surface)]/20 p-2 border border-[var(--border)]">
        {/* Search input */}
        <div className="flex items-center gap-2 flex-1 bg-[var(--background)] border border-[var(--border)] px-2.5 py-1.5">
          <span className="text-[var(--muted)] text-[10px]">SEARCH //</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by event type, summary, or source..."
            className="bg-transparent border-none outline-none text-[var(--foreground)] placeholder-[var(--muted)]/50 text-xs w-full font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] px-1"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Source Pills Filter */}
        <div className="flex items-center gap-1 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setSelectedSourceFilter('ALL')}
            className={`px-2.5 py-1.5 text-[10px] font-mono border transition-colors ${
              selectedSourceFilter === 'ALL'
                ? 'border-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] font-bold'
                : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            ALL
          </button>
          {sources.map((src) => (
            <button
              type="button"
              key={src.id}
              onClick={() => setSelectedSourceFilter(src.code)}
              className={`px-2.5 py-1.5 text-[10px] font-mono border transition-colors ${
                selectedSourceFilter === src.code
                  ? 'border-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] font-bold'
                  : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {src.code}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Panel Workspace Stage */}
      <div className="flex flex-col lg:flex-row border border-[var(--border)] bg-[var(--surface)]/10 min-h-[500px]">
        {/* Left Stream Log Panel */}
        <div className="flex-1 min-w-0 flex flex-col justify-between divide-y divide-[var(--border)]/40">
          <div className="divide-y divide-[var(--border)]/40">
            <div className="px-4 py-2 font-mono text-[10px] text-[var(--muted)] uppercase tracking-widest bg-[var(--surface)]/30 flex justify-between items-center select-none">
              <span>Observation Stream ({filteredObservations.length})</span>
              <span>UTC LOG</span>
            </div>

            {filteredObservations.length > 0 ? (
              filteredObservations.map((obs) => {
                const source = sourceMap.get(obs.sourceId);
                return (
                  <ObservationStreamRow
                    key={obs.id}
                    observation={obs}
                    sourceCode={source?.code || 'IN.XX'}
                    isSelected={obs.id === selectedObservation?.id}
                    onSelect={() => setSelectedObsId(obs.id)}
                  />
                );
              })
            ) : (
              <div className="p-8 font-mono text-xs text-[var(--muted)] text-center">
                No observations matching filter criteria.
              </div>
            )}
          </div>

          {/* Fix #2: Accurate mode status */}
          <div className="px-4 py-2 font-mono text-[10px] text-[var(--muted)] bg-[var(--surface)]/20 border-t border-[var(--border)]/40 flex justify-between">
            <span>STREAM_STATE: SYNCHRONIZED</span>
            <span>STREAM_MODE: STATIC</span>
          </div>
        </div>

        {/* Right Inspector Panel */}
        {selectedObservation && (
          <ObservationInspector
            observation={selectedObservation}
            source={selectedSource}
          />
        )}
      </div>
    </div>
  );
};