import { PageHeader } from '@/components/os/shell/PageHeader'
import { ExampleWorkspace } from '@/components/os/shell/ExampleWorkspace'
import React from 'react';
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

  return <div className="os-module-page">
    <PageHeader title="Library" description="Find saved files and information, with supporting details when you need them." />
    <VaultSubNav activeTab={activeTab as VaultTab} counts={counts} />
    {(activeTab === 'folders' || activeTab === 'activity') && <p className="os-notice">This view is not available yet. Use Files, Saved information or Search to explore the existing Library examples.</p>}
    <ExampleWorkspace purpose="Use the tabs to explore the existing file and information views. Detailed records remain available below.">
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

    </ExampleWorkspace>
  </div>
}
