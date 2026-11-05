const labels: Record<string, string> = { queued: 'Waiting to start', processing: 'Checking website', completed: 'Finished', failed: 'Needs attention' }
export function StatusBadge({ status }: { status: string }) {
  return <span className={`os-status os-status-${Object.hasOwn(labels, status) ? status : 'unknown'}`}>{labels[status] ?? 'Status unavailable'}</span>
}
