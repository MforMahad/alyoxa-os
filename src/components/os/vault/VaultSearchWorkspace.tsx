'use client';

import React, { useState, useMemo } from 'react';
import { VaultItem, VaultKnowledgeEntry, VaultFolder } from '@/data/os/vault';

import { VaultSearchBar } from './VaultSearchBar';
import { VaultSearchResultRow } from './VaultSearchResultRow';
import { VaultSearchInspector } from './VaultSearchInspector';
import { searchVault } from './vaultSearch';

interface VaultSearchWorkspaceProps {
  assets: VaultItem[];
  knowledge: VaultKnowledgeEntry[];
  folders: VaultFolder[];
}

export const VaultSearchWorkspace: React.FC<VaultSearchWorkspaceProps> = ({
  assets,
  knowledge,
  folders,
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedResultId, setSelectedResultId] = useState<string>('');

  const results = useMemo(() => {
    return searchVault({ query, assets, knowledge });
  }, [query, assets, knowledge]);

  const activeResult = useMemo(() => {
    if (results.length === 0) return null;
    return results.find((r) => r.id === selectedResultId) ?? results[0];
  }, [results, selectedResultId]);

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--background)]">
      <VaultSearchBar
        query={query}
        onChange={setQuery}
        onReset={() => {
          setQuery('');
          setSelectedResultId('');
        }}
      />

      {!query.trim() ? (
        <div className="flex flex-1 items-center justify-center p-12 font-mono text-xs text-[var(--muted)]">
          NO SEARCH QUERY
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-12 font-mono text-xs text-[var(--muted)]">
          NO MATCHING VAULT RECORDS
        </div>
      ) : (
        <div className="flex flex-1 flex-col lg:flex-row min-h-0">
          {/* SEARCH RESULTS */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
              <span>SEARCH / RETRIEVAL RESULTS</span>
              <span>COUNT: {results.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
              {results.map((result) => (
                <VaultSearchResultRow
                  key={`${result.resultType}-${result.id}`}
                  result={result}
                  isSelected={activeResult?.id === result.id}
                  onSelect={setSelectedResultId}
                />
              ))}
            </div>
          </div>

          {/* INSPECTOR */}
          {activeResult && (
            <VaultSearchInspector
              result={activeResult}
              availableFolders={folders}
            />
          )}
        </div>
      )}
    </div>
  );
};