import React from 'react';

export const PulseHeader: React.FC = () => {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] p-6 font-mono">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--signal)]">
            PULSE // COMMUNICATION RUNTIME
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            ALYOXA COMMUNICATION & COLLABORATION
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-[var(--muted)]">
            PIPELINE:{' '}
            <span className="font-semibold text-[var(--foreground)]">
              REQUEST → DISCUSS → REVIEW → APPROVE → COMMUNICATE
            </span>
          </div>
          <div className="border-l border-[var(--border)] pl-4 text-[var(--muted)]">
            STATUS:{' '}
            <span className="font-bold text-[var(--primary)] uppercase tracking-wider">
              FOUNDATION
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};