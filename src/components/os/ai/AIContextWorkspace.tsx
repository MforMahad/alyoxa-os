'use client';

import React, { useState } from 'react';
import { AIContextItem } from '@/data/os/ai/aiCore';
import { AIContextRow } from './AIContextRow';
import { AIContextInspector } from './AIContextInspector';

interface AIContextWorkspaceProps {
  items: AIContextItem[];
}

export const AIContextWorkspace: React.FC<AIContextWorkspaceProps> = ({
  items,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(
    items[0]?.id || ''
  );

  const selectedItem =
    items.find((i) => i.id === selectedItemId) || items[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] border border-[var(--border)] bg-[var(--background)]">
      {/* Master List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Table Column Headers */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider select-none">
          <div className="w-32 shrink-0">CONTEXT_ID</div>
          <div className="w-36 shrink-0">TYPE</div>
          <div className="w-20 shrink-0 text-center">SRC</div>
          <div className="flex-1 min-w-0">CONTEXT SUMMARY</div>
          <div className="w-24 shrink-0 text-center">RELEVANCE</div>
          <div className="w-36 shrink-0 text-right">TIMESTAMP</div>
        </div>

        {/* Context Items Rows */}
        <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
          {items.length > 0 ? (
            items.map((item) => (
              <AIContextRow
                key={item.id}
                item={item}
                isSelected={item.id === selectedItem?.id}
                onSelect={() => setSelectedItemId(item.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center font-mono text-xs text-[var(--muted)] space-y-1">
              <div>No context items yet.</div>
              <div className="text-[10px] opacity-75">Relevant system context will appear here as AI processes organizational activity.</div>
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer Inspector */}
      {selectedItem && <AIContextInspector item={selectedItem} />}
    </div>
  );
};