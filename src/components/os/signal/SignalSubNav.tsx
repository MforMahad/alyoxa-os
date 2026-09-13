import React from 'react';
import Link from 'next/link';

export type SignalTab = 'live_stream' | 'sources' | 'patterns' | 'insights';

interface SignalSubNavProps {
  activeTab: SignalTab;
}

export const SignalSubNav: React.FC<SignalSubNavProps> = ({ activeTab }) => {
  const tabs: { id: SignalTab; label: string; code: string }[] = [
    { id: 'live_stream', label: 'STREAM', code: '01' },
    { id: 'sources', label: 'SOURCES', code: '02' },
    { id: 'patterns', label: 'PATTERNS', code: '03' },
    { id: 'insights', label: 'INSIGHTS', code: '04' },
  ];

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)]/50 px-6 font-mono text-xs select-none">
      <div className="flex gap-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/signal?tab=${tab.id}`}
              className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
                isActive
                  ? 'border-[var(--signal)] text-[var(--foreground)] font-bold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span className="text-[10px] text-[var(--muted)]">[{tab.code}]</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};