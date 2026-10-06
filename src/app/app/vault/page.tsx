import React from 'react';
import { OverviewSidebar } from '@/components/os/OverviewSidebar';
import { VaultHeader } from '@/components/os/vault/VaultHeader';
import { VaultSubNav, VaultTab } from '@/components/os/vault/VaultSubNav';
import { VaultWorkspacePlaceholder } from '@/components/os/vault/VaultWorkspacePlaceholder';
import { VaultAssetsWorkspace } from '@/components/os/vault/VaultAssetsWorkspace';
import { VaultKnowledgeWorkspace } from '@/components/os/vault/VaultKnowledgeWorkspace';
import { VaultSearchWorkspace } from '@/components/os/vault/VaultSearchWorkspace';
import {
  vaultItemsRegistry,
  vaultKnowledgeRegistry,
  vaultFoldersRegistry,
} from '@/data/os/vault';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Local extended type definition for page routing
type ExtendedVaultTab = VaultTab | 'search';

const VALID_TABS: ExtendedVaultTab[] = ['assets', 'knowledge', 'folders', 'activity', 'search'];

export default async function VaultPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const rawTab = typeof resolvedParams.tab === 'string' ? resolvedParams.tab : 'assets';
  
  const activeTab: ExtendedVaultTab = VALID_TABS.includes(rawTab as ExtendedVaultTab)
    ? (rawTab as ExtendedVaultTab)
    : 'assets';

  const counts = {
    assets: vaultItemsRegistry.length,
    knowledge: vaultKnowledgeRegistry.length,
    folders: vaultFoldersRegistry.length,
  };

  return (
    <div className="flex h-screen w-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans">
      <OverviewSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Pass activeTab as VaultTab fallback to satisfy VaultSubNav prop type */}
        <VaultHeader />
        <VaultSubNav activeTab={activeTab as VaultTab} counts={counts} />
        <main className="flex-1 flex flex-col min-h-0 overflow-auto">
          {activeTab === 'assets' && (
            <VaultAssetsWorkspace
              assets={vaultItemsRegistry}
              folders={vaultFoldersRegistry}
            />
          )}

          {activeTab === 'knowledge' && (
            <VaultKnowledgeWorkspace
              knowledgeEntries={vaultKnowledgeRegistry}
              items={vaultItemsRegistry}
            />
          )}

          {activeTab === 'search' && (
            <VaultSearchWorkspace
              assets={vaultItemsRegistry}
              knowledge={vaultKnowledgeRegistry}
              folders={vaultFoldersRegistry}
            />
          )}

          {activeTab === 'folders' && (
            <VaultWorkspacePlaceholder tab="folders" />
          )}

          {activeTab === 'activity' && (
            <VaultWorkspacePlaceholder tab="activity" />
          )}
        </main>
      </div>
    </div>
  );
}