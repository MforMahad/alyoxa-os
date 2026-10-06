import React from 'react';
import { ExecutionNode, ExecutionNodeStatus } from '@/data/os/forge';

interface ExecutionNodeRowProps {
  node: ExecutionNode;
  isSelected: boolean;
  onSelect: () => void;
}

export const ExecutionNodeRow: React.FC<ExecutionNodeRowProps> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const getStatusStyle = (status: ExecutionNodeStatus) => {
    switch (status) {
      case 'online':
        return 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10';
      case 'degraded':
        return 'text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--primary)]/15';
      case 'offline':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
    }
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full text-left flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] font-mono text-xs cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[var(--surface)] border-l-2 border-l-[var(--primary)]'
          : 'hover:bg-[var(--surface)]/40'
      }`}
    >
      <div className="w-36 shrink-0 font-bold text-[var(--foreground)]">
        {node.id}
      </div>
      <div className="w-48 shrink-0 font-semibold text-[var(--foreground)] truncate">
        {node.name}
      </div>
      <div className="w-28 shrink-0 text-[var(--muted)] uppercase">
        {node.type}
      </div>
      <div className="w-24 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full font-bold ${getStatusStyle(
            node.status
          )}`}
        >
          {node.status}
        </span>
      </div>
      <div className="flex-1 min-w-0 text-[var(--muted)] truncate">
        {node.capabilities.join(', ')}
      </div>
    </button>
  );
};