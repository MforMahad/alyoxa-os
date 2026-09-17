import React from 'react';
import { AIDecision, DecisionAttentionState, DecisionStatus } from '../../../data/os/ai/aiDecisions';


interface DecisionRowProps {
  decision: AIDecision;
  isSelected: boolean;
  onSelect: () => void;
}

export const DecisionRow: React.FC<DecisionRowProps> = ({
  decision,
  isSelected,
  onSelect,
}) => {
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

  const confidencePercentage = Math.round(decision.confidenceScore * 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full text-left flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] font-mono text-xs cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[var(--surface)] border-l-2 border-l-[var(--signal)]'
          : 'hover:bg-[var(--surface)]/40'
      }`}
    >
      {/* Decision ID */}
      <div className="w-28 shrink-0 font-bold text-[var(--foreground)]">
        {decision.id}
      </div>

      {/* Source Module */}
      <div className="w-20 shrink-0 text-center font-semibold text-[var(--muted)] text-[11px]">
        [{decision.sourceModule}]
      </div>

      {/* Confidence Score */}
      <div className="w-16 shrink-0 text-right font-bold text-[var(--signal)]">
        {confidencePercentage}%
      </div>

      {/* Decision Summary */}
      <div className="flex-1 min-w-0 font-semibold text-[var(--foreground)] truncate">
        {decision.summary}
      </div>

      {/* Attention State */}
      <div className="w-36 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full ${getAttentionStyle(
            decision.attentionState
          )}`}
        >
          {decision.attentionState.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Status */}
      <div className="w-32 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full ${getStatusStyle(
            decision.status
          )}`}
        >
          {decision.status.replace(/_/g, ' ')}
        </span>
      </div>
    </button>
  );
};