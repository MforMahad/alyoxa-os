import React from 'react';
import { PulseThread, PulseRequest } from '@/data/os/pulse';

interface PulseThreadInspectorProps {
  thread: PulseThread;
  availableRequests: PulseRequest[];
}

export const PulseThreadInspector: React.FC<PulseThreadInspectorProps> = ({
  thread,
  availableRequests,
}) => {
  const resolvedRequest = availableRequests.find((r) => r.id === thread.requestId);

  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)] p-5 font-mono space-y-6 text-xs overflow-y-auto">
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          THREAD INSPECTOR
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)]">
          {thread.id}
        </h3>
      </div>

      {/* IDENTITY */}
      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">TITLE</div>
          <div className="text-[var(--foreground)] font-semibold">{thread.title}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">STATUS</div>
          <div className="text-[var(--signal)] font-semibold uppercase">{thread.status}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">CREATED AT</div>
          <div className="text-[var(--muted)]">{thread.createdAt}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">UPDATED AT</div>
          <div className="text-[var(--muted)]">{thread.updatedAt}</div>
        </div>
      </div>

      {/* LINKED REQUEST */}
      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          LINKED REQUEST
        </div>
        
        {resolvedRequest ? (
          <div className="p-3 bg-[var(--background)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--foreground)]">{resolvedRequest.id}</span>
              <span className="text-[10px] uppercase text-[var(--primary)] font-semibold">
                {resolvedRequest.priority}
              </span>
            </div>
            <div className="text-[var(--foreground)] font-medium text-[11px]">
              {resolvedRequest.title}
            </div>
            <div className="text-[10px] text-[var(--muted)] uppercase">
              STATUS: <span className="text-[var(--foreground)]">{resolvedRequest.status}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 border border-[var(--border)] text-[var(--primary)] font-bold text-[10px]">
            UNRESOLVED REFERENCE ({thread.requestId})
          </div>
        )}
      </div>

      {/* PARTICIPANTS */}
      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          PARTICIPANTS ({thread.participants.length})
        </div>
        <div className="space-y-2">
          {thread.participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-2 bg-[var(--background)] border border-[var(--border)] text-[11px]"
            >
              <div>
                <span className="text-[var(--foreground)] font-bold">{p.name}</span>
                <span className="text-[10px] text-[var(--muted)] block">{p.id}</span>
              </div>
              <span className="text-[10px] text-[var(--muted)] uppercase border border-[var(--border)] px-1.5 py-0.5">
                {p.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MESSAGE LOG */}
      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          MESSAGE LOG ({thread.messages.length})
        </div>
        <div className="space-y-3">
          {thread.messages.map((msg) => {
            const author = thread.participants.find((p) => p.id === msg.authorId);

            return (
              <div
                key={msg.id}
                className="p-3 bg-[var(--background)] border border-[var(--border)] space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] border-b border-[var(--border)] pb-1.5">
                  <span className="text-[var(--foreground)] font-bold">
                    {author ? author.name : 'UNKNOWN PARTICIPANT REFERENCE'}
                  </span>
                  <span className="text-[var(--muted)]">{msg.createdAt}</span>
                </div>
                <p className="text-[11px] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                <div className="text-[9px] text-[var(--muted)] text-right">
                  ID: {msg.id}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};