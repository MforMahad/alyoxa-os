import React from 'react';

interface VaultSearchBarProps {
  query: string;
  onChange: (value: string) => void;
  onReset: () => void;
}

export const VaultSearchBar: React.FC<VaultSearchBarProps> = ({
  query,
  onChange,
  onReset,
}) => {
  return (
    <div className="w-full bg-[var(--surface)] border-b border-[var(--border)] p-3 flex items-center gap-3 font-mono text-xs">
      <span className="text-[var(--primary)] font-bold uppercase tracking-wider text-[10px]">
        SEARCH:
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Query Vault index by ID, title, tag, type, or description..."
        className="flex-1 bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 text-[var(--foreground)] placeholder-[var(--muted)] font-mono text-xs focus:outline-none focus:border-[var(--primary)]"
        aria-label="Search Vault registry"
      />
      {query && (
        <button
          type="button"
          onClick={onReset}
          className="px-2 py-1 bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] text-[10px] uppercase font-mono transition-colors"
          aria-label="Clear search query"
        >
          RESET
        </button>
      )}
    </div>
  );
};