import { aiDecisionsRegistry } from "@/components/os/ai/aiDecisions";


export type ExecutionTaskStatus =
  | 'received'
  | 'queued'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed';

export type ExecutionNodeStatus =
  | 'online'
  | 'degraded'
  | 'offline';

export interface ExecutionNode {
  id: string;
  name: string;
  type: string;
  status: ExecutionNodeStatus;
  capabilities: string[];
}

export interface ExecutionTask {
  id: string;
  runId: string;
  decisionId: string;
  nodeId: string;
  actionName: string;
  payload: Record<string, unknown>;
  status: ExecutionTaskStatus;
  createdAt: string;
}

export interface ExecutionRecord {
  id: string;
  taskId: string;
  runId: string;
  nodeId: string;
  status: ExecutionTaskStatus;
  receivedAt: string;
  startedAt?: string;
  completedAt?: string;
  summary: string;
  result?: Record<string, unknown>;
  error?: string;
}

const dec001 = aiDecisionsRegistry.find((d) => d.id === 'DEC-001');
const dec002 = aiDecisionsRegistry.find((d) => d.id === 'DEC-002');

if (!dec001 || !dec002) {
  throw new Error('Required upstream AI Decisions (DEC-001, DEC-002) missing from registry.');
}

export const forgeNodesRegistry: ExecutionNode[] = [
  {
    id: 'NODE-BILLING',
    name: 'Billing Execution Node',
    type: 'billing',
    status: 'online',
    capabilities: ['review_payment_failures'],
  },
  {
    id: 'NODE-INFRASTRUCTURE',
    name: 'Infrastructure Execution Node',
    type: 'infrastructure',
    status: 'online',
    capabilities: ['route_traffic'],
  },
];

export const forgeTasksRegistry: ExecutionTask[] = [
  {
    id: 'TASK-001',
    runId: 'RUN-001',
    decisionId: 'DEC-001',
    nodeId: 'NODE-BILLING',
    actionName: dec001.recommendedAction.actionName,
    payload: dec001.recommendedAction.payload,
    status: 'received',
    createdAt: '2026-08-30T10:50:00Z',
  },
  {
    id: 'TASK-002',
    runId: 'RUN-002',
    decisionId: 'DEC-002',
    nodeId: 'NODE-INFRASTRUCTURE',
    actionName: dec002.recommendedAction.actionName,
    payload: dec002.recommendedAction.payload,
    status: 'queued',
    createdAt: '2026-08-30T11:05:00Z',
  },
];

export const forgeRecordsRegistry: ExecutionRecord[] = [
  {
    id: 'REC-001',
    taskId: 'TASK-001',
    runId: 'RUN-001',
    nodeId: 'NODE-BILLING',
    status: 'received',
    receivedAt: '2026-08-30T10:50:00Z',
    summary: 'Task received from AI Core and held at authorization boundary.',
  },
  {
    id: 'REC-002',
    taskId: 'TASK-002',
    runId: 'RUN-002',
    nodeId: 'NODE-INFRASTRUCTURE',
    status: 'queued',
    receivedAt: '2026-08-30T11:05:00Z',
    summary: 'Task queued for infrastructure execution node. Executor attachment pending.',
  },
];