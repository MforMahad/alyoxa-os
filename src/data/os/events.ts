export type OSEventModule =
  | 'SIGNAL'
  | 'AI'
  | 'FORGE'
  | 'PULSE'
  | 'VAULT'
  | 'SYSTEM';

export type OSEventAction =
  | 'created'
  | 'updated'
  | 'received'
  | 'started'
  | 'completed'
  | 'failed'
  | 'approved'
  | 'rejected'
  | 'archived'
  | 'resolved'
  | 'dispatched';

export interface OSEvent {
  id: string;
  module: OSEventModule;
  action: OSEventAction;
  recordId: string;
  recordType: string;
  timestamp: string;
  actor: string;
  summary: string;
  metadata: Record<string, unknown>;
}

export const osEventsRegistry: OSEvent[] = [
  {
    id: 'EVT-001',
    module: 'SIGNAL',
    action: 'created',
    recordId: 'OBS-001',
    recordType: 'observation',
    timestamp: '2026-08-30T09:45:00Z',
    actor: 'SIGNAL-ENGINE',
    summary: 'API Telemetry Latency Anomaly detected.',
    metadata: { severity: 'high', metric: 'p99_latency_ms' },
  },
  {
    id: 'EVT-002',
    module: 'SIGNAL',
    action: 'created',
    recordId: 'INS-001',
    recordType: 'insight',
    timestamp: '2026-08-30T10:00:00Z',
    actor: 'SIGNAL-ENGINE',
    summary: 'Telemetry Anomaly Insight derived from observation OBS-001.',
    metadata: { sourceObservationId: 'OBS-001' },
  },
  {
    id: 'EVT-003',
    module: 'AI',
    action: 'created',
    recordId: 'DEC-001',
    recordType: 'decision',
    timestamp: '2026-08-30T10:15:00Z',
    actor: 'AI-CORE',
    summary: 'Autonomous Decision DEC-001 drafted for execution run RUN-001.',
    metadata: { targetRunId: 'RUN-001' },
  },
  {
    id: 'EVT-004',
    module: 'AI',
    action: 'started',
    recordId: 'RUN-001',
    recordType: 'run',
    timestamp: '2026-08-30T10:20:00Z',
    actor: 'AI-CORE',
    summary: 'Execution Run RUN-001 initiated for automated optimization.',
    metadata: { decisionId: 'DEC-001' },
  },
  {
    id: 'EVT-005',
    module: 'PULSE',
    action: 'created',
    recordId: 'REQ-001',
    recordType: 'request',
    timestamp: '2026-08-30T10:30:00Z',
    actor: 'AI-CORE',
    summary: 'Request REQ-001 submitted for urgent approval.',
    metadata: { threadId: 'THRD-001' },
  },
  {
    id: 'EVT-006',
    module: 'PULSE',
    action: 'approved',
    recordId: 'APP-001',
    recordType: 'approval',
    timestamp: '2026-08-30T10:45:00Z',
    actor: 'PULSE-ENGINE',
    summary: 'Approval APP-001 granted for request REQ-001.',
    metadata: { requestId: 'REQ-001' },
  },
  {
    id: 'EVT-007',
    module: 'FORGE',
    action: 'received',
    recordId: 'TASK-001',
    recordType: 'execution_task',
    timestamp: '2026-08-30T11:00:00Z',
    actor: 'FORGE-ENGINE',
    summary: 'Task TASK-001 assigned to infrastructure node NODE-INFRASTRUCTURE.',
    metadata: { assignedNodeId: 'NODE-INFRASTRUCTURE' },
  },
  {
    id: 'EVT-008',
    module: 'FORGE',
    action: 'dispatched',
    recordId: 'REC-001',
    recordType: 'execution_record',
    timestamp: '2026-08-30T11:05:00Z',
    actor: 'FORGE-ENGINE',
    summary: 'Execution record REC-001 logged for task TASK-001.',
    metadata: { taskId: 'TASK-001' },
  },
  {
    id: 'EVT-009',
    module: 'VAULT',
    action: 'created',
    recordId: 'KNOW-001',
    recordType: 'knowledge',
    timestamp: '2026-08-30T11:30:00Z',
    actor: 'VAULT-ENGINE',
    summary: 'Knowledge entry indexed under FOLDER-PROJECTS.',
    metadata: { folderId: 'FOLDER-PROJECTS' },
  },
  {
    id: 'EVT-010',
    module: 'VAULT',
    action: 'updated',
    recordId: 'ITEM-001',
    recordType: 'asset',
    timestamp: '2026-08-30T11:45:00Z',
    actor: 'VAULT-ENGINE',
    summary: 'Vault asset ITEM-001 updated in FOLDER-CLIENTS.',
    metadata: { folderId: 'FOLDER-CLIENTS' },
  },
];