export type AIRunStatus =
  | 'queued'
  | 'awaiting_approval'
  | 'dispatched'
  | 'completed'
  | 'failed';

export type AIRunTrigger =
  | 'decision'
  | 'manual'
  | 'automation';

export interface AIRun {
  id: string;
  decisionId: string;
  trigger: AIRunTrigger;
  status: AIRunStatus;
  startedAt: string;
  completedAt?: string;
  executionTarget: string;
  actionName: string;
  summary: string;
}

export const aiRunsRegistry: AIRun[] = [
  {
    id: 'RUN-001',
    decisionId: 'DEC-001',
    trigger: 'decision',
    status: 'awaiting_approval',
    startedAt: '2026-08-30T10:45:00Z',
    executionTarget: 'forge.billing',
    actionName: 'review_payment_failures',
    summary: 'Awaiting human authorization before Forge handoff.',
  },
  {
    id: 'RUN-002',
    decisionId: 'DEC-002',
    trigger: 'decision',
    status: 'dispatched',
    startedAt: '2026-08-30T10:47:00Z',
    executionTarget: 'forge.infrastructure',
    actionName: 'route_traffic',
    summary: 'Decision dispatched to Forge execution layer.',
  },
];