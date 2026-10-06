
import React from 'react';
import { Insight, AttentionState, InsightStatus } from '@/data/os/signal';

interface InsightRowProps {
  insight: Insight;
  isSelected: boolean;
  onSelect: () => void;
}

export const InsightRow: React.FC<InsightRowProps> = ({
  insight,
  isSelected,
  onSelect,
}) => {
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

  const confidencePercentage = Math.round(insight.confidenceScore * 100);

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
      {/* Insight ID */}
      <div className="w-24 shrink-0 font-bold text-[var(--foreground)]">
        {insight.id}
      </div>

      {/* Confidence Score */}
      <div className="w-16 shrink-0 text-right font-bold text-[var(--signal)]">
        {confidencePercentage}%
      </div>

      {/* AI Interpretation / Summary */}
      <div className="flex-1 min-w-0 font-semibold text-[var(--foreground)] truncate">
        {insight.summary}
      </div>

      {/* Attention State */}
      <div className="w-36 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full ${getAttentionStyle(
            insight.attentionState
          )}`}
        >
          {insight.attentionState.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Status */}
      <div className="w-32 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full ${getStatusStyle(
            insight.status
          )}`}
        >
          {insight.status.replace(/_/g, ' ')}
        </span>
      </div>
    </button>
  );
};