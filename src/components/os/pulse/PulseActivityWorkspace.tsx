'use client';

import React, { useState } from 'react';
import { PulseActivity, PulseRequest } from '@/data/os/pulse';
import { PulseActivityRow } from './PulseActivityRow';
import { PulseActivityInspector } from './PulseActivityInspector';

interface PulseActivityWorkspaceProps {
  activities: PulseActivity[];
  requests: PulseRequest[];
}

export const PulseActivityWorkspace: React.FC<PulseActivityWorkspaceProps> = ({
  activities,
  requests,
}) => {
  // Sort activities chronologically by timestamp without mutating props/registry
  const sortedActivities = [...activities].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );

  const [selectedActivityId, setSelectedActivityId] = useState<string>(
    sortedActivities[0]?.id ?? ''
  );

  if (sortedActivities.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 font-mono text-xs text-[var(--muted)] flex-col space-y-1 text-center">
        <div>No activity yet.</div>
        <div className="text-[10px] opacity-75">Operational activity will appear here as Pulse records communication workflow events.</div>
      </div>
    );
  }

  const selectedActivity =
    sortedActivities.find((a) => a.id === selectedActivityId) ?? sortedActivities[0];

  return (
    <div className="flex flex-1 flex-col lg:flex-row min-h-0 bg-[var(--background)]">
      {/* ACTIVITY REGISTRY / TIMELINE */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
          <span>OPERATIONAL ACTIVITY TIMELINE</span>
          <span>COUNT: {sortedActivities.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {sortedActivities.map((activity) => (
            <PulseActivityRow
              key={activity.id}
              activity={activity}
              isSelected={activity.id === selectedActivity.id}
              onSelect={setSelectedActivityId}
            />
          ))}
        </div>
      </div>

      {/* ACTIVITY INSPECTOR */}
      <PulseActivityInspector
        activity={selectedActivity}
        availableRequests={requests}
      />
    </div>
  );
};