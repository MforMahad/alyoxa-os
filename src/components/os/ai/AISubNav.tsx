import React from 'react';
import Link from 'next/link';

export type AITab = 'context' | 'decisions' | 'runs';

interface AISubNavProps {
  activeTab: AITab;
}

export const AISubNav: React.FC<AISubNavProps> = ({ activeTab }) => {
  const navItems: { id: AITab; label: string; count?: string }[] = [
    { id: 'context', label: 'CONTEXT', count: 'SYS' },
    { id: 'decisions', label: 'DECISIONS' },
    { id: 'runs', label: 'RUNS' },
  ];

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--background)] px-6 flex items-center gap-1 font-mono text-xs select-none">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <Link
            key={item.id}
            href={`/app/ai?tab=${item.id}`}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors ${
              isActive
                ? 'border-[var(--signal)] text-[var(--foreground)] font-bold bg-[var(--surface)]/30'
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