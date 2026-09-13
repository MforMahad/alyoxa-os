import React from 'react';
import { VaultKnowledgeEntry, KnowledgeEntryType } from '@/data/os/vault';

interface VaultKnowledgeRowProps {
  entry: VaultKnowledgeEntry;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const VaultKnowledgeRow: React.FC<VaultKnowledgeRowProps> = ({
  entry,
  isSelected,
  onSelect,
}) => {
  const getTypeStyle = (type: KnowledgeEntryType) => {
    switch (type) {
      case 'client_context':
        return 'text-[var(--primary)] font-bold';
      case 'project_knowledge':
        return 'text-[var(--signal)] font-bold';
      case 'decision_record':
        return 'text-[var(--foreground)] font-bold';
      case 'operational_note':
        return 'text-[var(--foreground)]';
      case 'internal_knowledge':
      default:
        return 'text-[var(--muted)]';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.id)}
      className={`w-full text-left p-4 font-mono text-xs border-b border-[var(--border)] transition-colors flex flex-col gap-2 ${
        isSelected
          ? 'bg-[var(--surface-elevated)] border-l-2 border-l-[var(--primary)]'
          : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border-l-2 border-l-transparent'
      }`}
      aria-label={`Select knowledge entry ${entry.id} - ${entry.title}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-bold text-[var(--foreground)]">{entry.id}</span>
        <span className={`uppercase text-[10px] ${getTypeStyle(entry.type)}`}>
          {entry.type}
        </span>
      </div>

      <div className="text-[var(--foreground)] font-semibold truncate w-full font-sans text-xs">
        {entry.title}
      </div>

      <div className="text-[var(--muted)] line-clamp-2 w-full font-sans text-[11px] leading-relaxed">
        {entry.summary}
      </div>

      <div className="flex flex-col gap-1 text-[10px] text-[var(--muted)] pt-1">
        <div className="flex items-center justify-between w-full">
          <span>STATUS: <span className="text-[var(--foreground)] uppercase">{entry.status}</span></span>
          <span>UPDATED: <span className="text-[var(--foreground)]">{entry.updatedAt}</span></span>
        </div>
      </div>
    </button>
  );
};