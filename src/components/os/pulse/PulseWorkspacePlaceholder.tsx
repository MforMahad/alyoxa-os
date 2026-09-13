import React from 'react';

interface PulseWorkspacePlaceholderProps {
  activeTab: string;
}

export const PulseWorkspacePlaceholder: React.FC<PulseWorkspacePlaceholderProps> = ({ activeTab }) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-12 font-mono text-xs">
      <div className="w-full max-w-xl border border-[var(--border)] bg-[var(--surface)] p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
            PULSE WORKSPACE // {activeTab.toUpperCase()}
          </span>
          <span className="text-[10px] text-[var(--signal)]">INITIALIZED</span>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-[var(--foreground)] uppercase">
            Communication and collaboration runtime initialized.
          </h2>
          <p className="text-[var(--muted)] leading-relaxed">
            REQUESTS / THREADS / APPROVALS / ACTIVITY
          </p>
        </div>

        <div className="border-t border-[var(--border)] pt-4 text-[10px] text-[var(--muted)]">
          Workspace implementation follows in subsequent Pulse operational phases.
        </div>
      </div>
    </div>
  );
};