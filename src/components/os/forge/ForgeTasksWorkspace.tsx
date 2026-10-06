'use client';

import React, { useState } from 'react';
import { ExecutionTask, ExecutionNode } from '@/data/os/forge';
import { AIRun } from '@/data/os/ai/aiRuns';
import { AIContextItem } from '@/data/os/ai/aiCore';
import { ExecutionTaskRow } from './ExecutionTaskRow';
import { ExecutionTaskInspector } from './ExecutionTaskInspector';
import { AIDecision } from '../../../data/os/ai/aiDecisions';

interface ForgeTasksWorkspaceProps {
  tasks: ExecutionTask[];
  runs: AIRun[];
  decisions: AIDecision[];
  contexts: AIContextItem[];
  nodes: ExecutionNode[];
}

export const ForgeTasksWorkspace: React.FC<ForgeTasksWorkspaceProps> = ({
  tasks,
  runs,
  decisions,
  contexts,
  nodes,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    tasks[0]?.id || ''
  );

  const selectedTask =
    tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] border border-[var(--border)] bg-[var(--background)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider select-none">
          <div className="w-24 shrink-0">TASK_ID</div>
          <div className="w-24 shrink-0 text-center">RUN</div>
          <div className="w-48 shrink-0">NODE</div>
          <div className="w-32 shrink-0 text-center">STATUS</div>
          <div className="flex-1 min-w-0">ACTION</div>
        </div>

        <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <ExecutionTaskRow
                key={task.id}
                task={task}
                isSelected={task.id === selectedTask?.id}
                onSelect={() => setSelectedTaskId(task.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center font-mono text-xs text-[var(--muted)] space-y-1">
              <div>No execution tasks yet.</div>
              <div className="text-[10px] opacity-75">Tasks will appear here when AI decisions enter the Forge execution flow.</div>
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <ExecutionTaskInspector
          task={selectedTask}
          availableRuns={runs}
          availableDecisions={decisions}
          availableContexts={contexts}
          availableNodes={nodes}
        />
      )}
    </div>
  );
};