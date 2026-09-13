import React from 'react';

import { VaultReference } from '@/data/os/vault';
import { getSourceBadgeStyle, getVaultReferencesForRecord } from '../../../lib/vaultReferences';

interface VaultReferencesPanelProps {
  targetRecordId: string;
  referencesRegistry?: VaultReference[];
}

export const VaultReferencesPanel: React.FC<VaultReferencesPanelProps> = ({
  targetRecordId,
  referencesRegistry,
}) => {
  const resolvedReferences = getVaultReferencesForRecord(
    targetRecordId,
    referencesRegistry
  );

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-1">
        CONTEXT / REFERENCES ({resolvedReferences.length})
      </div>

      {resolvedReferences.length === 0 ? (
        <div className="p-3 bg-[var(--background)] border border-[var(--border)] text-[11px] text-[var(--muted)] font-sans">
          NO EXTERNAL OS REFERENCES
        </div>
      ) : (
        <div className="space-y-2">
          {resolvedReferences.map(({ reference, isResolved, summary }) => {
            const badgeStyle = getSourceBadgeStyle(reference.sourceModule);

            return (
              <div
                key={reference.id}
                className="p-3 bg-[var(--background)] border border-[var(--border)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 text-[9px] uppercase border font-bold ${badgeStyle.border} ${badgeStyle.text}`}
                    >
                      {reference.sourceModule}
                    </span>
                    <span className="font-bold text-[var(--foreground)] text-[11px]">
                      {reference.sourceRecordId}
                    </span>
                  </div>
                  <span className="text-[9px] text-[var(--muted)] uppercase border border-[var(--border)] px-1 py-0.5">
                    {reference.type}
                  </span>
                </div>

                {isResolved ? (
                  <div className="text-[11px] text-[var(--foreground)] font-sans leading-relaxed">
                    {summary}
                  </div>
                ) : (
                  <div className="text-[10px] text-[var(--muted)] font-mono uppercase tracking-wider">
                    REFERENCE UNRESOLVED
                  </div>
                )}

                {reference.label && isResolved && (
                  <div className="text-[9px] text-[var(--muted)]">
                    LABEL: <span className="text-[var(--foreground)]">{reference.label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};