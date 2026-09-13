import React from 'react';
import { PulseActivity, PulseActivityType } from '@/data/os/pulse';

interface PulseActivityRowProps {
  activity: PulseActivity;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const PulseActivityRow: React.FC<PulseActivityRowProps> = ({
  activity,
  isSelected,
  onSelect,
}) => {
  const getTypeStyle = (type: PulseActivityType) => {
    switch (type) {
      case 'request_received':
      case 'approval_required':
        return 'text-[var(--primary)] font-bold';
      case 'communication_prepared':
        return 'text-[var(--signal)] font-bold';
      case 'thread_opened':
        return 'text-[var(--foreground)]';
      case 'review_pending':
      default:
        return 'text-[var(--muted)]';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(activity.id)}
      className={`w-full text-left p-4 font-mono text-xs border-b border-[var(--border)] transition-colors flex flex-col gap-2 ${
        isSelected
          ? 'bg-[var(--surface-elevated)] border-l-2 border-l-[var(--primary)]'
          : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border-l-2 border-l-transparent'
      }`}
      aria-label={`Select activity ${activity.id}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-bold text-[var(--foreground)]">{activity.id}</span>
        <span className={`uppercase text-[10px] ${getTypeStyle(activity.type)}`}>
          {activity.type}
        </span>
      </div>

      <div className="text-[var(--foreground)] font-semibold truncate w-full">
        {activity.description}
      </div>

      <div className="flex items-center justify-between w-full text-[10px] text-[var(--muted)] pt-1">
        <span>ACTOR: <span className="text-[var(--signal)] font-bold">{activity.actorId}</span></span>
        <span>{activity.timestamp}</span>
      </div>
    </button>
  );
};