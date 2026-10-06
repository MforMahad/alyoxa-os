import React from 'react';
import { Observation, FeedSource } from '@/data/os/signal';

interface ObservationInspectorProps {
  observation: Observation;
  source?: FeedSource;
}

export const ObservationInspector: React.FC<ObservationInspectorProps> = ({
  observation,
  source,
}) => {
  const formattedJson = JSON.stringify(observation.payload, null, 2);

  return (
    <aside className="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--background)] p-5 space-y-6 font-mono text-xs overflow-y-auto">
      {/* Inspector Top Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">INSPECT //</span>
          <span className="text-[var(--foreground)] font-bold tracking-wider uppercase">
            {observation.id}
          </span>
        </div>
        <div
          className={`text-[9px] px-1.5 py-0.5 border tracking-wider uppercase ${
            observation.attentionState === 'human_review_required'
              ? 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10'
              : observation.attentionState === 'autonomous_action'
              ? 'text-[var(--foreground)] border-[var(--border)] bg-[var(--surface)]'
              : 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10'
          }`}
        >
          {observation.attentionState.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Origin Metadata Grid */}
      <div className="space-y-4">
        {/* Source info */}
        <div className="space-y-1">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            Origin Source
          </div>
          <div className="text-[var(--foreground)] font-bold flex items-center gap-2">
            <span className="text-[var(--primary)]">{source?.code || 'UNKNOWN SOURCE'}</span>
            <span>//</span>
            <span>{source?.name || 'Unknown Source'}</span>
          </div>
          {source?.endpointUrl && (
            <div className="text-[10px] text-[var(--muted)] truncate">
              {source.endpointUrl}
            </div>
          )}
        </div>

        {/* Event Type */}
        <div className="space-y-1">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            Event Signature
          </div>
          <div className="text-[var(--signal)] font-bold bg-[var(--surface)]/40 p-2 border border-[var(--border)]/50 break-all">
            {observation.eventType}
          </div>
        </div>

        {/* Timestamp */}
        <div className="space-y-1">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            Ingestion Timestamp (UTC)
          </div>
          <div className="text-[var(--foreground)]">{observation.timestamp}</div>
        </div>

        {/* Summary */}
        <div className="space-y-1">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            Log Summary
          </div>
          <div className="text-[var(--foreground)] text-[11px] leading-relaxed">
            {observation.summary}
          </div>
        </div>

        {/* Correlation Keys */}
        {Object.keys(observation.correlationKeys).length > 0 && (
          <div className="space-y-1 pt-2 border-t border-[var(--border)]/40">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
              Correlation Context
            </div>
            <div className="space-y-1 text-[11px]">
              {observation.correlationKeys.entityId && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">ENTITY_ID:</span>
                  <span className="text-[var(--foreground)]">{observation.correlationKeys.entityId}</span>
                </div>
              )}
              {observation.correlationKeys.ipAddress && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">IP_ADDR:</span>
                  <span className="text-[var(--foreground)]">{observation.correlationKeys.ipAddress}</span>
                </div>
              )}
              {observation.correlationKeys.sessionId && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">SESSION_ID:</span>
                  <span className="text-[var(--foreground)]">{observation.correlationKeys.sessionId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Raw Payload Block */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--border)]/40">
          <div className="flex items-center justify-between text-[10px] text-[var(--muted)] uppercase tracking-widest">
            <span>Raw Event Payload</span>
            <span>JSON</span>
          </div>
          <pre className="p-3 bg-[var(--surface)]/30 border border-[var(--border)] text-[11px] text-[var(--foreground)]/90 font-mono overflow-x-auto leading-tight">
            <code>{formattedJson}</code>
          </pre>
        </div>
      </div>
    </aside>
  );
};