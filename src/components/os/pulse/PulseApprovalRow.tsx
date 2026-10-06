import React from 'react';
import { PulseApproval } from '@/data/os/pulse';

interface PulseApprovalRowProps {
  approval: PulseApproval;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const PulseApprovalRow: React.FC<PulseApprovalRowProps> = ({
  approval,
  isSelected,
  onSelect,
}) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-[var(--primary)] font-bold';
      case 'approved':
        return 'text-[var(--signal)] font-bold';
      case 'rejected':
      default:
        return 'text-[var(--muted)]';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(approval.id)}
      className={`w-full text-left p-4 font-mono text-xs border-b border-[var(--border)] transition-colors flex flex-col gap-2 ${
        isSelected
          ? 'bg-[var(--surface-elevated)] border-l-2 border-l-[var(--primary)]'
          : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border-l-2 border-l-transparent'
      }`}
      aria-label={`Select approval ${approval.id}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-bold text-[var(--foreground)]">{approval.id}</span>
        <span className={`uppercase text-[10px] ${getStatusStyle(approval.status)}`}>
          {approval.status}
        </span>
      </div>

      <div className="text-[var(--foreground)] font-semibold truncate w-full">
        REQ: {approval.requestId}
      </div>

      <div className="flex items-center justify-between w-full text-[10px] text-[var(--muted)] pt-1">
        <span>APPROVER: {approval.approverId}</span>
        <span>{approval.createdAt}</span>
      </div>
    </button>
  );
};