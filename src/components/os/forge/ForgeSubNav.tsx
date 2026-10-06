import React from 'react';
import Link from 'next/link';

export type ForgeTab = 'tasks' | 'nodes' | 'records';

interface ForgeSubNavProps {
  activeTab: ForgeTab;
}

export const ForgeSubNav: React.FC<ForgeSubNavProps> = ({ activeTab }) => {
  const navItems: { id: ForgeTab; label: string; count?: string }[] = [
    { id: 'tasks', label: 'TASKS', count: '2' },
    { id: 'nodes', label: 'NODES', count: '2' },
    { id: 'records', label: 'RECORDS', count: '2' },
  ];

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--background)] px-6 flex items-center gap-1 font-mono text-xs select-none">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <Link
            key={item.id}
            href={`/app/forge?tab=${item.id}`}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors ${
              isActive
                ? 'border-[var(--primary)] text-[var(--foreground)] font-bold bg-[var(--surface)]/30'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <span>{item.label}</span>
            {item.count && (
              <span className="text-[9px] px-1 py-0.2 border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};