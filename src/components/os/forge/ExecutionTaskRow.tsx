import React from 'react';
import { ExecutionTask, ExecutionTaskStatus } from '@/data/os/forge';

interface ExecutionTaskRowProps {
  task: ExecutionTask;
  isSelected: boolean;
  onSelect: () => void;
}

export const ExecutionTaskRow: React.FC<ExecutionTaskRowProps> = ({
  task,
  isSelected,
  onSelect,
}) => {
  const getStatusStyle = (status: ExecutionTaskStatus) => {
    switch (status) {
      case 'received':
        return 'text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--primary)]/15 font-bold';
      case 'queued':
      case 'ready':
        return 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10';
      case 'running':
      case 'completed':
      case 'failed':
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
      <div className="w-24 shrink-0 font-bold text-[var(--foreground)]">
        {task.id}
      </div>
      <div className="w-24 shrink-0 font-bold text-[var(--signal)] text-[11px] text-center">
        {task.runId}
      </div>
      <div className="w-48 shrink-0 font-semibold text-[var(--foreground)] truncate">
        {task.nodeId}
      </div>
      <div className="w-32 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full ${getStatusStyle(
            task.status
          )}`}
        >
          {task.status}
        </span>
      </div>
      <div className="flex-1 min-w-0 font-semibold text-[var(--muted)] truncate">
        {task.actionName}
      </div>
    </button>
  );
};