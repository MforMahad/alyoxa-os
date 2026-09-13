import React from 'react';
import { VaultItem, VaultFolder } from '@/data/os/vault';
import { VaultReferencesPanel } from './VaultReferencesPanel';
import { VaultContextStatus } from './VaultContextStatus';

interface VaultAssetInspectorProps {
  asset: VaultItem;
  availableFolders: VaultFolder[];
}

export const VaultAssetInspector: React.FC<VaultAssetInspectorProps> = ({
  asset,
  availableFolders,
}) => {
  const resolvedFolder = availableFolders.find((f) => f.id === asset.folderId);

  const formatSizeBytes = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return 'NOT SPECIFIED';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)] p-5 font-mono space-y-6 text-xs overflow-y-auto">
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          ASSET INSPECTOR
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)] mt-0.5">
          {asset.id}
        </h3>
      </div>

      {/* IDENTITY */}
      <div className="space-y-3">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-1">
          IDENTITY
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">NAME</div>
          <div className="text-[var(--foreground)] font-semibold font-sans">{asset.name}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">TYPE</div>
            <div className="text-[var(--foreground)] font-semibold uppercase">{asset.type}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">VERSION</div>
            <div className="text-[var(--foreground)] font-semibold">v{asset.version}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">STATUS</div>
            <div className="text-[var(--foreground)] font-semibold uppercase">{asset.status}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">VISIBILITY</div>
            <div className="text-[var(--foreground)] font-semibold uppercase">{asset.visibility}</div>
          </div>
        </div>
      </div>

      {/* FILE METADATA */}
      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          FILE METADATA
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">MIME TYPE</div>
          <div className="text-[var(--foreground)] font-semibold">{asset.mimeType ?? 'NOT SPECIFIED'}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">SIZE</div>
          <div className="text-[var(--foreground)] font-semibold">{formatSizeBytes(asset.sizeBytes)}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">DESCRIPTION</div>
          <p className="p-3 bg-[var(--background)] border border-[var(--border)] text-[11px] text-[var(--foreground)] leading-relaxed font-sans mt-1">
            {asset.description ?? 'NOT SPECIFIED'}
          </p>
        </div>
      </div>

      {/* FOLDER CONTEXT */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          FOLDER CONTEXT
        </div>

        {resolvedFolder ? (
          <div className="p-3 bg-[var(--background)] border border-[var(--border)] space-y-1">
            <div className="font-bold text-[var(--foreground)]">{resolvedFolder.id}</div>
            <div className="text-[var(--primary)] font-medium text-[11px] font-sans">
              {resolvedFolder.name}
            </div>
            {resolvedFolder.description && (
              <div className="text-[10px] text-[var(--muted)] font-sans pt-1">
                {resolvedFolder.description}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 border border-[var(--border)] text-[var(--primary)] font-bold text-[10px]">
            {asset.folderId ? `FOLDER REFERENCE UNRESOLVED (${asset.folderId})` : 'NOT SPECIFIED'}
          </div>
        )}
      </div>

      {/* TAGS */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          TAGS
        </div>
        {asset.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {asset.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--foreground)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[var(--muted)] text-[10px]">NOT SPECIFIED</div>
        )}
      </div>

{/* EXTENDED METADATA */}
<div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          EXTENDED METADATA
        </div>
        <pre className="p-3 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--foreground)] overflow-x-auto">
          {JSON.stringify(asset.metadata, null, 2)}
        </pre>
      </div>

      {/* OS CONTEXT AVAILABILITY */}
      <VaultContextStatus recordId={asset.id} />

      {/* CONTEXT / REFERENCES */}
      <div className="border-t border-[var(--border)] pt-4">
        <VaultReferencesPanel targetRecordId={asset.id} />
      </div>

      {/* OWNERSHIP & TIMING */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2 text-[10px]">
        <div className="text-[var(--muted)] uppercase tracking-wider">
          OWNERSHIP & TIMING
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--muted)]">CREATED BY:</span>
          <span className="text-[var(--signal)] font-bold">{asset.createdBy}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--muted)]">CREATED AT:</span>
          <span className="text-[var(--foreground)]">{asset.createdAt}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--muted)]">UPDATED AT:</span>
          <span className="text-[var(--foreground)]">{asset.updatedAt}</span>
        </div>
      </div>
    </div>
  );
};