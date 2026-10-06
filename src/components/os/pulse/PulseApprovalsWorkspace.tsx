'use client';

import React, { useState } from 'react';
import { PulseApproval, PulseRequest } from '@/data/os/pulse';

import { ExecutionTask } from '@/data/os/forge';
import { PulseApprovalRow } from './PulseApprovalRow';
import { PulseApprovalInspector } from './PulseApprovalInspector';
import { AIDecision } from '@/data/os/ai/aiDecisions';

interface PulseApprovalsWorkspaceProps {
  approvals: PulseApproval[];
  requests: PulseRequest[];
  decisions: AIDecision[];
  tasks: ExecutionTask[];
}

export const PulseApprovalsWorkspace: React.FC<PulseApprovalsWorkspaceProps> = ({
  approvals,
  requests,
  decisions,
  tasks,
}) => {
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>(
    approvals[0]?.id ?? ''
  );

  if (approvals.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 font-mono text-xs text-[var(--muted)] flex-col space-y-1 text-center">
        <div>No approvals yet.</div>
        <div className="text-[10px] opacity-75">Approval records will appear here when they enter the Pulse workflow.</div>
      </div>
    );
  }

  const selectedApproval =
    approvals.find((a) => a.id === selectedApprovalId) ?? approvals[0];

  return (
    <div className="flex flex-1 flex-col lg:flex-row min-h-0 bg-[var(--background)]">
      {/* APPROVAL REGISTRY */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
          <span>APPROVAL REGISTRY</span>
          <span>COUNT: {approvals.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {approvals.map((approval) => (
            <PulseApprovalRow
              key={approval.id}
              approval={approval}
              isSelected={approval.id === selectedApproval.id}
              onSelect={setSelectedApprovalId}
            />
          ))}
        </div>
      </div>

      {/* APPROVAL INSPECTOR */}
      <PulseApprovalInspector
        approval={selectedApproval}
        availableRequests={requests}
        availableDecisions={decisions}
        availableTasks={tasks}
      />
    </div>
  );
};