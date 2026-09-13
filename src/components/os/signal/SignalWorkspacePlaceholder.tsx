import React from 'react';

export const SignalWorkspacePlaceholder: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[420px] border border-dashed border-[var(--border)] bg-[var(--surface)]/10 p-8 text-center select-none">
      <div className="w-2.5 h-2.5 rounded-sm bg-[var(--signal)] mb-4 animate-ping" />
      <div className="font-mono text-xs text-[var(--foreground)] font-bold tracking-widest uppercase mb-1">
        SIGNAL WORKSPACE STAGE READY
      </div>
      <p className="font-mono text-[11px] text-[var(--muted)] max-w-md">
        Observation channels connected. Data pipeline models bound to <code className="text-[var(--foreground)]">src/data/os/signal.ts</code>. View interactions scheduled for Phase 2.
      </p>
    </div>
  );
};