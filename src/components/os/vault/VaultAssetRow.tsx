import React from 'react';
import { VaultItem, VaultItemType } from '@/data/os/vault';

interface VaultAssetRowProps {
  asset: VaultItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const VaultAssetRow: React.FC<VaultAssetRowProps> = ({
  asset,
  isSelected,
  onSelect,
}) => {
  const getTypeStyle = (type: VaultItemType) => {
    switch (type) {
      case 'brand_asset':
        return 'text-[var(--signal)] font-bold';
      case 'template':
        return 'text-[var(--primary)] font-bold';
      case 'document':
      case 'project_resource':
        return 'text-[var(--foreground)]';
      case 'file':
      default:
        return 'text-[var(--muted)]';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(asset.id)}
      className={`w-full text-left p-4 font-mono text-xs border-b border-[var(--border)] transition-colors flex flex-col gap-2 ${
        isSelected
          ? 'bg-[var(--surface-elevated)] border-l-2 border-l-[var(--primary)]'
          : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border-l-2 border-l-transparent'
      }`}
      aria-label={`Select asset ${asset.id} - ${asset.name}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-bold text-[var(--foreground)]">{asset.id}</span>
        <span className={`uppercase text-[10px] ${getTypeStyle(asset.type)}`}>
          {asset.type}
        </span>
      </div>

      <div className="text-[var(--foreground)] font-semibold truncate w-full font-sans text-xs">
        {asset.name}
      </div>

      <div className="flex flex-col gap-1 text-[10px] text-[var(--muted)] pt-1">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span>STATUS: <span className="text-[var(--foreground)] uppercase">{asset.status}</span></span>
            <span>|</span>
            <span>VIS: <span className="text-[var(--foreground)] uppercase">{asset.visibility}</span></span>
          </div>
          <span>v{asset.version}</span>
        </div>

        <div className="flex items-center justify-between w-full text-[9px]">
          <span>UPDATED: <span className="text-[var(--foreground)]">{asset.updatedAt}</span></span>
        </div>
      </div>
    </button>
  );
};