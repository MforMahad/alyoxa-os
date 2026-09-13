import { getVaultContextForRecord } from '@/lib/vaultIntegration';
import React from 'react';


interface VaultContextStatusProps {
  recordId: string;
}

export const VaultContextStatus: React.FC<VaultContextStatusProps> = ({ recordId }) => {
  const context = getVaultContextForRecord(recordId);

  if (!context) return null;

  const { isAvailable, recordType, references } = context;

  return (
    <div className="border-t border-[var(--border)] pt-4 space-y-2 font-mono">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
        <span className="text-[var(--muted)]">OS CONTEXT AVAILABILITY</span>
        <span
          className={`px-1.5 py-0.5 text-[9px] font-bold border ${
            isAvailable
              ? 'border-[var(--signal)] text-[var(--signal)] bg-[var(--surface-elevated)]'
              : 'border-[var(--primary)] text-[var(--primary)]'
          }`}
        >
          {isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}
        </span>
      </div>

      <div className="p-3 bg-[var(--background)] border border-[var(--border)] space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-[var(--muted)]">SOURCE MODULE:</span>
          <span className="text-[var(--primary)] font-bold">VAULT</span>
        </div>

        <div className="flex justify-between items-center text-[10px]">
          <span className="text-[var(--muted)]">RECORD TYPE:</span>
          <span className="text-[var(--foreground)] font-semibold uppercase">{recordType}</span>
        </div>

        <div className="flex justify-between items-center text-[10px]">
          <span className="text-[var(--muted)]">LINKED REFERENCES:</span>
          <span className="text-[var(--signal)] font-bold">{references.length} ATTACHED</span>
        </div>

        <p className="text-[10px] text-[var(--muted)] font-sans pt-1 border-t border-[var(--border)] mt-1">
          {isAvailable
            ? 'Record is indexed for application-level context projection across ALYOXA OS.'
            : 'Record context unavailable for cross-module projection.'}
        </p>
      </div>
    </div>
  );
};