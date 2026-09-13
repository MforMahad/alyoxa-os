'use client';

import React, { useState } from 'react';
import { ExecutionRecord } from '@/data/os/forge';
import { ExecutionRecordRow } from './ExecutionRecordRow';
import { ExecutionRecordInspector } from './ExecutionRecordInspector';

interface ForgeRecordsWorkspaceProps {
  records: ExecutionRecord[];
}

export const ForgeRecordsWorkspace: React.FC<ForgeRecordsWorkspaceProps> = ({
  records,
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    records[0]?.id || ''
  );

  const selectedRecord =
    records.find((r) => r.id === selectedRecordId) || records[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] border border-[var(--border)] bg-[var(--background)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider select-none">
          <div className="w-24 shrink-0">RECORD_ID</div>
          <div className="w-24 shrink-0">TASK</div>
          <div className="w-24 shrink-0 text-center">RUN</div>
          <div className="w-36 shrink-0">NODE</div>
          <div className="w-24 shrink-0 text-center">STATUS</div>
          <div className="flex-1 min-w-0">RECEIVED</div>
        </div>

        <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
          {records.length > 0 ? (
            records.map((record) => (
              <ExecutionRecordRow
                key={record.id}
                record={record}
                isSelected={record.id === selectedRecord?.id}
                onSelect={() => setSelectedRecordId(record.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center font-mono text-xs text-[var(--muted)]">
              NO EXECUTION RECORDS FOUND
            </div>
          )}
        </div>
      </div>

      {selectedRecord && <ExecutionRecordInspector record={selectedRecord} />}
    </div>
  );
};