'use client';

import React, { useState } from 'react';
import { VaultItem, VaultFolder } from '@/data/os/vault';
import { VaultAssetRow } from './VaultAssetRow';
import { VaultAssetInspector } from './VaultAssetInspector';

interface VaultAssetsWorkspaceProps {
  assets: VaultItem[];
  folders: VaultFolder[];
}

export const VaultAssetsWorkspace: React.FC<VaultAssetsWorkspaceProps> = ({
  assets,
  folders,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    assets[0]?.id ?? ''
  );

  if (assets.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 font-mono text-xs text-[var(--muted)]">
        NO VAULT ASSETS FOUND IN REGISTRY
      </div>
    );
  }

  const selectedAsset =
    assets.find((a) => a.id === selectedAssetId) ?? assets[0];

  return (
    <div className="flex flex-1 flex-col lg:flex-row min-h-0 bg-[var(--background)]">
      {/* ASSET REGISTRY */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
          <span>VAULT ASSET REGISTRY</span>
          <span>COUNT: {assets.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {assets.map((asset) => (
            <VaultAssetRow
              key={asset.id}
              asset={asset}
              isSelected={asset.id === selectedAsset.id}
              onSelect={setSelectedAssetId}
            />
          ))}
        </div>
      </div>

      {/* ASSET INSPECTOR */}
      <VaultAssetInspector
        asset={selectedAsset}
        availableFolders={folders}
      />
    </div>
  );
};