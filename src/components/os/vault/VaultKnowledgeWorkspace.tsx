'use client';

import React, { useState } from 'react';
import { VaultKnowledgeEntry, VaultItem } from '@/data/os/vault';
import { VaultKnowledgeRow } from './VaultKnowledgeRow';
import { VaultKnowledgeInspector } from './VaultKnowledgeInspector';

interface VaultKnowledgeWorkspaceProps {
  knowledgeEntries: VaultKnowledgeEntry[];
  items: VaultItem[];
}

export const VaultKnowledgeWorkspace: React.FC<VaultKnowledgeWorkspaceProps> = ({
  knowledgeEntries,
  items,
}) => {
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string>(
    knowledgeEntries[0]?.id ?? ''
  );

  if (knowledgeEntries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 font-mono text-xs text-[var(--muted)]">
        NO VAULT KNOWLEDGE FOUND IN REGISTRY
      </div>
    );
  }

  const selectedKnowledge =
    knowledgeEntries.find((k) => k.id === selectedKnowledgeId) ?? knowledgeEntries[0];

  return (
    <div className="flex flex-1 flex-col lg:flex-row min-h-0 bg-[var(--background)]">
      {/* KNOWLEDGE REGISTRY */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
          <span>VAULT KNOWLEDGE REGISTRY</span>
          <span>COUNT: {knowledgeEntries.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {knowledgeEntries.map((entry) => (
            <VaultKnowledgeRow
              key={entry.id}
              entry={entry}
              isSelected={entry.id === selectedKnowledge.id}
              onSelect={setSelectedKnowledgeId}
            />
          ))}
        </div>
      </div>

      {/* KNOWLEDGE INSPECTOR */}
      <VaultKnowledgeInspector
        entry={selectedKnowledge}
        availableItems={items}
      />
    </div>
  );
};