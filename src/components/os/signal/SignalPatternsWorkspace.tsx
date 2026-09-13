'use client';

import React, { useState } from 'react';
import { Pattern, FeedSource, Observation } from '@/data/os/signal';
import { PatternRow } from './PatternRow';
import { PatternInspector } from './PatternInspector';

interface SignalPatternsWorkspaceProps {
  patterns: Pattern[];
  sources: FeedSource[];
  observations: Observation[];
}

export const SignalPatternsWorkspace: React.FC<SignalPatternsWorkspaceProps> = ({
  patterns,
  sources,
  observations,
}) => {
  const [selectedPatternId, setSelectedPatternId] = useState<string>(
    patterns[0]?.id || ''
  );
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);

  const selectedPattern =
    patterns.find((p) => p.id === selectedPatternId) || patterns[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] border border-[var(--border)] bg-[var(--background)]">
      {/* Left Master List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Table Column Headers */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider select-none">
          <div className="w-24 shrink-0">PATTERN_ID</div>
          <div className="w-20 shrink-0">SEVERITY</div>
          <div className="flex-1 min-w-0">TITLE / CORRELATION</div>
          <div className="w-24 shrink-0">STATUS</div>
          <div className="w-20 shrink-0 text-right">EVENTS</div>
          <div className="w-40 shrink-0 text-right">LAST_OBSERVED</div>
        </div>

        {/* Pattern List */}
        <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
          {patterns.length > 0 ? (
            patterns.map((pattern) => (
              <PatternRow
                key={pattern.id}
                pattern={pattern}
                isSelected={pattern.id === selectedPattern?.id}
                onSelect={() => {
                  setSelectedPatternId(pattern.id);
                  setSelectedObservationId(null);
                }}
              />
            ))
          ) : (
            <div className="p-8 text-center font-mono text-xs text-[var(--muted)]">
              NO CORRELATED PATTERNS IDENTIFIED
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer Inspector */}
      {selectedPattern && (
        <PatternInspector
          pattern={selectedPattern}
          sources={sources}
          observations={observations}
          selectedObservationId={selectedObservationId}
          onSelectObservation={(id) => setSelectedObservationId(id)}
        />
      )}
    </div>
  );
};