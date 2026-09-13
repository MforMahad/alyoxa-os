import React from 'react';
import { ExecutionRecord } from '@/data/os/forge';

interface ExecutionRecordInspectorProps {
  record: ExecutionRecord;
}

export const ExecutionRecordInspector: React.FC<ExecutionRecordInspectorProps> = ({
  record,
}) => {
  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)]/20 p-5 font-mono space-y-6 text-xs">
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          RECORD INSPECTOR
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)]">
          {record.id}
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">RECORD</div>
          <div className="text-[var(--foreground)] font-semibold">{record.id}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">EXECUTION LIFECYCLE SUMMARY</div>
          <div className="text-[var(--foreground)] mt-1 text-[11px] leading-relaxed">
            {record.summary}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">TASK ID</div>
          <div className="text-[var(--foreground)] font-semibold">{record.taskId}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">SOURCE RUN</div>
          <div className="text-[var(--signal)] font-semibold">{record.runId}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">TARGET NODE</div>
          <div className="text-[var(--foreground)] font-semibold">{record.nodeId}</div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          LIFECYCLE TIMESTAMPS
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Received At:</span>
            <span className="text-[var(--foreground)]">{record.receivedAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Started At:</span>
            <span className="text-[var(--muted)]">{record.startedAt || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Completed At:</span>
            <span className="text-[var(--muted)]">{record.completedAt || '—'}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          EXECUTION RESULT PAYLOAD
        </div>
        {record.result ? (
          <pre className="p-3 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--foreground)] overflow-x-auto">
            {JSON.stringify(record.result, null, 2)}
          </pre>
        ) : (
          <div className="p-3 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--muted)] text-center">
            NO EXECUTION RESULT RECORDED
          </div>
        )}
      </div>
    </div>
  );
};