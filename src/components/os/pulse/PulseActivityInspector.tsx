import React from 'react';
import { PulseActivity, PulseRequest } from '@/data/os/pulse';

interface PulseActivityInspectorProps {
  activity: PulseActivity;
  availableRequests: PulseRequest[];
}

export const PulseActivityInspector: React.FC<PulseActivityInspectorProps> = ({
  activity,
  availableRequests,
}) => {
  const resolvedRequest = availableRequests.find((r) => r.id === activity.requestId);

  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)] p-5 font-mono space-y-6 text-xs overflow-y-auto">
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          ACTIVITY INSPECTOR
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)]">
          {activity.id}
        </h3>
      </div>

      {/* IDENTITY */}
      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">TYPE</div>
          <div className="text-[var(--foreground)] font-semibold uppercase">{activity.type}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">TIMESTAMP</div>
          <div className="text-[var(--muted)]">{activity.timestamp}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">ACTOR ID</div>
          <div className="text-[var(--signal)] font-bold">{activity.actorId}</div>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          DESCRIPTION
        </div>
        <p className="p-3 bg-[var(--background)] border border-[var(--border)] text-[11px] text-[var(--foreground)] leading-relaxed">
          {activity.description}
        </p>
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
            <div className="text-[10px] text-[var(--muted)] uppercase flex justify-between pt-1">
              <span>TYPE: <span className="text-[var(--foreground)]">{resolvedRequest.type}</span></span>
              <span>STATUS: <span className="text-[var(--foreground)]">{resolvedRequest.status}</span></span>
            </div>
          </div>
        ) : (
          <div className="p-3 border border-[var(--border)] text-[var(--primary)] font-bold text-[10px]">
            REQUEST REFERENCE UNRESOLVED ({activity.requestId})
          </div>
        )}
      </div>

      {/* DETAILS / JSON */}
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          EVENT DETAILS
        </div>
        <pre className="p-3 bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--foreground)] overflow-x-auto">
          {JSON.stringify(activity.details, null, 2)}
        </pre>
      </div>
    </div>
  );
};