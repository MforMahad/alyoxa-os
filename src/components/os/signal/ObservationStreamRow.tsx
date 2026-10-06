import React from 'react';
import { Observation } from '@/data/os/signal';

interface ObservationStreamRowProps {
  observation: Observation;
  sourceCode: string;
  isSelected: boolean;
  onSelect: () => void;
}

export const ObservationStreamRow: React.FC<ObservationStreamRowProps> = ({
  observation,
  sourceCode,
  isSelected,
  onSelect,
}) => {
  const timeOnly = observation.timestamp.split('T')[1]?.replace('Z', '') || observation.timestamp;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left group flex items-center justify-between px-4 py-3 font-mono text-xs cursor-pointer border-l-2 transition-colors border-b border-[var(--border)]/40 focus:outline-none focus:bg-[var(--surface)]/60 ${
        isSelected
          ? 'border-[var(--primary)] bg-[var(--surface)] font-bold text-[var(--foreground)]'
          : 'border-transparent hover:bg-[var(--surface)]/40 text-[var(--muted)] hover:text-[var(--foreground)]'
      }`}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Timestamp */}
        <span className="text-[10px] text-[var(--muted)] shrink-0 w-16">
          {timeOnly}
        </span>

        {/* Source Code */}
        <span
          className={`text-[10px] px-1.5 py-0.5 border shrink-0 ${
            isSelected
              ? 'text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--primary)]/10'
              : 'text-[var(--foreground)] border-[var(--border)] bg-[var(--surface)]/50'
          }`}
        >
          {sourceCode}
        </span>

        {/* Event Signature */}
        <span className="text-[var(--foreground)] font-semibold shrink-0 w-48 truncate">
          {observation.eventType}
        </span>

        {/* Summary text */}
        <span className="text-[var(--muted)] text-[11px] truncate min-w-0 pr-4">
          {observation.summary}
        </span>
      </div>

      {/* Attention Tag */}
      <div className="shrink-0">
        <span
          className={`text-[9px] px-1.5 py-0.2 border uppercase ${
            observation.attentionState === 'human_review_required'
              ? 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10'
              : observation.attentionState === 'autonomous_action'
              ? 'text-[var(--foreground)] border-[var(--border)]'
              : 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10'
          }`}
        >
          {observation.attentionState === 'human_review_required'
            ? 'REVIEW'
            : observation.attentionState === 'autonomous_action'
            ? 'AUTO'
            : 'PASS'}
        </span>
      </div>
    </button>
  );
};