import React from 'react';
import { systemMetricsConfig } from '@/data/os/overview';

export const OverviewHeader: React.FC = () => {
  return (
    <header className="h-12 w-full border-b `border-[var(--border)]` bg-[var(--background)]/80` backdrop-blur-md px-6 flex items-center justify-between font-mono text-xs select-none sticky top-0 z-20">
      {/* Workspace & Mode Indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="`text-[var(--muted)]`">ENV //</span>
          <span className="`text-[var(--foreground)]` font-bold tracking-wider">
            {systemMetricsConfig.environment}
          </span>
        </div>
        <span className="`text-[var(--border)]`">|</span>
        <div className="flex items-center gap-2 text-[10px] `text-[var(--muted)]`">
          <span className="w-1.5 h-1.5 rounded-full `bg-[var(--signal)]` animate-pulse" />
          <span>{systemMetricsConfig.mode}</span>
        </div>
      </div>

      {/* Runtime Instrumentation Metrics */}
      <div className="flex items-center gap-6 text-[10px] `text-[var(--muted)]`">
        <div className="flex items-center gap-2">
          <span>EVENT_RATE:</span>
          <span className="`text-[var(--foreground)]`">{systemMetricsConfig.eventRate}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>ACTIVE_ROUTINGS:</span>
          <span className="`text-[var(--primary)]`">{systemMetricsConfig.activeRoutings}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>NODE_HEALTH:</span>
          <span className="`text-[var(--signal)]`">{systemMetricsConfig.nodeHealth}</span>
        </div>
      </div>
    </header>
  );
};