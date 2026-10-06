import React from 'react';
import { PulseRequest, PulseRequestPriority, PulseRequestStatus } from '@/data/os/pulse';

interface PulseRequestRowProps {
  request: PulseRequest;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const PulseRequestRow: React.FC<PulseRequestRowProps> = ({
  request,
  isSelected,
  onSelect,
}) => {
    const getPriorityStyle = (priority: PulseRequestPriority) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'text-[var(--primary)] font-bold';
      case 'medium':
        return 'text-[var(--foreground)]';
      case 'low':
      default:
        return 'text-[var(--muted)]';
    }
  };

  const getStatusStyle = (status: PulseRequestStatus) => {
    switch (status) {
      case 'under_review':
        return 'text-[var(--primary)]';
      case 'approved':
        return 'text-[var(--signal)]';
      case 'received':
        return 'text-[var(--foreground)]';
      case 'rejected':
      default:
        return 'text-[var(--muted)]';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(request.id)}
      className={`w-full text-left p-4 font-mono text-xs border-b border-[var(--border)] transition-colors flex flex-col gap-2 ${
        isSelected
          ? 'bg-[var(--surface-elevated)] border-l-2 border-l-[var(--primary)]'
          : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border-l-2 border-l-transparent'
      }`}
      aria-label={`Select request ${request.id}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-bold text-[var(--foreground)]">{request.id}</span>
        <span className={`uppercase font-semibold text-[10px] ${getPriorityStyle(request.priority)}`}>
          {request.priority}
        </span>
      </div>

      <div className="text-[var(--foreground)] font-semibold truncate w-full">
        {request.title}
      </div>

      <div className="flex items-center justify-between w-full text-[10px] text-[var(--muted)] pt-1">
        <span className="uppercase">{request.type}</span>
        <span className={`uppercase font-semibold ${getStatusStyle(request.status)}`}>
          {request.status}
        </span>
      </div>
    </button>
  );
};