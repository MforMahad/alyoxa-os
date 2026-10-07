'use client';

import React, { useState, useMemo } from 'react';
import { Observation, FeedSource } from '@/data/os/signal';
import { ObservationStreamRow } from './ObservationStreamRow';
import { ObservationInspector } from './ObservationInspector';

interface SignalStreamWorkspaceProps {
  observations: Observation[];
  sources: FeedSource[];
}

function getFilteredObservations(
  observations: Observation[],
  sourceMap: Map<string, FeedSource>,
  selectedSourceFilter: string,
  searchQuery: string
): Observation[] {
  return observations.filter((obs) => {
    const source = sourceMap.get(obs.sourceId);
    const sourceCode = source?.code || '';

    if (selectedSourceFilter !== 'ALL' && sourceCode !== selectedSourceFilter) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchesType = obs.eventType.toLowerCase().includes(query);
      const matchesSummary = obs.summary.toLowerCase().includes(query);
      const matchesCode = sourceCode.toLowerCase().includes(query);
      return matchesType || matchesSummary || matchesCode;
    }

    return true;
  });
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
  const filteredObservations = useMemo(
    () =>
      getFilteredObservations(
        observations,
        sourceMap,
        selectedSourceFilter,
        searchQuery
      ),
    [observations, sourceMap, selectedSourceFilter, searchQuery]
  );

  // Active observation resolution
  const selectedObservation = useMemo(() => {
    return (
      filteredObservations.find((o) => o.id === selectedObsId) ||
      filteredObservations[0]
    );
  }, [filteredObservations, selectedObsId]);

  const updateFilters = (sourceFilter: string, query: string) => {
    const nextFilteredObservations = getFilteredObservations(
      observations,
      sourceMap,
      sourceFilter,
      query
    );

    if (nextFilteredObservations.length > 0) {
      const retainedSelection = nextFilteredObservations.find(
        (observation) => observation.id === selectedObservation?.id
      );
      setSelectedObsId(
        retainedSelection?.id ?? nextFilteredObservations[0].id
      );
    }

    setSelectedSourceFilter(sourceFilter);
    setSearchQuery(query);
  };

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
            onChange={(e) => updateFilters(selectedSourceFilter, e.target.value)}
            placeholder="Filter by event type, summary, or source..."
            className="bg-transparent border-none outline-none text-[var(--foreground)] placeholder-[var(--muted)]/50 text-xs w-full font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => updateFilters(selectedSourceFilter, '')}
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
            onClick={() => updateFilters('ALL', searchQuery)}
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
              onClick={() => updateFilters(src.code, searchQuery)}
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

            {observations.length === 0 ? (
              <div className="p-8 font-mono text-xs text-[var(--muted)] text-center space-y-1">
                <div>No observations yet.</div>
                <div className="text-[10px] opacity-75">Signal has not received any observations.</div>
              </div>
            ) : filteredObservations.length > 0 ? (
              filteredObservations.map((obs) => {
                const source = sourceMap.get(obs.sourceId);
                return (
                  <ObservationStreamRow
                    key={obs.id}
                    observation={obs}
                    sourceCode={source?.code || 'UNKNOWN SOURCE'}
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

          {/* Accurate mode status */}
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