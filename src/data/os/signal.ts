// ============================================================================
// ALYOXA OS // SIGNAL DATA MODEL
// System Boundary: OBSERVE (Ingest, Structure, & Correlate)
// Note: AI Core (Understand) evaluates Signal data to produce Insights.
// ============================================================================

export type FeedSourceType = 'webhook' | 'telemetry' | 'api_poll' | 'system_log';
export type FeedSourceStatus = 'active' | 'degraded' | 'offline';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type AttentionState = 'pass_through' | 'autonomous_action' | 'human_review_required';
export type InsightStatus = 'pending' | 'dispatched_to_forge' | 'dismissed';

/**
 * 1. FeedSource
 * The origin channel streaming telemetry or event payloads into Signal.
 */
export interface FeedSource {
  id: string;
  code: string;            // e.g., "IN.01"
  name: string;            // e.g., "Stripe Webhooks"
  type: FeedSourceType;
  status: FeedSourceStatus;
  endpointUrl?: string;
  eventRate: {
    displayRate: string;      // e.g., "18/m"
    eventsPerMinute: number;  // Numeric baseline for metrics & aggregation
  };
  lastActive: string;      // ISO 8601 timestamp
}

/**
 * 2. Observation
 * An atomic, immutable record of a state change or inbound event.
 */
export interface Observation {
  id: string;              // e.g., "obs_89412a"
  timestamp: string;       // ISO 8601 timestamp
  sourceId: string;        // Foreign Key -> FeedSource.id
  eventType: string;       // e.g., "payment_intent.payment_failed"
  summary: string;         // Log summary
  payload: Record<string, unknown>; // Unstructured / raw JSON body
  correlationKeys: {
    entityId?: string;     // e.g., "cus_9821"
    ipAddress?: string;
    sessionId?: string;
  };
  attentionState: AttentionState;
}

/**
 * 3. Pattern / Anomaly
 * A cluster of related observations identified within a correlation window.
 */
export interface Pattern {
  id: string;              // e.g., "pat_0012"
  title: string;           // e.g., "Repeated Payment Failures on Customer Account"
  severity: SeverityLevel;
  sourceIds: string[];     // Foreign Keys -> FeedSource.id
  /**
   * Sampled / representative observation IDs matching this pattern.
   * Total observed count is tracked by the `count` property.
   */
  observationIds: string[];// Foreign Keys -> Observation.id (Sampled)
  firstObserved: string;   // ISO 8601 timestamp
  lastObserved: string;    // ISO 8601 timestamp
  count: number;           // Total occurrence count
  status: 'active' | 'mitigated' | 'monitoring';
}

/**
 * 4. Insight (AI Core Boundary)
 * Created by AI Core (Understand) after reasoning over Signal's observations.
 * Holds the action payload ready for handoff to Forge (Execute).
 */
export interface Insight {
  id: string;              // e.g., "ins_7721"
  observationId?: string;  // Direct trigger Observation ID
  patternId?: string;      // Direct trigger Pattern ID
  confidenceScore: number; // e.g., 0.98 (98% confidence)
  summary: string;         // AI reasoning output
  recommendedAction: {
    forgeTargetNode: string; // e.g., "EX.02 // FORGE_BILLING_RECOVERY"
    actionName: string;      // e.g., "dispatch_recovery_sequence"
    payload: Record<string, unknown>;
  };
  attentionState: AttentionState;
  status: InsightStatus;
}

// ============================================================================
// MOCK DATA STORE
// ============================================================================

export const signalFeedSources: FeedSource[] = [
  {
    id: 'src_stripe',
    code: 'IN.01',
    name: 'Stripe Webhooks',
    type: 'webhook',
    status: 'active',
    endpointUrl: 'https://api.alyoxa.io/v1/telemetry/stripe',
    eventRate: {
      displayRate: '18/m',
      eventsPerMinute: 18,
    },
    lastActive: '2026-09-08T13:42:01Z',
  },
  {
    id: 'src_telemetry',
    code: 'IN.02',
    name: 'Web Client Telemetry',
    type: 'telemetry',
    status: 'active',
    endpointUrl: 'https://telemetry.alyoxa.io/v1/stream',
    eventRate: {
      displayRate: '120/m',
      eventsPerMinute: 120,
    },
    lastActive: '2026-09-08T13:42:04Z',
  },
  {
    id: 'src_auth',
    code: 'IN.03',
    name: 'Auth Core Gateway',
    type: 'api_poll',
    status: 'active',
    endpointUrl: 'https://auth.alyoxa.io/v1/logs',
    eventRate: {
      displayRate: '4/m',
      eventsPerMinute: 4,
    },
    lastActive: '2026-09-08T13:41:12Z',
  },
  {
    id: 'src_sys',
    code: 'IN.04',
    name: 'Node Infrastructure Monitor',
    type: 'system_log',
    status: 'degraded',
    eventRate: {
      displayRate: '2/m',
      eventsPerMinute: 2,
    },
    lastActive: '2026-09-08T13:41:58Z',
  },
];

