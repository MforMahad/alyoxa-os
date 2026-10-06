'use client';

import React, { useState } from 'react';
import { PulseThread, PulseRequest } from '@/data/os/pulse';
import { PulseThreadRow } from './PulseThreadRow';
import { PulseThreadInspector } from './PulseThreadInspector';

interface PulseThreadsWorkspaceProps {
  threads: PulseThread[];
  requests: PulseRequest[];
}

export const PulseThreadsWorkspace: React.FC<PulseThreadsWorkspaceProps> = ({
  threads,
  requests,
}) => {
  const [selectedThreadId, setSelectedThreadId] = useState<string>(
    threads[0]?.id ?? ''
  );

  if (threads.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 font-mono text-xs text-[var(--muted)] flex-col space-y-1 text-center">
        <div>No threads yet.</div>
        <div className="text-[10px] opacity-75">Conversation threads will appear here when they enter the Pulse workflow.</div>
      </div>
    );
  }

  const selectedThread =
    threads.find((t) => t.id === selectedThreadId) ?? threads[0];

  return (
    <div className="flex flex-1 flex-col lg:flex-row min-h-0 bg-[var(--background)]">
      {/* THREAD REGISTRY */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
          <span>THREAD REGISTRY</span>
          <span>COUNT: {threads.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {threads.map((thread) => (
            <PulseThreadRow
              key={thread.id}
              thread={thread}
              isSelected={thread.id === selectedThread.id}
              onSelect={setSelectedThreadId}
            />
          ))}
        </div>
      </div>

      {/* THREAD INSPECTOR */}
      <PulseThreadInspector
        thread={selectedThread}
        availableRequests={requests}
      />
    </div>
  );
};