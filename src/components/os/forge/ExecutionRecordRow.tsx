import React from 'react';
import { ExecutionRecord } from '@/data/os/forge';

interface ExecutionRecordRowProps {
  record: ExecutionRecord;
  isSelected: boolean;
  onSelect: () => void;
}

export const ExecutionRecordRow: React.FC<ExecutionRecordRowProps> = ({
  record,
  isSelected,
  onSelect,
}) => {
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
      <div className="w-24 shrink-0 font-bold text-[var(--foreground)]">
        {record.id}
      </div>
      <div className="w-24 shrink-0 font-semibold text-[var(--foreground)]">
        {record.taskId}
      </div>
      <div className="w-24 shrink-0 font-bold text-[var(--signal)] text-[11px] text-center">
        {record.runId}
      </div>
      <div className="w-36 shrink-0 text-[var(--muted)] truncate">
        {record.nodeId}
      </div>
      <div className="w-24 shrink-0 text-center">
        <span className="px-1.5 py-0.5 border border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)] text-[9px] uppercase tracking-wider inline-block text-center w-full font-bold">
          {record.status}
        </span>
      </div>
      <div className="flex-1 min-w-0 text-[var(--muted)] truncate">
        {record.receivedAt}
      </div>
    </button>
  );
};