export const signalObservations: Observation[] = [
  {
    id: 'obs_89412a',
    timestamp: '2026-09-08T13:42:01Z',
    sourceId: 'src_stripe',
    eventType: 'payment_intent.payment_failed',
    summary: 'Payment failed for customer cus_9821 ($49.00 USD)',
    payload: {
      customer_id: 'cus_9821',
      amount: 4900,
      currency: 'usd',
      error_code: 'insufficient_funds',
      decline_code: 'generic_decline',
      attempt: 3,
    },
    correlationKeys: {
      entityId: 'cus_9821',
      ipAddress: '198.51.100.42',
    },
    attentionState: 'human_review_required',
  },
  {
    id: 'obs_89412b',
    timestamp: '2026-09-08T13:41:58Z',
    sourceId: 'src_sys',
    eventType: 'latency_threshold_exceeded',
    summary: 'Node US-East endpoint latency spike (820ms > 200ms)',
    payload: {
      node_id: 'us-east-01',
      p99_latency_ms: 820,
      threshold_ms: 200,
      affected_routes: ['/api/v1/query'],
    },
    correlationKeys: {
      sessionId: 'sys_session_402',
    },
    attentionState: 'autonomous_action',
  },
  {
    id: 'obs_89412c',
    timestamp: '2026-09-08T13:41:12Z',
    sourceId: 'src_auth',
    eventType: 'auth.token_refreshed',
    summary: 'Session token refreshed for user_maddy',
    payload: {
      user_id: 'usr_maddy_01',
      grant_type: 'refresh_token',
      client_id: 'alyoxa_desktop_os',
    },
    correlationKeys: {
      entityId: 'usr_maddy_01',
      ipAddress: '203.0.113.19',
    },
    attentionState: 'pass_through',
  },
  {
    id: 'obs_89412d',
    timestamp: '2026-09-08T13:39:04Z',
    sourceId: 'src_telemetry',
    eventType: 'client.navigation_error',
    summary: '404 resource request on missing bundle asset',
    payload: {
      path: '/assets/v2/chunk-88.js',
      referrer: 'https://app.alyoxa.io/overview',
      user_agent: 'AlyoxaDesktop/2.4.0',
    },
    correlationKeys: {
      ipAddress: '203.0.113.19',
    },
    attentionState: 'pass_through',
  },
];

export const signalPatterns: Pattern[] = [
  {
    id: 'pat_0012',
    title: 'Repeated Payment Failures on Customer Account',
    severity: 'medium',
    sourceIds: ['src_stripe'],
    observationIds: ['obs_89412a'], // Sampled observation representative of this pattern
    firstObserved: '2026-09-08T12:00:00Z',
    lastObserved: '2026-09-08T13:42:01Z',
    count: 3,
    status: 'active',
  },
  {
    id: 'pat_0013',
    title: 'Transient US-East Endpoint Degradation',
    severity: 'high',
    sourceIds: ['src_sys'],
    observationIds: ['obs_89412b'], // Sampled observation representative of this pattern
    firstObserved: '2026-09-08T13:40:00Z',
    lastObserved: '2026-09-08T13:41:58Z',
    count: 14,
    status: 'monitoring',
  },
];

export const signalInsights: Insight[] = [
  {
    id: 'ins_7721',
    observationId: 'obs_89412a',
    patternId: 'pat_0012',
    confidenceScore: 0.98,
    summary: 'Customer cus_9821 hit 3 consecutive billing failures in 24 hours. High risk of churn if service suspends.',
    recommendedAction: {
      forgeTargetNode: 'EX.02 // FORGE_BILLING_RECOVERY',
      actionName: 'dispatch_recovery_sequence',
      payload: {
        customer_id: 'cus_9821',
        grace_period_days: 3,
        email_template: 'billing_dunning_v2',
      },
    },
    attentionState: 'human_review_required',
    status: 'pending',
  },
  {
    id: 'ins_7722',
    observationId: 'obs_89412b',
    patternId: 'pat_0013',
    confidenceScore: 0.94,
    summary: 'US-East edge node latency spike resolved by routing traffic to backup EU-Central gateway.',
    recommendedAction: {
      forgeTargetNode: 'EX.01 // FORGE_TRAFFIC_ROUTER',
      actionName: 'reroute_edge_traffic',
      payload: {
        origin: 'us-east-01',
        target: 'eu-central-01',
      },
    },
    attentionState: 'autonomous_action',
    status: 'dispatched_to_forge',
  },
];