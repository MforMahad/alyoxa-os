import React from 'react';
import { VaultTab } from './VaultSubNav';

interface VaultWorkspacePlaceholderProps {
  tab: VaultTab;
}

export const VaultWorkspacePlaceholder: React.FC<VaultWorkspacePlaceholderProps> = ({ tab }) => {
  const getTabDetails = (currentTab: VaultTab) => {
    switch (currentTab) {
      case 'assets':
        return {
          title: 'VAULT ASSET REGISTRY',
          status: 'FOUNDATION COMPLETE — ASSET WORKSPACE NOT IMPLEMENTED',
        };
      case 'knowledge':
        return {
          title: 'VAULT KNOWLEDGE REGISTRY',
          status: 'FOUNDATION COMPLETE — KNOWLEDGE WORKSPACE NOT IMPLEMENTED',
        };
      case 'folders':
        return {
          title: 'VAULT FOLDER REGISTRY',
          status: 'FOUNDATION COMPLETE — FOLDER WORKSPACE NOT IMPLEMENTED',
        };
      case 'activity':
      default:
        return {
          title: 'VAULT ACTIVITY',
          status: 'FOUNDATION COMPLETE — ACTIVITY WORKSPACE NOT IMPLEMENTED',
        };
    }
  };

  const { title, status } = getTabDetails(tab);

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center p-8 text-center font-mono bg-[var(--background)]">
      <div className="max-w-md w-full border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col items-center gap-3">
        <span className="text-xs font-bold text-[var(--primary)] tracking-widest uppercase">
          {title}
        </span>
        <div className="h-px w-full bg-[var(--border)]" />
        <p className="text-[10px] text-[var(--muted)] tracking-wider font-semibold uppercase">
          {status}
        </p>
      </div>
    </div>
  );
};