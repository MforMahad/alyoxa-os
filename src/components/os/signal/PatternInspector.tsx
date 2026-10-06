import React from 'react';
import { Pattern, FeedSource, Observation, SeverityLevel } from '@/data/os/signal';

interface PatternInspectorProps {
  pattern: Pattern;
  sources: FeedSource[];
  observations: Observation[];
  selectedObservationId?: string | null;
  onSelectObservation?: (id: string) => void;
}

export const PatternInspector: React.FC<PatternInspectorProps> = ({
  pattern,
  sources,
  observations,
  selectedObservationId,
  onSelectObservation,
}) => {
  const resolvedSources = sources.filter((s) => pattern.sourceIds.includes(s.id));
  const resolvedObservations = observations.filter((o) =>
    pattern.observationIds.includes(o.id)
  );

  const getSeverityStyle = (severity: SeverityLevel) => {
    switch (severity) {
      case 'low':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
      case 'medium':
        return 'text-[var(--foreground)] border-[var(--foreground)]/30 bg-[var(--foreground)]/5';
      case 'high':
        return 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10';
      case 'critical':
        return 'text-[var(--primary)] border-[var(--primary)]/50 bg-[var(--primary)]/15 font-bold';
    }
  };

  return (
    <aside className="w-full lg:w-[460px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--background)] p-5 space-y-6 font-mono text-xs overflow-y-auto select-none">
      {/* Inspector Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">PATTERN //</span>
          <span className="text-[var(--foreground)] font-bold tracking-wider uppercase">
            {pattern.id}
          </span>
        </div>
        <div
          className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase ${getSeverityStyle(
            pattern.severity
          )}`}
        >
          {pattern.severity}
        </div>
      </div>

      {/* Pattern Title & Meta */}
      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">
            Pattern Description
          </div>
          <div className="text-[var(--foreground)] font-bold text-sm leading-snug">
            {pattern.title}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 border-y border-[var(--border)]/40">
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">
              State
            </div>
            <div className="text-[var(--foreground)] font-bold uppercase">
              {pattern.status}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">
              Total Occurrences
            </div>
            <div className="text-[var(--signal)] font-bold text-sm">
              {pattern.count}
            </div>
          </div>
        </div>

        {/* Time Window */}
        <div className="space-y-2">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            Correlation Window
          </div>
          <div className="p-3 bg-[var(--surface)]/30 border border-[var(--border)] space-y-1.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted)]">FIRST_OBSERVED:</span>
              <span className="text-[var(--foreground)]">{pattern.firstObserved}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted)]">LAST_OBSERVED:</span>
              <span className="text-[var(--foreground)]">{pattern.lastObserved}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Sources Section */}
      <div className="space-y-2 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest flex justify-between items-center">
          <span>Correlated Feed Sources</span>
          <span>[{resolvedSources.length}]</span>
        </div>
        <div className="space-y-2">
          {resolvedSources.map((source) => (
            <div
              key={source.id}
              className="p-2.5 bg-[var(--surface)]/30 border border-[var(--border)] flex justify-between items-center"
            >
              <div>
                <div className="font-bold text-[var(--foreground)]">{source.name}</div>
                <div className="text-[10px] text-[var(--muted)]">
                  {source.code} // {source.type}
                </div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 border border-[var(--signal)]/30 text-[var(--signal)] bg-[var(--signal)]/10 uppercase">
                {source.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sampled Observations Section */}
      <div className="space-y-2 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest flex justify-between items-center">
          <span>Sampled Observations</span>
          <span>[{resolvedObservations.length}]</span>
        </div>
        <div className="space-y-2">
          {resolvedObservations.map((obs) => {
            const isObsSelected = selectedObservationId === obs.id;
            return (
              <button
                type="button"
                key={obs.id}
                onClick={() => onSelectObservation?.(obs.id)}
                className={`w-full text-left p-3 border transition-colors cursor-pointer ${
                  isObsSelected
                    ? 'border-[var(--signal)] bg-[var(--surface)]'
                    : 'border-[var(--border)] bg-[var(--surface)]/20 hover:bg-[var(--surface)]/50'
                }`}
              >
                <div className="flex justify-between items-center mb-1 text-[10px]">
                  <span className="font-bold text-[var(--foreground)]">{obs.id}</span>
                  <span className="text-[var(--muted)]">{obs.timestamp}</span>
                </div>
                <div className="text-[var(--signal)] font-bold text-[11px] mb-1">
                  {obs.eventType}
                </div>
                <div className="text-[11px] text-[var(--foreground)]/90 leading-tight">
                  {obs.summary}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};