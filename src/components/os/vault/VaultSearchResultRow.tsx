import React from 'react';
import { VaultSearchResult } from './vaultSearch';


interface VaultSearchResultRowProps {
  result: VaultSearchResult;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const VaultSearchResultRow: React.FC<VaultSearchResultRowProps> = ({
  result,
  isSelected,
  onSelect,
}) => {
  const isAsset = result.resultType === 'asset';

  return (
    <button
      type="button"
      onClick={() => onSelect(result.id)}
      className={`w-full text-left p-4 font-mono text-xs border-b border-[var(--border)] transition-colors flex flex-col gap-2 ${
        isSelected
          ? 'bg-[var(--surface-elevated)] border-l-2 border-l-[var(--primary)]'
          : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border-l-2 border-l-transparent'
      }`}
      aria-label={`Select search result ${result.id} - ${result.title}`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--foreground)]">{result.id}</span>
          <span
            className={`px-1.5 py-0.5 text-[9px] uppercase border font-bold ${
              isAsset
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-[var(--signal)] text-[var(--signal)]'
            }`}
          >
            {result.resultType}
          </span>
        </div>
        <span className="text-[10px] text-[var(--muted)]">
          MATCH: <span className="text-[var(--foreground)]">{result.matchedField}</span>
        </span>
      </div>

      <div className="text-[var(--foreground)] font-semibold truncate w-full font-sans text-xs">
        {result.title}
      </div>

      <div className="text-[var(--muted)] line-clamp-2 w-full font-sans text-[11px] leading-relaxed">
        {result.summary}
      </div>

      <div className="text-[9px] text-[var(--muted)] truncate pt-0.5">
        SNIPPET: <span className="text-[var(--foreground)]">{result.matchedSnippet}</span>
      </div>
    </button>
  );
};