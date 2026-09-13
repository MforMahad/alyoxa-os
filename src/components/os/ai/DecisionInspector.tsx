import React from 'react';

import { AIContextItem } from '@/data/os/aiCore';
import { AIDecision, DecisionAttentionState, DecisionStatus } from './aiDecisions';

interface DecisionInspectorProps {
  decision: AIDecision;
  availableContexts: AIContextItem[];
}

export const DecisionInspector: React.FC<DecisionInspectorProps> = ({
  decision,
  availableContexts,
}) => {
  // Directly resolve existing context items without fabricating fallback objects
  const resolvedContexts = decision.contextIds
    .map((ctxId) => availableContexts.find((c) => c.id === ctxId || c.refId === ctxId))
    .filter((c): c is AIContextItem => c !== undefined);

  const unresolvedCount = decision.contextIds.length - resolvedContexts.length;
  const confidencePercentage = Math.round(decision.confidenceScore * 100);

  const getAttentionStyle = (state: DecisionAttentionState) => {
    switch (state) {
      case 'autonomous_action':
        return 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10';
      case 'human_review_required':
        return 'text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--primary)]/15 font-bold';
    }
  };

  const getStatusStyle = (status: DecisionStatus) => {
    switch (status) {
      case 'pending':
        return 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10';
      case 'dispatched_to_forge':
        return 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10';
      case 'rejected':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
    }
  };

  return (
    <aside className="w-full lg:w-[480px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--background)] p-5 space-y-6 font-mono text-xs overflow-y-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">DECISION //</span>
          <span className="text-[var(--foreground)] font-bold tracking-wider uppercase">
            {decision.id}
          </span>
        </div>
        <div
          className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase ${getStatusStyle(
            decision.status
          )}`}
        >
          {decision.status.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Confidence & Summary */}
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
            Decision Summary
          </div>
          <div className="text-[var(--foreground)] font-semibold leading-relaxed p-3 bg-[var(--surface)]/10 border border-[var(--border)]">
            {decision.summary}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
            Execution Policy
          </div>
          <div
            className={`p-2 border text-[10px] uppercase text-center tracking-wider font-bold ${getAttentionStyle(
              decision.attentionState
            )}`}
          >
            {decision.attentionState.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Context Lineage */}
      <div className="space-y-2 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest flex justify-between items-center">
          <span>Decision Basis // Context Lineage</span>
          <span>[{resolvedContexts.length}]</span>
        </div>

        <div className="space-y-2">
          {resolvedContexts.map((ctx) => (
            <div
              key={ctx.id}
              className="p-3 bg-[var(--surface)]/20 border border-[var(--border)] space-y-1"
            >
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[var(--signal)] font-bold">{ctx.id}</span>
                <span className="text-[var(--muted)]">[{ctx.sourceModule}]</span>
              </div>
              <div className="text-[11px] text-[var(--foreground)] font-semibold">
                {ctx.summary}
              </div>
              <div className="text-[10px] text-[var(--muted)]">
                TYPE: {ctx.type}
              </div>
            </div>
          ))}

          {unresolvedCount > 0 && (
            <div className="p-2 border border-dashed border-[var(--border)] text-[10px] text-[var(--muted)] text-center uppercase tracking-wider">
              [{unresolvedCount}] UNRESOLVED CONTEXT REFERENCE(S)
            </div>
          )}
        </div>
      </div>

      {/* Recommended Action (Forge Boundary) */}
      <div className="space-y-3 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest flex items-center justify-between">
          <span>Forge Handoff Target</span>
          <span className="text-[var(--primary)] font-bold">[RECOMMENDED ACTION]</span>
        </div>

        <div className="p-3.5 bg-[var(--surface)]/40 border border-[var(--primary)]/30 space-y-3">
          <div>
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest">
              Forge Target Node
            </div>
            <div className="text-[var(--foreground)] font-bold font-mono text-xs">
              {decision.recommendedAction.forgeTargetNode}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest">
              Action Name
            </div>
            <div className="text-[var(--primary)] font-bold font-mono">
              {decision.recommendedAction.actionName}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest mb-1">
              Action Payload
            </div>
            <pre className="p-2.5 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--foreground)]/90 overflow-x-auto font-mono">
              {JSON.stringify(decision.recommendedAction.payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Execution State Banners */}
        {decision.status === 'dispatched_to_forge' && (
          <div className="p-2.5 border border-[var(--signal)]/40 bg-[var(--signal)]/10 text-[10px] text-[var(--signal)] text-center font-bold tracking-wider uppercase">
            FORGE HANDOFF // DECISION DISPATCHED TO FORGE EXECUTION LAYER
          </div>
        )}

        {decision.attentionState === 'human_review_required' &&
          decision.status === 'pending' && (
            <div className="p-2.5 border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[10px] text-[var(--primary)] text-center font-bold tracking-wider uppercase">
              HUMAN REVIEW REQUIRED // PENDING AUTHORIZATION BEFORE HANDOFF
            </div>
          )}

        {decision.status === 'rejected' && (
          <div className="p-2.5 border border-[var(--border)] bg-[var(--surface)] text-[10px] text-[var(--muted)] text-center font-bold tracking-wider uppercase">
            DECISION REJECTED // DISCARDED BY SYSTEM OR HUMAN OPERATOR
          </div>
        )}
      </div>
    </aside>
  );
};