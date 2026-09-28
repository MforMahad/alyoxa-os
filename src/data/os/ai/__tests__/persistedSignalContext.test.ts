import { buildPersistedSignalObservationContexts } from '../aiCore'
import type { PersistedSignalObservation } from '@/data/os/signal'

describe('persisted Signal AI context projection', () => {
  it('projects persisted fields without fixture-only attention or correlation data', () => {
    const observation: PersistedSignalObservation = {
      id: 'database-id-1',
      public_id: 'obs_real_001',
      source_id: 'source-001',
      website_scan_id: 'scan-001',
      source_event_id: 'website_scan:scan-public-001',
      severity: 'high',
      category: 'website_content',
      title: 'Liberty Hall Publishers',
      description: 'Publishing services and book catalog.',
      metadata: { headings: ['Books', 'About'] },
      observed_at: '2026-09-28T12:00:00Z',
      created_at: '2026-09-28T12:00:01Z',
    }

    const [context] = buildPersistedSignalObservationContexts([observation])

    expect(context).toEqual({
      id: 'CTX-PERSISTED-SIGNAL-OBS-obs_real_001',
      type: 'PERSISTED_SIGNAL_OBSERVATION',
      sourceModule: 'SIGNAL',
      summary: 'Publishing services and book catalog.',
      timestamp: '2026-09-28T12:00:00Z',
      relevance: 'high',
      refId: 'obs_real_001',
      payload: {
        category: 'website_content',
        title: 'Liberty Hall Publishers',
        description: 'Publishing services and book catalog.',
        severity: 'high',
        metadata: { headings: ['Books', 'About'] },
        source_id: 'source-001',
        website_scan_id: 'scan-001',
      },
    })
    expect(context).not.toHaveProperty('attentionState')
    expect(context.payload).not.toHaveProperty('correlationKeys')
    expect(context.payload).not.toHaveProperty('eventType')
  })
})