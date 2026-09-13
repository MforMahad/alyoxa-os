'use client';

import React, { useState } from 'react';

import { AIContextItem } from '@/data/os/aiCore';
import { DecisionRow } from './DecisionRow';
import { DecisionInspector } from './DecisionInspector';
import { AIDecision } from './aiDecisions';

interface AIDecisionsWorkspaceProps {
  decisions: AIDecision[];
  contexts: AIContextItem[];
}

export const AIDecisionsWorkspace: React.FC<AIDecisionsWorkspaceProps> = ({
  decisions,
  contexts,
}) => {
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>(
    decisions[0]?.id || ''
  );

  const selectedDecision =
    decisions.find((d) => d.id === selectedDecisionId) || decisions[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] border border-[var(--border)] bg-[var(--background)]">
      {/* Master List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Table Column Headers */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider select-none">
          <div className="w-28 shrink-0">DECISION_ID</div>
          <div className="w-20 shrink-0 text-center">SRC</div>
          <div className="w-16 shrink-0 text-right">CONF</div>
          <div className="flex-1 min-w-0">DECISION SUMMARY</div>
          <div className="w-36 shrink-0 text-center">ATTENTION</div>
          <div className="w-32 shrink-0 text-center">STATUS</div>
        </div>

        {/* Decisions Registry Rows */}
        <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
          {decisions.length > 0 ? (
            decisions.map((decision) => (
              <DecisionRow
                key={decision.id}
                decision={decision}
                isSelected={decision.id === selectedDecision?.id}
                onSelect={() => setSelectedDecisionId(decision.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center font-mono text-xs text-[var(--muted)]">
              NO AI DECISIONS PRODUCED
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer Inspector */}
      {selectedDecision && (
        <DecisionInspector
          decision={selectedDecision}
          availableContexts={contexts}
        />
      )}
    </div>
  );
};