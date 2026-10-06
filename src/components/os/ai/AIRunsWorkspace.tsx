'use client';

import React, { useState } from 'react';
import { AIRun } from '@/data/os/ai/aiRuns';

import { AIContextItem } from '@/data/os/ai/aiCore';
import { RunRow } from './RunRow';
import { RunInspector } from './RunInspector';
import { AIDecision } from '../../../data/os/ai/aiDecisions';

interface AIRunsWorkspaceProps {
  runs: AIRun[];
  decisions: AIDecision[];
  contexts: AIContextItem[];
}

export const AIRunsWorkspace: React.FC<AIRunsWorkspaceProps> = ({
  runs,
  decisions,
  contexts,
}) => {
  const [selectedRunId, setSelectedRunId] = useState<string>(
    runs[0]?.id || ''
  );

  const selectedRun =
    runs.find((r) => r.id === selectedRunId) || runs[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] border border-[var(--border)] bg-[var(--background)]">
      {/* Master List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Table Column Headers */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider select-none">
          <div className="w-24 shrink-0">RUN_ID</div>
          <div className="w-24 shrink-0 text-center">DECISION</div>
          <div className="w-24 shrink-0">TRIGGER</div>
          <div className="w-40 shrink-0 text-center">STATUS</div>
          <div className="w-40 shrink-0">TARGET</div>
          <div className="flex-1 min-w-0">ACTION</div>
        </div>

        {/* Runs Registry Rows */}
        <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
          {runs.length > 0 ? (
            runs.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                isSelected={run.id === selectedRun?.id}
                onSelect={() => setSelectedRunId(run.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center font-mono text-xs text-[var(--muted)] space-y-1">
              <div>No runs yet.</div>
              <div className="text-[10px] opacity-75">Execution records will appear here when AI decisions enter the execution flow.</div>
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer Inspector */}
      {selectedRun && (
        <RunInspector
          run={selectedRun}
          availableDecisions={decisions}
          availableContexts={contexts}
        />
      )}
    </div>
  );
};