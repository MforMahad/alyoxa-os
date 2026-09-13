import { aiDecisionsRegistry } from '@/components/os/ai/aiDecisions';
import { forgeTasksRegistry } from './forge';

// Verify upstream lineage references
const dec001 = aiDecisionsRegistry.find((d) => d.id === 'DEC-001');
const dec002 = aiDecisionsRegistry.find((d) => d.id === 'DEC-002');
const task001 = forgeTasksRegistry.find((t) => t.id === 'TASK-001');
const task002 = forgeTasksRegistry.find((t) => t.id === 'TASK-002');

if (!dec001 || !dec002 || !task001 || !task002) {
  throw new Error('Required upstream lineage references (DEC-001, DEC-002, TASK-001, TASK-002) missing from registry.');
}

// ==========================================
// TYPES & UNIONS
// ==========================================

export type PulseRequestType = 'human_approval' | 'system_review' | 'collaboration';
export type PulseRequestStatus = 'received' | 'under_review' | 'approved' | 'rejected';
export type PulseRequestPriority = 'low' | 'medium' | 'high' | 'critical';

export type PulseThreadStatus = 'open' | 'resolved' | 'archived';
export type PulseParticipantRole = 'system' | 'operator' | 'reviewer';

export type PulseApprovalStatus = 'pending' | 'approved' | 'rejected';

export type PulseActivityType = 'request_received' | 'thread_opened' | 'review_pending' | 'approval_required' | 'communication_prepared';

export interface PulseParticipant {
  id: string;
  name: string;
  role: PulseParticipantRole;
}

export interface PulseMessage {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface PulseRequest {
  id: string;
  type: PulseRequestType;
  status: PulseRequestStatus;
  priority: PulseRequestPriority;
  title: string;
  description: string;
  decisionId: string;
  taskId: string;
  requestedBy: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface PulseThread {
  id: string;
  requestId: string;
  status: PulseThreadStatus;
  title: string;
  participants: PulseParticipant[];
  messages: PulseMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface PulseApproval {
  id: string;
  requestId: string;
  decisionId: string;
  taskId: string;
  status: PulseApprovalStatus;
  approverId: string;
  comments: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface PulseActivity {
  id: string;
  requestId: string;
  type: PulseActivityType;
  actorId: string;
  description: string;
  timestamp: string;
  details: Record<string, unknown>;
}

// ==========================================
// STATIC FIXTURES
// ==========================================

export const pulseRequestsRegistry: PulseRequest[] = [
  {
    id: 'REQ-001',
    type: 'human_approval',
    status: 'under_review',
    priority: 'high',
    title: 'Authorization Required for Payment Failure Mitigation',
    description: 'Human approval boundary flagged TASK-001 under DEC-001 for review.',
    decisionId: dec001.id,
    taskId: task001.id,
    requestedBy: 'SYSTEM_ORCHESTRATOR',
    createdAt: '2026-08-30T11:00:00Z',
    metadata: {
      actionName: task001.actionName,
      sourceRunId: task001.runId,
    },
  },
  {
    id: 'REQ-002',
    type: 'system_review',
    status: 'received',
    priority: 'medium',
    title: 'Traffic Reroute Queue Inspection',
    description: 'Internal review queued for TASK-002 prior to node execution.',
    decisionId: dec002.id,
    taskId: task002.id,
    requestedBy: 'SYSTEM_ORCHESTRATOR',
    createdAt: '2026-08-30T11:10:00Z',
    metadata: {
      actionName: task002.actionName,
      sourceRunId: task002.runId,
    },
  },
];

export const pulseThreadsRegistry: PulseThread[] = [
  {
    id: 'THRD-001',
    requestId: 'REQ-001',
    status: 'open',
    title: 'Billing Policy Discussion - REQ-001',
    participants: [
      { id: 'SYS-ORCHESTRATOR', name: 'System Orchestrator Identity', role: 'system' },
      { id: 'OPERATOR-IDENTITY-01', name: 'System Operator Identity', role: 'operator' },
    ],
    messages: [
      {
        id: 'MSG-001',
        authorId: 'SYS-ORCHESTRATOR',
        content: 'Task TASK-001 queued for approval boundary review.',
        createdAt: '2026-08-30T11:01:00Z',
      },
      {
        id: 'MSG-002',
        authorId: 'OPERATOR-IDENTITY-01',
        content: 'Internal review of payload parameters in progress.',
        createdAt: '2026-08-30T11:04:00Z',
      },
    ],
    createdAt: '2026-08-30T11:01:00Z',
    updatedAt: '2026-08-30T11:04:00Z',
  },
  {
    id: 'THRD-002',
    requestId: 'REQ-002',
    status: 'open',
    title: 'Infrastructure Reroute Review - REQ-002',
    participants: [
      { id: 'SYS-ORCHESTRATOR', name: 'System Orchestrator Identity', role: 'system' },
      { id: 'REVIEWER-IDENTITY-01', name: 'Lead Architect Identity', role: 'reviewer' },
    ],
    messages: [
      {
        id: 'MSG-003',
        authorId: 'SYS-ORCHESTRATOR',
        content: 'Task TASK-002 placed in execution queue for NODE-INFRASTRUCTURE.',
        createdAt: '2026-08-30T11:11:00Z',
      },
    ],
    createdAt: '2026-08-30T11:11:00Z',
    updatedAt: '2026-08-30T11:11:00Z',
  },
];

export const pulseApprovalsRegistry: PulseApproval[] = [
  {
    id: 'APP-001',
    requestId: 'REQ-001',
    decisionId: dec001.id,
    taskId: task001.id,
    status: 'pending',
    approverId: 'OPERATOR-IDENTITY-01',
    comments: 'Awaiting human review of failure threshold.',
    createdAt: '2026-08-30T11:02:00Z',
  },
  {
    id: 'APP-002',
    requestId: 'REQ-002',
    decisionId: dec002.id,
    taskId: task002.id,
    status: 'pending',
    approverId: 'REVIEWER-IDENTITY-01',
    comments: 'Awaiting architectural confirmation before queue release.',
    createdAt: '2026-08-30T11:12:00Z',
  },
];

export const pulseActivitiesRegistry: PulseActivity[] = [
  {
    id: 'ACT-001',
    requestId: 'REQ-001',
    type: 'approval_required',
    actorId: 'SYS-ORCHESTRATOR',
    description: 'Approval required for TASK-001 execution.',
    timestamp: '2026-08-30T11:02:30Z',
    details: {
      blockedTask: task001.id,
      targetNode: task001.nodeId,
    },
  },
  {
    id: 'ACT-002',
    requestId: 'REQ-002',
    type: 'communication_prepared',
    actorId: 'SYS-ORCHESTRATOR',
    description: 'Review record prepared for infrastructure queue.',
    timestamp: '2026-08-30T11:13:00Z',
    details: {
      queuedTask: task002.id,
      targetNode: task002.nodeId,
    },
  },
];