'use client';

import React, { useState } from 'react';
import { PulseRequest } from '@/data/os/pulse';

import { ExecutionTask } from '@/data/os/forge';
import { PulseRequestRow } from './PulseRequestRow';
import { PulseRequestInspector } from './PulseRequestInspector';
import { AIDecision } from '@/data/os/ai/aiDecisions';

interface PulseRequestsWorkspaceProps {
  requests: PulseRequest[];
  decisions: AIDecision[];
  tasks: ExecutionTask[];
}

export const PulseRequestsWorkspace: React.FC<PulseRequestsWorkspaceProps> = ({
  requests,
  decisions,
  tasks,
}) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    requests[0]?.id ?? ''
  );

  if (requests.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 font-mono text-xs text-[var(--muted)] flex-col space-y-1 text-center">
        <div>No requests yet.</div>
        <div className="text-[10px] opacity-75">Communication requests will appear here when they enter the Pulse workflow.</div>
      </div>
    );
  }

  const selectedRequest =
    requests.find((r) => r.id === selectedRequestId) ?? requests[0];

  return (
    <div className="flex flex-1 flex-col lg:flex-row min-h-0 bg-[var(--background)]">
      {/* REQUEST REGISTRY */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
          <span>REQUEST REGISTRY</span>
          <span>COUNT: {requests.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {requests.map((request) => (
            <PulseRequestRow
              key={request.id}
              request={request}
              isSelected={request.id === selectedRequest.id}
              onSelect={setSelectedRequestId}
            />
          ))}
        </div>
      </div>

      {/* REQUEST INSPECTOR */}
      <PulseRequestInspector
        request={selectedRequest}
        availableDecisions={decisions}
        availableTasks={tasks}
      />
    </div>
  );
};