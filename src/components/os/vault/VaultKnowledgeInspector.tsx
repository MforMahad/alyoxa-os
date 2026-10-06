import React from 'react';
import { VaultKnowledgeEntry, VaultItem } from '@/data/os/vault';
import { VaultContextStatus } from './VaultContextStatus';
import { VaultReferencesPanel } from './VaultReferencesPanel';

interface VaultKnowledgeInspectorProps {
  entry: VaultKnowledgeEntry;
  availableItems: VaultItem[];
}

export const VaultKnowledgeInspector: React.FC<VaultKnowledgeInspectorProps> = ({
  entry,
  availableItems,
}) => {
  const resolvedSourceItem = entry.sourceItemId
    ? availableItems.find((item) => item.id === entry.sourceItemId)
    : undefined;

  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)] p-5 font-mono space-y-6 text-xs overflow-y-auto">
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          KNOWLEDGE INSPECTOR
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)] mt-0.5">
          {entry.id}
        </h3>
      </div>

      {/* IDENTITY */}
      <div className="space-y-3">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-1">
          IDENTITY
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">TITLE</div>
          <div className="text-[var(--foreground)] font-semibold font-sans">{entry.title}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">TYPE</div>
            <div className="text-[var(--foreground)] font-semibold uppercase">{entry.type}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">STATUS</div>
            <div className="text-[var(--foreground)] font-semibold uppercase">{entry.status}</div>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          SUMMARY
        </div>
        <p className="p-3 bg-[var(--background)] border border-[var(--border)] text-[11px] text-[var(--foreground)] leading-relaxed font-sans">
          {entry.summary}
        </p>
      </div>

      {/* CONTENT */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          CONTENT
        </div>
        <div className="p-3 bg-[var(--background)] border border-[var(--border)] text-[11px] text-[var(--foreground)] leading-relaxed font-sans whitespace-pre-wrap">
          {entry.content}
        </div>
      </div>

      {/* SOURCE CONTEXT */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          SOURCE ASSET CONTEXT
        </div>

        {entry.sourceItemId ? (
          resolvedSourceItem ? (
            <div className="p-3 bg-[var(--background)] border border-[var(--border)] space-y-1">
              <div className="font-bold text-[var(--foreground)]">{resolvedSourceItem.id}</div>
              <div className="text-[var(--primary)] font-medium text-[11px] font-sans">
                {resolvedSourceItem.name}
              </div>
              <div className="text-[10px] text-[var(--muted)] uppercase pt-0.5">
                TYPE: {resolvedSourceItem.type}
              </div>
            </div>
          ) : (
            <div className="p-3 border border-[var(--border)] text-[var(--primary)] font-bold text-[10px]">
              SOURCE ASSET REFERENCE UNRESOLVED ({entry.sourceItemId})
            </div>
          )
        ) : (
          <div className="p-3 border border-[var(--border)] text-[var(--muted)] text-[10px]">
            SOURCE ASSET: NOT SPECIFIED
          </div>
        )}
      </div>

      {/* TAGS */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          TAGS
        </div>
        {entry.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
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

      {/* OWNERSHIP & TIMING */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2 text-[10px]">
        <div className="text-[var(--muted)] uppercase tracking-wider">
          OWNERSHIP & TIMING
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--muted)]">CREATED BY:</span>
          <span className="text-[var(--signal)] font-bold">{entry.createdBy}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--muted)]">CREATED AT:</span>
          <span className="text-[var(--foreground)]">{entry.createdAt}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--muted)]">UPDATED AT:</span>
          <span className="text-[var(--foreground)]">{entry.updatedAt}</span>
        </div>
      </div>

     {/* EXTENDED METADATA */}
     <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          EXTENDED METADATA
        </div>
        <pre className="p-3 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--foreground)] overflow-x-auto">
          {JSON.stringify(entry.metadata, null, 2)}
        </pre>
      </div>

      {/* OS CONTEXT AVAILABILITY */}
      <VaultContextStatus recordId={entry.id} />

      {/* CONTEXT / REFERENCES */}
      <div className="border-t border-[var(--border)] pt-4">
        <VaultReferencesPanel targetRecordId={entry.id} />
      </div>
    </div>
  );
};