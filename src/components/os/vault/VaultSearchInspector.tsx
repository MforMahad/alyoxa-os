import React from 'react';

import { VaultFolder } from '@/data/os/vault';
import { VaultSearchResult } from './vaultSearch';
import { VaultReferencesPanel } from './VaultReferencesPanel';

interface VaultSearchInspectorProps {
  result: VaultSearchResult;
  availableFolders: VaultFolder[];
}

export const VaultSearchInspector: React.FC<VaultSearchInspectorProps> = ({
  result,
  availableFolders,
}) => {
  const isAsset = result.resultType === 'asset';
  const asset = result.rawAsset;
  const knowledge = result.rawKnowledge;

  const resolvedFolder = asset
    ? availableFolders.find((f) => f.id === asset.folderId)
    : undefined;

  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)] p-5 font-mono space-y-6 text-xs overflow-y-auto">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
            RETRIEVAL RESULT
          </span>
          <span
            className={`px-1.5 py-0.5 text-[9px] uppercase border font-bold ${
              isAsset
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-[var(--signal)] text-[var(--signal)]'
            }`}
          >
            {result.resultType}
          </span>
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)] mt-1">
          {result.id}
        </h3>
      </div>

      {/* MATCH EXPLANATION */}
      <div className="p-3 bg-[var(--background)] border border-[var(--border)] space-y-1">
        <div className="text-[10px] text-[var(--primary)] font-bold uppercase">
          MATCHED FIELD: {result.matchedField}
        </div>
        <div className="text-[11px] text-[var(--foreground)] font-sans">
          {result.matchedSnippet}
        </div>
      </div>

      {/* SOURCE CONTEXT: ASSET */}
      {isAsset && asset && (
        <div className="space-y-4">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-1">
            ASSET CONTEXT
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
              <div className="text-[10px] text-[var(--muted)] uppercase">STATUS</div>
              <div className="text-[var(--foreground)] font-semibold uppercase">{asset.status}</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">FOLDER RESOLUTION</div>
            {resolvedFolder ? (
              <div className="text-[var(--primary)] font-semibold font-sans text-[11px] mt-0.5">
                {resolvedFolder.id} — {resolvedFolder.name}
              </div>
            ) : (
              <div className="text-[var(--muted)] text-[10px] mt-0.5">
                {asset.folderId ? `UNRESOLVED (${asset.folderId})` : 'NOT SPECIFIED'}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">DESCRIPTION</div>
            <div className="p-2.5 bg-[var(--background)] border border-[var(--border)] text-[11px] text-[var(--foreground)] font-sans mt-1">
              {asset.description ?? 'NOT SPECIFIED'}
            </div>
          </div>
        </div>
      )}

      {/* SOURCE CONTEXT: KNOWLEDGE */}
      {!isAsset && knowledge && (
        <div className="space-y-4">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-1">
            KNOWLEDGE CONTEXT
          </div>

          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">TITLE</div>
            <div className="text-[var(--foreground)] font-semibold font-sans">{knowledge.title}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-[var(--muted)] uppercase">TYPE</div>
              <div className="text-[var(--foreground)] font-semibold uppercase">{knowledge.type}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)] uppercase">STATUS</div>
              <div className="text-[var(--foreground)] font-semibold uppercase">{knowledge.status}</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">SUMMARY</div>
            <div className="p-2.5 bg-[var(--background)] border border-[var(--border)] text-[11px] text-[var(--foreground)] font-sans mt-1">
              {knowledge.summary}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">CONTENT</div>
            <div className="p-2.5 bg-[var(--background)] border border-[var(--border)] text-[11px] text-[var(--foreground)] font-sans mt-1 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {knowledge.content}
            </div>
          </div>
        </div>
      )}

      {/* CONTEXT / REFERENCES */}
      <div className="border-t border-[var(--border)] pt-4">
        <VaultReferencesPanel targetRecordId={result.id} />
      </div>

      {/* TIMING */}
      <div className="border-t border-[var(--border)] pt-4 space-y-1.5 text-[10px]">
        <div className="text-[var(--muted)] uppercase tracking-wider mb-2">
          TIMING & OWNER
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">CREATED BY:</span>
          <span className="text-[var(--signal)] font-bold">
            {isAsset ? asset?.createdBy : knowledge?.createdBy}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">UPDATED AT:</span>
          <span className="text-[var(--foreground)]">
            {isAsset ? asset?.updatedAt : knowledge?.updatedAt}
          </span>
        </div>
      </div>
    </div>
  );
};