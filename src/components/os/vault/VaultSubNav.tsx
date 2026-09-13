'use client';

import React from 'react';
import Link from 'next/link';

export type VaultTab = 'assets' | 'knowledge' | 'search' | 'folders' | 'activity';

interface VaultSubNavProps {
  activeTab: VaultTab;
  counts: {
    assets: number;
    knowledge: number;
    folders: number;
  };
}

export const VaultSubNav: React.FC<VaultSubNavProps> = ({ activeTab, counts }) => {
  const tabs: { id: VaultTab; label: string }[] = [
    { id: 'assets', label: `ASSETS [${String(counts.assets).padStart(2, '0')}]` },
    { id: 'knowledge', label: `KNOWLEDGE [${String(counts.knowledge).padStart(2, '0')}]` },
    { id: 'search', label: 'SEARCH' },
    { id: 'folders', label: `FOLDERS [${String(counts.folders).padStart(2, '0')}]` },
    { id: 'activity', label: 'ACTIVITY [FOUNDATION]' },
  ];

  return (
    <nav className="w-full bg-[var(--surface)] border-b border-[var(--border)] px-6 flex items-center gap-6 font-mono text-xs h-10">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/vault?tab=${tab.id}`}
            className={`h-full flex items-center border-b-2 transition-colors font-medium text-[11px] ${
              isActive
                ? 'border-[var(--primary)] text-[var(--foreground)] font-bold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};