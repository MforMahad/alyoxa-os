import React from 'react';

export const VaultHeader: React.FC = () => {
  return (
    <header className="w-full bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between font-mono text-xs">
      <div className="flex flex-col gap-1">
        <div className="text-[var(--primary)] text-[10px] font-bold tracking-widest uppercase">
          VAULT // MEMORY RUNTIME
        </div>
        <h1 className="text-sm font-bold text-[var(--foreground)] tracking-tight font-sans">
          ALYOXA MEMORY & KNOWLEDGE
        </h1>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-[var(--muted)]">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--foreground)] font-bold">PIPELINE:</span>
          <span>STORE</span>
          <span className="text-[var(--border)]">→</span>
          <span>ORGANIZE</span>
          <span className="text-[var(--border)]">→</span>
          <span>CONTEXTUALIZE</span>
          <span className="text-[var(--border)]">→</span>
          <span>RETRIEVE</span>
        </div>

        <span className="text-[var(--border)]">|</span>

        <div className="flex items-center gap-1.5">
          <span className="text-[var(--foreground)] font-bold">STATUS:</span>
          <span className="text-[var(--signal)] font-bold">FOUNDATION</span>
        </div>
      </div>
    </header>
  );
};