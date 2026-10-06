import React from 'react';
import {
  Insight,
  Observation,
  Pattern,
  FeedSource,
  AttentionState,
  InsightStatus,
} from '@/data/os/signal';

interface InsightInspectorProps {
  insight: Insight;
  observations: Observation[];
  patterns: Pattern[];
  sources: FeedSource[];
}

export const InsightInspector: React.FC<InsightInspectorProps> = ({
  insight,
  observations,
  patterns,
  sources,
}) => {
  // Resolve context pipeline objects
  const linkedObservation = observations.find((o) => o.id === insight.observationId);
  const linkedPattern = patterns.find((p) => p.id === insight.patternId);
  const linkedSource = linkedObservation
    ? sources.find((s) => s.id === linkedObservation.sourceId)
    : null;

  const confidencePercentage = Math.round(insight.confidenceScore * 100);

  const getAttentionStyle = (state: AttentionState) => {
    switch (state) {
      case 'pass_through':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
      case 'autonomous_action':
        return 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10';
      case 'human_review_required':
        return 'text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--primary)]/15 font-bold';
    }
  };

  const getStatusStyle = (status: InsightStatus) => {
    switch (status) {
      case 'pending':
        return 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10';
      case 'dispatched_to_forge':
        return 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10';
      case 'dismissed':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
    }
  };

  return (
    <aside className="w-full lg:w-[480px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--background)] p-5 space-y-6 font-mono text-xs overflow-y-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">INSIGHT //</span>
          <span className="text-[var(--foreground)] font-bold tracking-wider uppercase">
            {insight.id}
          </span>
        </div>
        <div
          className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase ${getStatusStyle(
            insight.status
          )}`}
        >
          {insight.status.replace(/_/g, ' ')}
        </div>
      </div>

      {/* AI Confidence & Summary */}
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-[var(--surface)]/30 border border-[var(--border)]">
          <span className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            AI Core Confidence
          </span>
          <span className="text-sm font-bold text-[var(--signal)]">
            {confidencePercentage}%
          </span>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">
            AI Interpretation
          </div>
          <div className="text-[var(--foreground)] font-semibold leading-relaxed p-3 bg-[var(--surface)]/10 border border-[var(--border)]">
            {insight.summary}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            Attention State
          </div>
          <div
            className={`p-2 border text-[10px] uppercase text-center tracking-wider font-bold ${getAttentionStyle(
              insight.attentionState
            )}`}
          >
            {insight.attentionState.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Context Lineage (Observation & Pattern) */}
      <div className="space-y-2 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
          Context Lineage
        </div>

        {linkedPattern && (
          <div className="p-3 bg-[var(--surface)]/20 border border-[var(--border)] space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--muted)]">CORRELATED_PATTERN:</span>
              <span className="text-[var(--foreground)] font-bold">{linkedPattern.id}</span>
            </div>
            <div className="text-[11px] text-[var(--foreground)] font-semibold">
              {linkedPattern.title}
            </div>
            <div className="text-[10px] text-[var(--muted)]">
              Occurrences: {linkedPattern.count} // Severity: {linkedPattern.severity}
            </div>
          </div>
        )}

        {linkedObservation && (
          <div className="p-3 bg-[var(--surface)]/20 border border-[var(--border)] space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--muted)]">TRIGGER_OBSERVATION:</span>
              <span className="text-[var(--foreground)] font-bold">{linkedObservation.id}</span>
            </div>
            <div className="text-[11px] text-[var(--signal)] font-bold">
              {linkedObservation.eventType}
            </div>
            <div className="text-[10px] text-[var(--muted)]">
              Source: {linkedSource ? linkedSource.name : linkedObservation.sourceId}
            </div>
          </div>
        )}
      </div>

      {/* Recommended Action (Forge Boundary) */}
      <div className="space-y-3 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest flex items-center justify-between">
          <span>Forge Handoff Boundary</span>
          <span className="text-[var(--primary)] font-bold">[RECOMMENDATION]</span>
        </div>

        <div className="p-3.5 bg-[var(--surface)]/40 border border-[var(--primary)]/30 space-y-3">
          <div>
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest">
              Forge Target Node
            </div>
            <div className="text-[var(--foreground)] font-bold font-mono text-xs">
              {insight.recommendedAction.forgeTargetNode}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest">
              Action Name
            </div>
            <div className="text-[var(--primary)] font-bold font-mono">
              {insight.recommendedAction.actionName}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest mb-1">
              Action Payload
            </div>
            <pre className="p-2.5 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--foreground)]/90 overflow-x-auto font-mono">
              {JSON.stringify(insight.recommendedAction.payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* State Banners */}
        {insight.status === 'dispatched_to_forge' && (
          <div className="p-2.5 border border-[var(--signal)]/40 bg-[var(--signal)]/10 text-[10px] text-[var(--signal)] text-center font-bold tracking-wider uppercase">
            ACTION DISPATCHED TO FORGE EXECUTION LAYER
          </div>
        )}

        {insight.attentionState === 'human_review_required' &&
          insight.status === 'pending' && (
            <div className="p-2.5 border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[10px] text-[var(--primary)] text-center font-bold tracking-wider uppercase">
              WAITING FOR HUMAN REVIEW BEFORE EXECUTION
            </div>
          )}
      </div>
    </aside>
  );
};