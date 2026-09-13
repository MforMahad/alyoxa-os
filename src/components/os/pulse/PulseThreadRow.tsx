import React from 'react';
import { PulseThread } from '@/data/os/pulse';

interface PulseThreadRowProps {
  thread: PulseThread;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const PulseThreadRow: React.FC<PulseThreadRowProps> = ({
  thread,
  isSelected,
  onSelect,
}) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-[var(--signal)]';
      case 'resolved':
        return 'text-[var(--foreground)]';
      case 'archived':
      default:
        return 'text-[var(--muted)]';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      className={`w-full text-left p-4 font-mono text-xs border-b border-[var(--border)] transition-colors flex flex-col gap-2 ${
        isSelected
          ? 'bg-[var(--surface-elevated)] border-l-2 border-l-[var(--primary)]'
          : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border-l-2 border-l-transparent'
      }`}
      aria-label={`Select thread ${thread.id}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-bold text-[var(--foreground)]">{thread.id}</span>
        <span className={`uppercase font-semibold text-[10px] ${getStatusStyle(thread.status)}`}>
          {thread.status}
        </span>
      </div>

      <div className="text-[var(--foreground)] font-semibold truncate w-full">
        {thread.title}
      </div>

      <div className="flex items-center justify-between w-full text-[10px] text-[var(--muted)] pt-1">
        <span>REQ: {thread.requestId}</span>
        <div className="flex items-center gap-3">
          <span>PARTS: {thread.participants.length}</span>
          <span>MSGS: {thread.messages.length}</span>
        </div>
      </div>
    </button>
  );
};