import React from 'react';
import { AIRun, AIRunStatus } from '@/data/os/ai/aiRuns';

import { AIContextItem } from '@/data/os/ai/aiCore';
import { AIDecision } from '../../../data/os/ai/aiDecisions';

interface RunInspectorProps {
  run: AIRun;
  availableDecisions: AIDecision[];
  availableContexts: AIContextItem[];
}

export const RunInspector: React.FC<RunInspectorProps> = ({
  run,
  availableDecisions,
  availableContexts,
}) => {
  // Resolve linked Decision record
  const resolvedDecision = availableDecisions.find((d) => d.id === run.decisionId);

  // Resolve Context lineage through linked decision
  const resolvedContexts = resolvedDecision
    ? resolvedDecision.contextIds
        .map((ctxId) =>
          availableContexts.find((c) => c.id === ctxId || c.refId === ctxId)
        )
        .filter((c): c is AIContextItem => c !== undefined)
    : [];

  const getStatusStyle = (status: AIRunStatus) => {
    switch (status) {
      case 'awaiting_approval':
      case 'queued':
        return 'text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--primary)]/15 font-bold';
      case 'dispatched':
      case 'completed':
        return 'text-[var(--signal)] border-[var(--signal)]/30 bg-[var(--signal)]/10';
      case 'failed':
        return 'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]';
    }
  };

  return (
    <aside className="w-full lg:w-[480px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--background)] p-5 space-y-6 font-mono text-xs overflow-y-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">RUN //</span>
          <span className="text-[var(--foreground)] font-bold tracking-wider uppercase">
            {run.id}
          </span>
        </div>
        <div
          className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase ${getStatusStyle(
            run.status
          )}`}
        >
          {run.status.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Summary & Execution Boundary */}
      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">
            Orchestration Run Summary
          </div>
          <div className="text-[var(--foreground)] font-semibold leading-relaxed p-3 bg-[var(--surface)]/10 border border-[var(--border)]">
            {run.summary}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-[var(--surface)]/20 border border-[var(--border)]">
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest">
              Trigger Origin
            </div>
            <div className="text-[var(--foreground)] font-bold uppercase mt-0.5">
              {run.trigger}
            </div>
          </div>
          <div className="p-2.5 bg-[var(--surface)]/20 border border-[var(--border)]">
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest">
              Target Node
            </div>
            <div className="text-[var(--signal)] font-bold mt-0.5">
              {run.executionTarget}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Boundary Banners */}
      <div className="space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
          Execution Boundary State
        </div>
        {run.status === 'awaiting_approval' && (
          <div className="p-3 border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[10px] text-[var(--primary)] font-bold tracking-wider uppercase space-y-1">
            <div>AWAITING AUTHORIZATION</div>
            <div className="text-[9px] font-normal text-[var(--primary-soft)] normal-case">
              Orchestration flow paused. Waiting for human approval before dispatching action payload to {run.executionTarget}.
            </div>
          </div>
        )}

        {run.status === 'dispatched' && (
          <div className="p-3 border border-[var(--signal)]/40 bg-[var(--signal)]/10 text-[10px] text-[var(--signal)] font-bold tracking-wider uppercase space-y-1">
            <div>DISPATCHED TO FORGE</div>
            <div className="text-[9px] font-normal text-[var(--signal)]/90 normal-case">
              Run has crossed the AI Core → Forge handoff boundary. Target node execution is not yet implemented.
            </div>
          </div>
        )}
      </div>

      {/* Target Action Details */}
      <div className="space-y-2 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
          Target Action Specification
        </div>
        <div className="p-3 bg-[var(--surface)]/30 border border-[var(--border)] space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-[var(--muted)] uppercase">Action Name</span>
            <span className="text-[var(--primary)] font-bold">{run.actionName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-[var(--muted)] uppercase">Execution Target</span>
            <span className="text-[var(--foreground)]">{run.executionTarget}</span>
          </div>
        </div>
      </div>

      {/* Lineage Trace */}
      <div className="space-y-2 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
          System Lineage Trace
        </div>

        <div className="p-3 bg-[var(--surface)]/20 border border-[var(--border)] space-y-3">
          {/* Decision Node */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[9px]">
              <span className="text-[var(--muted)]">REFERENCED DECISION</span>
              <span className="text-[var(--signal)] font-bold">{run.decisionId}</span>
            </div>
            {resolvedDecision ? (
              <div className="text-[11px] text-[var(--foreground)] font-semibold">
                {resolvedDecision.summary}
              </div>
            ) : (
              <div className="text-[10px] text-[var(--muted)]">Decision record not resolved</div>
            )}
          </div>

          {/* Context Lineage */}
          {resolvedContexts.length > 0 && (
            <div className="pt-2 border-t border-[var(--border)]/30 space-y-1.5">
              <div className="text-[9px] text-[var(--muted)] uppercase">
                Contributing Context Frames [{resolvedContexts.length}]
              </div>
              {resolvedContexts.map((ctx) => (
                <div key={ctx.id} className="text-[10px] flex justify-between items-center">
                  <span className="text-[var(--signal)] font-bold">{ctx.id}</span>
                  <span className="text-[var(--muted)] truncate max-w-[200px]">
                    {ctx.summary}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2 pt-2 border-t border-[var(--border)]/40">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
          Run Timeline
        </div>
        <div className="p-3 bg-[var(--surface)]/20 border border-[var(--border)] space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Started At:</span>
            <span className="text-[var(--foreground)] font-semibold">{run.startedAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Completed At:</span>
            <span className="text-[var(--foreground)] font-semibold">
              {run.completedAt || '—'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};