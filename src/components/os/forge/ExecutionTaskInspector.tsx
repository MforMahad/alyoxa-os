import React from 'react';
import { ExecutionTask, ExecutionNode } from '@/data/os/forge';
import { AIRun } from '@/data/os/aiRuns';

import { AIContextItem } from '@/data/os/aiCore';
import { AIDecision } from '../ai/aiDecisions';

interface ExecutionTaskInspectorProps {
  task: ExecutionTask;
  availableRuns: AIRun[];
  availableDecisions: AIDecision[];
  availableContexts: AIContextItem[];
  availableNodes: ExecutionNode[];
}

export const ExecutionTaskInspector: React.FC<ExecutionTaskInspectorProps> = ({
  task,
  availableRuns,
  availableDecisions,
  availableContexts,
  availableNodes,
}) => {
  const resolvedRun = availableRuns.find((r) => r.id === task.runId);
  const resolvedDecision = availableDecisions.find((d) => d.id === task.decisionId);
  const resolvedNode = availableNodes.find((n) => n.id === task.nodeId);

  const resolvedContexts = resolvedDecision
    ? availableContexts.filter((c) => resolvedDecision.contextIds.includes(c.id))
    : [];

  const getStatusNotice = (status: string) => {
    if (status === 'received') {
      return 'AWAITING AUTHORIZATION: Task has been received by Forge but execution is blocked by the human approval boundary.';
    }
    if (status === 'queued') {
      return 'QUEUED FOR EXECUTION: Task has entered the Forge queue. No external executor is currently attached to this node.';
    }
    return `Status: ${status}`;
  };

  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)]/20 p-5 font-mono space-y-6 text-xs">
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          TASK INSPECTOR
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)]">
          {task.id}
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">TASK ID</div>
          <div className="text-[var(--foreground)] font-semibold">{task.id}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">SOURCE RUN</div>
          <div className="text-[var(--signal)] font-semibold">
            {resolvedRun ? resolvedRun.id : task.runId}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">SOURCE DECISION</div>
          <div className="text-[var(--foreground)] font-semibold">
            {resolvedDecision ? resolvedDecision.id : task.decisionId}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">EXECUTION NODE</div>
          <div className="text-[var(--foreground)] font-semibold">
            {task.nodeId} {resolvedNode ? `(${resolvedNode.name})` : ''}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">ACTION</div>
          <div className="text-[var(--foreground)] font-semibold">{task.actionName}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">STATUS</div>
          <div className="text-[var(--primary)] font-semibold uppercase">{task.status}</div>
          <p className="text-[10px] text-[var(--muted)] mt-1 border-l-2 border-[var(--primary)] pl-2">
            {getStatusNotice(task.status)}
          </p>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">CREATED AT</div>
          <div className="text-[var(--muted)]">{task.createdAt}</div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          ACTION PAYLOAD JSON
        </div>
        <pre className="p-3 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--foreground)] overflow-x-auto">
          {JSON.stringify(task.payload, null, 2)}
        </pre>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          UPSTREAM SYSTEM LINEAGE
        </div>
        <div className="space-y-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">RUN:</span>
            <span className="text-[var(--signal)] font-bold">
              {resolvedRun ? resolvedRun.id : 'UNRESOLVED'}
            </span>
          </div>
          <div className="pl-3 text-[var(--muted)]">↓</div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">DECISION:</span>
            <span className="text-[var(--foreground)] font-bold">
              {resolvedDecision ? resolvedDecision.id : 'UNRESOLVED'}
            </span>
          </div>
          <div className="pl-3 text-[var(--muted)]">↓</div>
          <div>
            <div className="text-[var(--muted)]">CONTEXT:</div>
            {resolvedContexts.length > 0 ? (
              <div className="pl-3 space-y-1 mt-1">
                {resolvedContexts.map((ctx) => (
              <div key={ctx.id} className="text-[var(--foreground)]">
              • {ctx.id} ({ctx.type})
            </div>
                ))}
              </div>
            ) : (
              <div className="pl-3 text-[var(--muted)] font-italic">
                No matching contexts resolved
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};