/** Absolute host suppression, independent of page retries and lease release. */
export function retryAfterDeadline(value: string | undefined, now = Date.now()): { not_before?: string; host_blocked?: boolean } {
  if (!value?.trim()) return {}
  const raw = value.trim()
  const deadline = /^\d+$/.test(raw) ? now + Number(raw) * 1000 : Date.parse(raw)
  if ((/^\d+$/.test(raw) && !Number.isFinite(deadline)) || deadline > Date.UTC(9999, 11, 31)) return { host_blocked: true }
  if (!Number.isFinite(deadline) || deadline <= now) return {}
  return { not_before: new Date(deadline).toISOString() }
}
