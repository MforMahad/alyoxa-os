import React from 'react';
import Link from 'next/link';

interface PulseSubNavProps {
  activeTab: string;
  counts: {
    requests: number;
    threads: number;
    approvals: number;
    activity: number;
  };
}

export const PulseSubNav: React.FC<PulseSubNavProps> = ({ activeTab, counts }) => {
  const tabs = [
    { id: 'requests', label: 'REQUESTS', count: counts.requests },
    { id: 'threads', label: 'THREADS', count: counts.threads },
    { id: 'approvals', label: 'APPROVALS', count: counts.approvals },
    { id: 'activity', label: 'ACTIVITY', count: counts.activity },
  ];

  return (
    <nav className="flex border-b border-[var(--border)] bg-[var(--background)] px-6 font-mono text-xs">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const formattedCount = String(tab.count).padStart(2, '0');

        return (
          <Link
            key={tab.id}
            href={`/app/pulse?tab=${tab.id}`}
            className={`border-b-2 px-4 py-3 font-medium transition-colors ${
              isActive
                ? 'border-[var(--primary)] text-[var(--foreground)]'
                : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
            }`}
          >
            {tab.label} [{formattedCount}]
          </Link>
        );
      })}
    </nav>
  );
};