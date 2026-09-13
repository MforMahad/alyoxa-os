'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationConfig, systemMetricsConfig } from '@/data/os/overview';

export const OverviewSidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-56 h-screen sticky top-0 flex flex-col justify-between border-r border-[var(--border)] bg-[var(--background)] p-4 select-none z-30 shrink-0">
      <div className="space-y-8">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[var(--primary)]" />
          <span className="font-bold text-xs tracking-[0.2em] text-[var(--foreground)] uppercase font-mono">
            ALYOXA OS
          </span>
        </div>

        {/* Primary OS Navigation */}
        <nav className="space-y-1">
          <div className="px-2 pb-2 text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase opacity-60">
            Nodes &amp; Core
          </div>
          {navigationConfig.primary.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-mono tracking-wider transition-colors border-l-2 ${
                  isActive
                    ? 'border-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] font-bold'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]/50'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] px-1 py-0.2 bg-[var(--signal)]/10 text-[var(--signal)] border border-[var(--signal)]/30 font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Secondary OS Navigation */}
        <nav className="space-y-1 pt-4 border-t border-[var(--border)]/50">
          <div className="px-2 pb-2 text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase opacity-60">
            System
          </div>
          {navigationConfig.system.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-mono tracking-wider transition-colors border-l-2 ${
                  isActive
                    ? 'border-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] font-bold'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]/50'
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Runtime Footer */}
      <div className="p-2 border border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] space-y-1">
        <div className="flex justify-between text-[var(--muted)]">
          <span>HOST</span>
          <span className="text-[var(--foreground)]">{systemMetricsConfig.host}</span>
        </div>
        <div className="flex justify-between text-[var(--muted)]">
          <span>LATENCY</span>
          <span className="text-[var(--signal)]">{systemMetricsConfig.latency}</span>
        </div>
      </div>
    </aside>
  );
};