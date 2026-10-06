import React from 'react';
import { Pattern, SeverityLevel } from '@/data/os/signal';

interface PatternRowProps {
  pattern: Pattern;
  isSelected: boolean;
  onSelect: () => void;
}

export const PatternRow: React.FC<PatternRowProps> = ({
  pattern,
  isSelected,
  onSelect,
}) => {
  const getSeverityStyle = (severity: SeverityLevel) => {
    switch (severity) {
      case 'low':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
      case 'medium':
        return 'text-[var(--foreground)] border-[var(--foreground)]/30 bg-[var(--foreground)]/5';
      case 'high':
        return 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10';
      case 'critical':
        return 'text-[var(--primary)] border-[var(--primary)]/50 bg-[var(--primary)]/15 font-bold';
    }
  };

  const getStatusStyle = (status: Pattern['status']) => {
    switch (status) {
      case 'active':
        return 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10';
      case 'monitoring':
        return 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10';
      case 'mitigated':
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
      {/* Pattern ID */}
      <div className="w-24 shrink-0 font-bold text-[var(--foreground)]">
        {pattern.id}
      </div>

      {/* Severity Badge */}
      <div className="w-20 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full ${getSeverityStyle(
            pattern.severity
          )}`}
        >
          {pattern.severity}
        </span>
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0 font-semibold text-[var(--foreground)] truncate">
        {pattern.title}
      </div>

      {/* Status Badge */}
      <div className="w-24 shrink-0">
        <span
          className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider inline-block text-center w-full ${getStatusStyle(
            pattern.status
          )}`}
        >
          {pattern.status}
        </span>
      </div>

      {/* Occurrence Count */}
      <div className="w-20 shrink-0 text-right">
        <span className="text-[var(--signal)] font-bold">{pattern.count}</span>
        <span className="text-[10px] text-[var(--muted)]"> events</span>
      </div>

      {/* Last Observed Timestamp */}
      <div className="w-40 shrink-0 text-right text-[10px] text-[var(--muted)] truncate">
        {pattern.lastObserved}
      </div>
    </button>
  );
};