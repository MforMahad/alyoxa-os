import React from 'react';
import { PulseApproval, PulseRequest } from '@/data/os/pulse';

import { ExecutionTask } from '@/data/os/forge';
import { AIDecision } from '../ai/aiDecisions';

interface PulseApprovalInspectorProps {
  approval: PulseApproval;
  availableRequests: PulseRequest[];
  availableDecisions: AIDecision[];
  availableTasks: ExecutionTask[];
}

export const PulseApprovalInspector: React.FC<PulseApprovalInspectorProps> = ({
  approval,
  availableRequests,
  availableDecisions,
  availableTasks,
}) => {
  const resolvedRequest = availableRequests.find((r) => r.id === approval.requestId);
  const resolvedDecision = resolvedRequest
    ? availableDecisions.find((d) => d.id === resolvedRequest.decisionId)
    : undefined;
  const resolvedTask = resolvedRequest
    ? availableTasks.find((t) => t.id === resolvedRequest.taskId)
    : undefined;

  const getBoundaryNotice = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          text: 'APPROVAL BOUNDARY // AWAITING HUMAN AUTHORIZATION',
          color: 'text-[var(--primary)] border-[var(--primary)]',
        };
      case 'approved':
        return {
          text: 'APPROVAL BOUNDARY // AUTHORIZATION RECORDED',
          color: 'text-[var(--signal)] border-[var(--signal)]',
        };
      case 'rejected':
      default:
        return {
          text: 'APPROVAL BOUNDARY // AUTHORIZATION REJECTED',
          color: 'text-[var(--muted)] border-[var(--border)]',
        };
    }
  };

  const boundary = getBoundaryNotice(approval.status);

  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)] p-5 font-mono space-y-6 text-xs overflow-y-auto">
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          APPROVAL INSPECTOR
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)]">
          {approval.id}
        </h3>
      </div>

      {/* AUTHORIZATION BOUNDARY NOTICE */}
      <div className={`p-3 border text-[10px] font-bold uppercase ${boundary.color}`}>
        {boundary.text}
      </div>

      {/* IDENTITY */}
      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">STATUS</div>
          <div className="text-[var(--foreground)] font-semibold uppercase">{approval.status}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">APPROVER ID</div>
          <div className="text-[var(--foreground)] font-semibold">{approval.approverId}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">CREATED AT</div>
          <div className="text-[var(--muted)]">{approval.createdAt}</div>
        </div>

        {approval.resolvedAt && (
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">RESOLVED AT</div>
            <div className="text-[var(--muted)]">{approval.resolvedAt}</div>
          </div>
        )}
      </div>

      {/* COMMENTS */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          APPROVAL COMMENTS
        </div>
        <p className="p-3 bg-[var(--background)] border border-[var(--border)] text-[11px] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
          {approval.comments || 'No comments recorded.'}
        </p>
      </div>

      {/* FULL LINEAGE */}
      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          AUTHORIZATION LINEAGE
        </div>

        <div className="space-y-3 text-[11px]">
          {/* PULSE APPROVAL */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">APPROVAL:</span>
            <span className="text-[var(--foreground)] font-bold">{approval.id}</span>
          </div>

          <div className="pl-3 text-[var(--muted)]">↓</div>

          {/* PULSE REQUEST */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">REQUEST:</span>
              <span className="text-[var(--foreground)] font-bold">
                {resolvedRequest ? resolvedRequest.id : 'UNRESOLVED REQUEST REFERENCE'}
              </span>
            </div>
            {resolvedRequest ? (
              <div className="pl-3 mt-1 space-y-1 text-[10px] text-[var(--muted)] border-l border-[var(--border)] ml-1">
                <div>Title: <span className="text-[var(--foreground)]">{resolvedRequest.title}</span></div>
                <div>Type: <span className="text-[var(--foreground)]">{resolvedRequest.type}</span></div>
                <div>Priority: <span className="text-[var(--foreground)]">{resolvedRequest.priority}</span></div>
                <div>Status: <span className="text-[var(--foreground)]">{resolvedRequest.status}</span></div>
              </div>
            ) : (
              <div className="pl-3 text-[var(--primary)] italic text-[10px]">
                Target Request ({approval.requestId}) missing
              </div>
            )}
          </div>

          <div className="pl-3 text-[var(--muted)]">↓</div>

          {/* AI DECISION */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">AI DECISION:</span>
              <span className="text-[var(--signal)] font-bold">
                {resolvedDecision ? resolvedDecision.id : 'UNRESOLVED AI DECISION REFERENCE'}
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
                {resolvedRequest ? `Target Decision (${resolvedRequest.decisionId}) missing` : 'Decision context unavailable'}
              </div>
            )}
          </div>

          <div className="pl-3 text-[var(--muted)]">↓</div>

          {/* FORGE TASK */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">FORGE TASK:</span>
              <span className="text-[var(--foreground)] font-bold">
                {resolvedTask ? resolvedTask.id : 'UNRESOLVED FORGE TASK REFERENCE'}
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
                {resolvedRequest ? `Target Task (${resolvedRequest.taskId}) missing` : 'Task context unavailable'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};