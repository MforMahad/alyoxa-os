import type { PersistedSignalFeedSource, PersistedSignalObservation } from '@/data/os/signal'

export interface WebsiteResultRun {
  id: string
  kind: 'scan' | 'audit' | 'observation'
  timestamp: string
  observations: PersistedSignalObservation[]
  summary?: PersistedSignalObservation
}
export interface WebsiteResultGroup {
  id: string
  label: string
  runs: WebsiteResultRun[]
}
export function observationMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function timestamp(value: string) { return Date.parse(value) || 0 }

/** Presentation grouping only. Inputs come from the existing workspace-scoped actions. */
export function groupWebsiteResults(observations: PersistedSignalObservation[], sources: PersistedSignalFeedSource[]): WebsiteResultGroup[] {
  const sourceById = new Map(sources.map(s => [s.id, s]))
  const groups = new Map<string, WebsiteResultGroup>()
  for (const source of sources.filter(s => s.source_type === 'website')) {
    groups.set(source.id, { id: source.id, label: source.source_key?.startsWith('website:') ? source.source_key.slice(8) : source.name, runs: [] })
  }
  for (const observation of observations) {
    const source = sourceById.get(observation.source_id)
    const metadata = observationMetadata(observation.metadata)
    const websiteCategory = ['website_content', 'website_audit_page', 'website_audit_summary'].includes(observation.category)
    if (source ? source.source_type !== 'website' : !websiteCategory && !metadata.fetched_url && !metadata.target_origin) continue
    // Source ID is authoritative: redirected fetch hosts must not change site identity.
    let group = groups.get(observation.source_id)
    if (!group) {
      group = { id: observation.source_id, label: `Website source ${observation.source_id}`, runs: [] }
      groups.set(group.id, group)
    }
    const auditId = typeof metadata.audit_id === 'string' && metadata.audit_id
      ? metadata.audit_id : observation.source_event_id?.match(/^audit:([^:]+):/)?.[1]
    const kind = auditId ? 'audit' : observation.website_scan_id ? 'scan' : 'observation'
    const id = auditId ? `audit:${auditId}` : observation.website_scan_id ? `scan:${observation.website_scan_id}` : `observation:${observation.id}`
    let run = group.runs.find(r => r.id === id)
    if (!run) {
      run = { id, kind, timestamp: observation.observed_at, observations: [] }
      group.runs.push(run)
    }
    run.observations.push(observation)
    if (timestamp(observation.observed_at) > timestamp(run.timestamp)) run.timestamp = observation.observed_at
    if (metadata.record_kind === 'audit_summary' || observation.category === 'website_audit_summary') run.summary = observation
  }
  for (const group of groups.values()) {
    group.runs.sort((a, b) => timestamp(b.timestamp) - timestamp(a.timestamp) || a.id.localeCompare(b.id))
    for (const run of group.runs) run.observations.sort((a, b) => timestamp(b.observed_at) - timestamp(a.observed_at) || a.id.localeCompare(b.id))
  }
  return [...groups.values()].sort((a, b) => timestamp(b.runs[0]?.timestamp ?? '') - timestamp(a.runs[0]?.timestamp ?? '') || a.label.localeCompare(b.label))
}
