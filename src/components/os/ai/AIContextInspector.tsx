import React from 'react';
import { AIContextItem, ContextRelevance } from '@/data/os/aiCore';

interface AIContextInspectorProps {
  item: AIContextItem;
}

export const AIContextInspector: React.FC<AIContextInspectorProps> = ({
  item,
}) => {
  const getRelevanceStyle = (relevance: ContextRelevance) => {
    switch (relevance) {
      case 'high':
        return 'text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/10 font-bold';
      case 'medium':
        return 'text-[var(--foreground)] border-[var(--foreground)]/30 bg-[var(--foreground)]/5';
      case 'low':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
    }
  };

  return (
    <aside className="w-full lg:w-[480px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--background)] p-5 space-y-6 font-mono text-xs overflow-y-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">CONTEXT //</span>
          <span className="text-[var(--foreground)] font-bold tracking-wider uppercase">
            {item.id}
          </span>
        </div>
        <div
          className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase ${getRelevanceStyle(
            item.relevance
          )}`}
        >
          {item.relevance} RELEVANCE
        </div>
      </div>

      {/* Core Metadata Grid */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 p-3 bg-[var(--surface)]/30 border border-[var(--border)]">
          <div>
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest mb-1">
              CATEGORY TYPE
            </div>
            <div className="text-[var(--signal)] font-bold text-xs">{item.type}</div>
          </div>
          <div>
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest mb-1">
              SOURCE MODULE
            </div>
            <div className="text-[var(--foreground)] font-bold text-xs">
              {item.sourceModule}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">
            Summary
          </div>
          <div className="text-[var(--foreground)] font-semibold leading-relaxed p-3 bg-[var(--surface)]/10 border border-[var(--border)]">
            {item.summary}
          </div>
        </div>

        <div className="flex justify-between items-center p-2.5 border border-[var(--border)] text-[10px]">
          <span className="text-[var(--muted)] uppercase tracking-wider">
            CAPTURED_TIMESTAMP
          </span>
          <span className="text-[var(--foreground)]">{item.timestamp}</span>
        </div>

        {item.refId && (
          <div className="flex justify-between items-center p-2.5 border border-[var(--border)] text-[10px]">
            <span className="text-[var(--muted)] uppercase tracking-wider">
              RESOLVED_ORIGIN_REF
            </span>
            <span className="text-[var(--signal)] font-bold">{item.refId}</span>
          </div>
        )}
      </div>

      {/* Raw Payload Section */}
      <div className="space-y-2 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest flex justify-between items-center">
          <span>Context Frame Payload</span>
          <span className="text-[var(--muted)]">[JSON]</span>
        </div>
        <pre className="p-3 bg-[var(--surface)]/20 border border-[var(--border)] text-[10px] text-[var(--foreground)]/90 overflow-x-auto font-mono leading-tight">
          {JSON.stringify(item.payload, null, 2)}
        </pre>
      </div>

      {/* Boundary Note */}
      <div className="p-3 border border-[var(--border)] bg-[var(--surface)]/10 text-[10px] text-[var(--muted)] leading-relaxed">
        This frame represents structured context ingested into AI Core state. Private chain-of-thought and non-deterministic model weights are not exposed.
      </div>
    </aside>
  );
};