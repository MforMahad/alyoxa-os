export type DecisionAttentionState =
  | 'autonomous_action'
  | 'human_review_required';

export type DecisionStatus =
  | 'pending'
  | 'dispatched_to_forge'
  | 'rejected';

export interface AIDecision {
  id: string;
  contextIds: string[];
  sourceModule: 'SIGNAL';
  confidenceScore: number;
  summary: string;
  recommendedAction: {
    forgeTargetNode: string;
    actionName: string;
    payload: Record<string, unknown>;
  };
  attentionState: DecisionAttentionState;
  status: DecisionStatus;
}

export const aiDecisionsRegistry: AIDecision[] = [
  {
    id: 'DEC-001',
    contextIds: ['CTX-OBS-obs_89412a', 'CTX-INS-ins_7721'],
    sourceModule: 'SIGNAL',
    confidenceScore: 0.98,
    summary: 'Review repeated customer billing failures before automated recovery.',
    recommendedAction: {
      forgeTargetNode: 'forge.billing',
      actionName: 'review_payment_failures',
      payload: {
        patternId: 'PAT-001',
        failureCount: 14,
        suggestedStrategy: 'dunning_retry_with_grace_period',
      },
    },
    attentionState: 'human_review_required',
    status: 'pending',
  },
  {
    id: 'DEC-002',
    contextIds: ['CTX-OBS-obs_89412b', 'CTX-INS-ins_7722'],
    sourceModule: 'SIGNAL',
    confidenceScore: 0.94,
    summary: 'Route traffic away from the degraded US-East endpoint.',
    recommendedAction: {
      forgeTargetNode: 'forge.infrastructure',
      actionName: 'route_traffic',
      payload: {
        sourceNode: 'us-east-1',
        targetNode: 'us-west-2',
        trafficPercentage: 100,
        degradationThresholdMs: 850,
      },
    },
    attentionState: 'autonomous_action',
    status: 'dispatched_to_forge',
  },
];