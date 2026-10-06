import React from 'react';

interface AIWorkspacePlaceholderProps {
  tab: string;
}

export const AIWorkspacePlaceholder: React.FC<AIWorkspacePlaceholderProps> = ({
  tab,
}) => {
  return (
    <div className="border border-[var(--border)] bg-[var(--background)] p-12 text-center font-mono space-y-3">
      <div className="text-[var(--primary)] text-xs font-bold uppercase tracking-widest">
        [PHASE 6 PLACEHOLDER // {tab.toUpperCase()}]
      </div>
      <div className="text-[var(--foreground)] font-bold text-base">
        ORCHESTRATION PIPELINE NODE UNALLOCATED
      </div>
      <p className="text-[var(--muted)] text-xs max-w-md mx-auto">
        Execution decisions and autonomous execution run traces will be exposed in subsequent AI Core releases.
      </p>
    </div>
  );
};