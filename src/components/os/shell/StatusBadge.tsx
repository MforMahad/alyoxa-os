const labels: Record<string, string> = { discovered: 'Found, not yet queued', queued: 'Waiting to start', processing: 'Being checked', running: 'Audit in progress', completed: 'Finished', partial: 'Finished with limited coverage', failed: 'Check could not finish', skipped: 'Not checked', cancelled: 'Cancelled' }
export function StatusBadge({ status }: { status: string }) {
  return <span className={`os-status os-status-${Object.hasOwn(labels, status) ? status : 'unknown'}`}>{labels[status] ?? 'Status unavailable'}</span>
}
