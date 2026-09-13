import React from 'react';
import { PulseRequest } from '@/data/os/pulse';

import { ExecutionTask } from '@/data/os/forge';
import { AIDecision } from '../ai/aiDecisions';

interface PulseRequestInspectorProps {
  request: PulseRequest;
  availableDecisions: AIDecision[];
  availableTasks: ExecutionTask[];
}

export const PulseRequestInspector: React.FC<PulseRequestInspectorProps> = ({
  request,
  availableDecisions,
  availableTasks,
}) => {
  const resolvedDecision = availableDecisions.find((d) => d.id === request.decisionId);
  const resolvedTask = availableTasks.find((t) => t.id === request.taskId);

  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)] p-5 font-mono space-y-6 text-xs">
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          REQUEST INSPECTOR
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)]">
          {request.id}
        </h3>
      </div>

      {/* IDENTITY */}
      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">TYPE</div>
          <div className="text-[var(--foreground)] font-semibold uppercase">{request.type}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">STATUS</div>
          <div className="text-[var(--primary)] font-semibold uppercase">{request.status}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">PRIORITY</div>
          <div className="text-[var(--foreground)] font-semibold uppercase">{request.priority}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">REQUESTED BY</div>
          <div className="text-[var(--foreground)] font-semibold">{request.requestedBy}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">CREATED AT</div>
          <div className="text-[var(--muted)]">{request.createdAt}</div>
        </div>
      </div>

      {/* DETAILS */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          REQUEST CONTENT
        </div>
        <div className="text-[var(--foreground)] font-bold">{request.title}</div>
        <p className="text-[var(--muted)] text-[11px] leading-relaxed">
          {request.description}
        </p>
      </div>

      {/* LINEAGE */}
      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          UPSTREAM LINEAGE
        </div>
        
        <div className="space-y-3 text-[11px]">
          {/* PULSE REQUEST */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">PULSE REQ:</span>
            <span className="text-[var(--foreground)] font-bold">{request.id}</span>
          </div>

          <div className="pl-3 text-[var(--muted)]">↓</div>

          {/* AI DECISION */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">AI DECISION:</span>
              <span className="text-[var(--signal)] font-bold">
                {resolvedDecision ? resolvedDecision.id : 'UNRESOLVED REFERENCE'}
              </span>
            </div>
            {resolvedDecision ? (
              <div className="pl-3 mt-1 space-y-1 text-[10px] text-[var(--muted)] border-l border-[var(--border)] ml-1">
                <div>Confidence: <span className="text-[var(--foreground)]">{(resolvedDecision.confidenceScore * 100).toFixed(0)}%</span></div>
                <div>Attention: <span className="text-[var(--foreground)]">{resolvedDecision.attentionState}</span></div>
                <div>Status: <span className="text-[var(--foreground)]">{resolvedDecision.status}</span></div>
                <div className="truncate">Summary: {resolvedDecision.summary}</div>
              </div>
            ) : (
              <div className="pl-3 text-[var(--primary)] italic text-[10px]">
                Target AI Decision ({request.decisionId}) missing
              </div>
            )}
          </div>

          <div className="pl-3 text-[var(--muted)]">↓</div>

          {/* FORGE TASK */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">FORGE TASK:</span>
              <span className="text-[var(--foreground)] font-bold">
                {resolvedTask ? resolvedTask.id : 'UNRESOLVED REFERENCE'}
              </span>
            </div>
            {resolvedTask ? (
              <div className="pl-3 mt-1 space-y-1 text-[10px] text-[var(--muted)] border-l border-[var(--border)] ml-1">
                <div>Action: <span className="text-[var(--foreground)]">{resolvedTask.actionName}</span></div>
                <div>Node: <span className="text-[var(--foreground)]">{resolvedTask.nodeId}</span></div>
                <div>Status: <span className="text-[var(--foreground)]">{resolvedTask.status}</span></div>
                <div>Created: <span className="text-[var(--foreground)]">{resolvedTask.createdAt}</span></div>
              </div>
            ) : (
              <div className="pl-3 text-[var(--primary)] italic text-[10px]">
                Target Forge Task ({request.taskId}) missing
              </div>
            )}
          </div>
        </div>
      </div>

      {/* METADATA */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          METADATA
        </div>
        <pre className="p-3 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--foreground)] overflow-x-auto">
          {JSON.stringify(request.metadata, null, 2)}
        </pre>
      </div>
    </div>
  );
};