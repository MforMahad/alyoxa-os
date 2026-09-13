import React from 'react';

export const ForgeHeader: React.FC = () => {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
      <div>
        <div className="text-[10px] tracking-widest text-[var(--primary)] uppercase">
          FORGE // EXECUTION RUNTIME
        </div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)] uppercase">
          ALYOXA EXECUTION & AUTOMATION
        </h2>
      </div>

      <div className="flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Pipeline:</span>
          <span className="text-[var(--foreground)] font-semibold">
            RECEIVE → PREPARE → DISPATCH → EXECUTE
          </span>
        </div>
        <div className="flex items-center gap-2 border-l border-[var(--border)] pl-6">
          <span className="text-[var(--muted)]">Status:</span>
          <span className="px-2 py-0.5 border border-[var(--signal)]/30 bg-[var(--signal)]/10 text-[var(--signal)] text-[10px] uppercase tracking-wider font-bold">
            FOUNDATION
          </span>
        </div>
      </div>
    </header>
  );
};