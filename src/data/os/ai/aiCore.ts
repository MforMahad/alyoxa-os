import {
    signalObservations,
    signalPatterns,
    signalInsights,
    Observation,
    Pattern,
    Insight,
  } from '@/data/os/signal';
  
  export type ContextCategory =
    | 'SIGNAL_OBSERVATION'
    | 'SIGNAL_PATTERN'
    | 'SIGNAL_INSIGHT'
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