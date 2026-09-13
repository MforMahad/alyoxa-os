'use client';

import React, { useState } from 'react';
import { Insight, Observation, Pattern, FeedSource } from '@/data/os/signal';
import { InsightRow } from './InsightRow';
import { InsightInspector } from './InsightInspector';

interface SignalInsightsWorkspaceProps {
  insights: Insight[];
  observations: Observation[];
  patterns: Pattern[];
  sources: FeedSource[];
}

export const SignalInsightsWorkspace: React.FC<SignalInsightsWorkspaceProps> = ({
  insights,
  observations,
  patterns,
  sources,
}) => {
  const [selectedInsightId, setSelectedInsightId] = useState<string>(
    insights[0]?.id || ''
  );

  const selectedInsight =
    insights.find((i) => i.id === selectedInsightId) || insights[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] border border-[var(--border)] bg-[var(--background)]">
      {/* Master List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Table Column Headers */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider select-none">
          <div className="w-24 shrink-0">INSIGHT_ID</div>
          <div className="w-16 shrink-0 text-right">CONF</div>
          <div className="flex-1 min-w-0">AI INTERPRETATION</div>
          <div className="w-36 shrink-0">ATTENTION</div>
          <div className="w-32 shrink-0">STATUS</div>
        </div>

        {/* Insight Registry Rows */}
        <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
          {insights.length > 0 ? (
            insights.map((insight) => (
              <InsightRow
                key={insight.id}
                insight={insight}
                isSelected={insight.id === selectedInsight?.id}
                onSelect={() => setSelectedInsightId(insight.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center font-mono text-xs text-[var(--muted)]">
              NO AI INSIGHTS IDENTIFIED
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer Inspector */}
      {selectedInsight && (
        <InsightInspector
          insight={selectedInsight}
          observations={observations}
          patterns={patterns}
          sources={sources}
        />
      )}
    </div>
  );
};