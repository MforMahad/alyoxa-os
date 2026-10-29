import type { PersistedSignalObservation } from '@/data/os/signal'
import type { PersistedSignalObservationContext } from '@/data/os/ai/aiCore'

/** Pure persisted-data boundary; imports no fixture registries at runtime. */
export function buildWebsiteContexts(observations: PersistedSignalObservation[]): PersistedSignalObservationContext[] {
  return observations.map(observation => ({
    id: `CTX-PERSISTED-SIGNAL-OBS-${observation.public_id}`,
    type: 'PERSISTED_SIGNAL_OBSERVATION', sourceModule: 'SIGNAL',
    summary: observation.description, timestamp: observation.observed_at,
    relevance: ['critical', 'high'].includes(observation.severity) ? 'high' : observation.severity === 'low' ? 'low' : 'medium',
    refId: observation.public_id,
    payload: { category: observation.category, title: observation.title, description: observation.description,
      severity: observation.severity, metadata: observation.metadata, source_id: observation.source_id, website_scan_id: observation.website_scan_id },
  }))
}
