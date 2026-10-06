import React from 'react';

export const AICoreHeader: React.FC = () => {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/30 px-6 py-4 flex items-center justify-between font-mono text-xs select-none">
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 border border-[var(--signal)]/30 text-[var(--signal)] bg-[var(--signal)]/10 font-bold tracking-wider uppercase text-[10px]">
          AI CORE // RUNTIME
        </span>
        <span className="text-[var(--foreground)] font-bold tracking-tight text-sm">
          ALYOXA INTELLIGENCE &amp; ORCHESTRATION
        </span>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-[var(--muted)]">
        <div>
          PIPELINE: <span className="text-[var(--signal)] font-bold">OBSERVE → UNDERSTAND → DECIDE</span>
        </div>
        <div>
          STATUS: <span className="text-[var(--foreground)] font-bold">ACTIVE</span>
        </div>
      </div>
    </header>
  );
};