import React from 'react';
import { AIRun, AIRunStatus, AIRunTrigger } from '@/data/os/aiRuns';

interface RunRowProps {
  run: AIRun;
  isSelected: boolean;
  onSelect: () => void;
}

export const RunRow: React.FC<RunRowProps> = ({
  run,
  isSelected,
  onSelect,
}) => {
  const getStatusStyle = (status: AIRunStatus) => {
    switch (status) {
      case 'awaiting_approval':
      case 'queued':
        return 'text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--primary)]/15 font-bold';
      case 'dispatched':
      case 'completed':
        return 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10';
      case 'failed':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
    }
  };

  const getTriggerStyle = (trigger: AIRunTrigger) => {
    switch (trigger) {
      case 'decision':
        return 'text-[var(--signal)]';
      case 'manual':
        return 'text-[var(--primary)]';
      case 'automation':
        return 'text-[var(--foreground)]';
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
      {/* Run ID */}
      <div className="w-24 shrink-0 font-bold text-[var(--foreground)]">
        {run.id}
      </div>

      {/* Decision ID */}
      <div className="w-24 shrink-0 text-center font-bold text-[var(--signal)] text-[11px]">
        {run.decisionId}
      </div>

      {/* Trigger */}
      <div
        className={`w-24 shrink-0 font-semibold text-[11px] uppercase ${getTriggerStyle(
          run.trigger
        )}`}
      >
        [{run.trigger}]
      </div>

      {/* Status */}
      <div className="w-40 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full ${getStatusStyle(
            run.status
          )}`}
        >
          {run.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Execution Target */}
      <div className="w-40 shrink-0 font-semibold text-[var(--foreground)] truncate">
        {run.executionTarget}
      </div>

      {/* Action Name */}
      <div className="flex-1 min-w-0 font-semibold text-[var(--muted)] truncate">
        {run.actionName}
      </div>
    </button>
  );
};