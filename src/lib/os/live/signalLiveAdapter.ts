import type {
  FeedSource,
  FeedSourceStatus,
  FeedSourceType,
  Observation,
  PersistedSignalFeedSource,
  PersistedSignalObservation,
} from '@/data/os/signal'

function mapFeedSourceType(sourceType: string): FeedSourceType {
  if (
    sourceType === 'webhook' ||
    sourceType === 'telemetry' ||
    sourceType === 'api_poll' ||
    sourceType === 'system_log' ||
    sourceType === 'website'
  ) {
    return sourceType
  }

  return 'website'
}

function mapFeedSourceStatus(status: string): FeedSourceStatus {
  if (status === 'active' || status === 'degraded' || status === 'offline') {
    return status
  }

  return 'offline'
}

export function mapPersistedFeedSourceToLiveFeedSource(
  source: PersistedSignalFeedSource,
  index: number,
  lastObservedAt?: string | null
): FeedSource {
  const codePrefix = source.source_type === 'website' ? 'WEB' : 'IN'
  const code = `${codePrefix}.${String(index + 1).padStart(2, '0')}`

  return {
    id: source.id,
    code,
    name: source.name,
    type: mapFeedSourceType(source.source_type),
    status: mapFeedSourceStatus(source.status),
    endpointUrl: source.source_key ?? undefined,
    eventRate: {
      displayRate: '—',
      eventsPerMinute: 0,
    },
    lastActive: lastObservedAt || source.updated_at || '—',
  }
}

export function mapPersistedObservationToLiveObservation(
  observation: PersistedSignalObservation
): Observation {
  return {
    id: observation.public_id,
    timestamp: observation.observed_at,
    sourceId: observation.source_id,
    eventType: observation.category,
    summary: observation.description,
    payload: {
      title: observation.title,
      category: observation.category,
      severity: observation.severity,
      metadata: observation.metadata,
      website_scan_id: observation.website_scan_id,
      source_event_id: observation.source_event_id,
    },
    correlationKeys: {},
    attentionState: 'pass_through',
  }
}
