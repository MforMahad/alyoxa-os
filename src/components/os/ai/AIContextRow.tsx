import React from 'react';
import { AIContextItem, ContextRelevance } from '@/data/os/ai/aiCore';

interface AIContextRowProps {
  item: AIContextItem;
  isSelected: boolean;
  onSelect: () => void;
}

export const AIContextRow: React.FC<AIContextRowProps> = ({
  item,
  isSelected,
  onSelect,
}) => {
  const getRelevanceStyle = (relevance: ContextRelevance) => {
    switch (relevance) {
      case 'high':
        return 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10 font-bold';
      case 'medium':
        return 'text-[var(--foreground)] border-[var(--foreground)]/30 bg-[var(--foreground)]/5';
      case 'low':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
    }
  };

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
      {/* Context ID */}
      <div className="w-32 shrink-0 font-bold text-[var(--foreground)] truncate">
        {item.id}
      </div>

      {/* Context Category */}
      <div className="w-36 shrink-0">
        <span className="px-1.5 py-0.5 border border-[var(--border)] bg-[var(--surface)] text-[10px] text-[var(--signal)] uppercase tracking-wider inline-block text-center w-full truncate font-semibold">
          {item.type}
        </span>
      </div>

      {/* Source Module */}
      <div className="w-20 shrink-0 text-center font-semibold text-[var(--muted)] text-[11px]">
        [{item.sourceModule}]
      </div>

      {/* Context Summary */}
      <div className="flex-1 min-w-0 font-medium text-[var(--foreground)] truncate">
        {item.summary}
      </div>

      {/* Relevance Badge */}
      <div className="w-24 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full ${getRelevanceStyle(
            item.relevance
          )}`}
        >
          {item.relevance}
        </span>
      </div>

      {/* Timestamp */}
      <div className="w-36 shrink-0 text-right text-[10px] text-[var(--muted)] truncate">
        {item.timestamp}
      </div>
    </button>
  );
};