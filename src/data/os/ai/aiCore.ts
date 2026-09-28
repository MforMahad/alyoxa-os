import {
    signalObservations,
    signalPatterns,
    signalInsights,
    Observation,
    Pattern,
    Insight,
    PersistedSignalObservation,
  } from '@/data/os/signal';
  
  export type ContextCategory =
    | 'SIGNAL_OBSERVATION'
    | 'SIGNAL_PATTERN'
    | 'SIGNAL_INSIGHT'
    | 'PERSISTED_SIGNAL_OBSERVATION'
    | 'SYSTEM_STATE';
  
  export type ContextRelevance = 'high' | 'medium' | 'low';
  
  export interface AIContextItem {
    id: string;
    type: ContextCategory;
    sourceModule: 'SIGNAL' | 'FORGE' | 'PULSE' | 'VAULT' | 'SYSTEM';
    summary: string;
    timestamp: string;
    relevance: ContextRelevance;
    payload: Record<string, unknown>;
    refId?: string;
  }

  export interface PersistedSignalObservationContext extends AIContextItem {
    type: 'PERSISTED_SIGNAL_OBSERVATION';
    refId: string;
    payload: {
      category: string;
      title: string;
      description: string;
      severity: string;
      metadata: unknown | null;
      source_id: string;
      website_scan_id: string | null;
    };
  }

  export function buildPersistedSignalObservationContexts(
    observations: PersistedSignalObservation[]
  ): PersistedSignalObservationContext[] {
    return observations.map((observation) => ({
      id: `CTX-PERSISTED-SIGNAL-OBS-${observation.public_id}`,
      type: 'PERSISTED_SIGNAL_OBSERVATION',
      sourceModule: 'SIGNAL',
      summary: observation.description,
      timestamp: observation.observed_at,
      relevance:
        observation.severity === 'critical' || observation.severity === 'high'
          ? 'high'
          : observation.severity === 'low'
            ? 'low'
            : 'medium',
      refId: observation.public_id,
      payload: {
        category: observation.category,
        title: observation.title,
        description: observation.description,
        severity: observation.severity,
        metadata: observation.metadata,
        source_id: observation.source_id,
        website_scan_id: observation.website_scan_id,
      },
    }));
  }
  
  // Convert locked Signal Observations to AI Context Frames
  const observationContexts: AIContextItem[] = signalObservations.map((obs: Observation) => {
    const relevance: ContextRelevance =
      obs.attentionState === 'human_review_required'
        ? 'high'
        : obs.attentionState === 'autonomous_action'
        ? 'medium'
        : 'low';
  
    return {
      id: `CTX-OBS-${obs.id}`,
      type: 'SIGNAL_OBSERVATION',
      sourceModule: 'SIGNAL',
      summary: obs.summary,
      timestamp: obs.timestamp,
      relevance,
      refId: obs.id,
      payload: {
        eventType: obs.eventType,
        sourceId: obs.sourceId,
        attentionState: obs.attentionState,
        payload: obs.payload,
      },
    };
  });
  
  // Convert locked Signal Patterns to AI Context Frames
  const patternContexts: AIContextItem[] = signalPatterns.map((pat: Pattern) => {
    const relevance: ContextRelevance =
      pat.severity === 'critical' || pat.severity === 'high' ? 'high' : 'medium';
  
    return {
      id: `CTX-PAT-${pat.id}`,
      type: 'SIGNAL_PATTERN',
      sourceModule: 'SIGNAL',
      summary: pat.title,
      timestamp: pat.lastObserved,
      relevance,
      refId: pat.id,
      payload: {
        count: pat.count,
        severity: pat.severity,
        status: pat.status,
        observationIds: pat.observationIds,
      },
    };
  });
  
  // Convert locked Signal Insights to AI Context Frames with derived timestamps
  const insightContexts: AIContextItem[] = signalInsights.map((ins: Insight) => {
    // Truthfully derive timestamp from linked Observation or Pattern instead of inventing one
    const linkedObs = signalObservations.find((o) => o.id === ins.observationId);
    const linkedPat = signalPatterns.find((p) => p.id === ins.patternId);
    const derivedTimestamp = linkedObs?.timestamp || linkedPat?.lastObserved || '—';
  
    const relevance: ContextRelevance =
      ins.attentionState === 'human_review_required' ? 'high' : 'medium';
  
    return {
      id: `CTX-INS-${ins.id}`,
      type: 'SIGNAL_INSIGHT',
      sourceModule: 'SIGNAL',
      summary: ins.summary,
      timestamp: derivedTimestamp,
      relevance,
      refId: ins.id,
      payload: {
        confidenceScore: ins.confidenceScore,
        attentionState: ins.attentionState,
        status: ins.status,
        recommendedAction: ins.recommendedAction,
      },
    };
  });
  
// System State Context Frames (Static Fixture Data for OS Runtime)
const systemStateContexts: AIContextItem[] = [
    {
      id: 'CTX-SYS-001',
      type: 'SYSTEM_STATE',
      sourceModule: 'SYSTEM',
      summary: 'OS Ingestion Bridge Operational across 4 telemetry nodes',
      // Static fixture timestamp representing baseline system state snapshot
      timestamp: '2026-08-30T11:00:00Z',
      relevance: 'low',
      payload: {
        activeNodes: ['webhook-ingest', 'telemetry-stream', 'auth-guard', 'state-sync'],
        globalState: 'NOMINAL',
      },
    },
  ];
  
  export const aiCoreContextRegistry: AIContextItem[] = [
    ...insightContexts,
    ...patternContexts,
    ...observationContexts,
    ...systemStateContexts,
  ];