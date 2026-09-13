import { OSEventAction } from '../../data/os/events';

export type OSAutomationModule =
  | 'SIGNAL'
  | 'AI'
  | 'FORGE'
  | 'PULSE'
  | 'VAULT'
  | 'SYSTEM';

export type OSAutomationStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'disabled';

export type OSAutomationTriggerType =
  | 'event'
  | 'condition';

export type OSAutomationActionType =
  | 'notify'
  | 'create_task'
  | 'request_review'
  | 'store_context';

export interface OSAutomationTrigger {
  type: OSAutomationTriggerType;
  module: OSAutomationModule;
  recordType?: string;
  eventAction?: OSEventAction;
  condition?: string;
}

export interface OSAutomationCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface OSAutomationAction {
  type: OSAutomationActionType;
  module: OSAutomationModule;
  parameters: Record<string, unknown>;
}

export interface OSAutomation {
  id: string;
  name: string;
  description: string;
  status: OSAutomationStatus;
  ownerModule: OSAutomationModule;
  trigger: OSAutomationTrigger;
  conditions: OSAutomationCondition[];
  actions: OSAutomationAction[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Deterministic OS Automation Registry.
 * References strictly existing locked record types and modules without runtime execution or unverified claims.
 */
export const osAutomationsRegistry: OSAutomation[] = [
    {
      id: 'AUTO-001',
      name: 'Telemetry Latency Observation Notification Intent',
      description: 'Prepare notification parameters when a telemetry latency observation is created.',
      status: 'active',
      ownerModule: 'SIGNAL',
      trigger: {
        type: 'event',
        module: 'SIGNAL',
        recordType: 'Observation',
        eventAction: 'created',
      },
      conditions: [
        {
          field: 'metric',
          operator: 'equals',
          value: 'latency',
        },
      ],
      actions: [
        {
          type: 'notify',
          module: 'SYSTEM',
          parameters: {
            recordId: 'OBS-001',
          },
        },
      ],
      createdAt: '2026-08-30T10:00:00Z',
      updatedAt: '2026-08-30T10:00:00Z',
      metadata: {
        intentScope: 'telemetry_monitoring',
      },
    },
    {
      id: 'AUTO-002',
      name: 'AI Decision Task Creation Intent',
      description: 'Prepare Forge task parameters when a rate limit threshold decision is created.',
      status: 'active',
      ownerModule: 'AI',
      trigger: {
        type: 'event',
        module: 'AI',
        recordType: 'Decision',
        eventAction: 'created',
      },
      conditions: [
        {
          field: 'threshold',
          operator: 'equals',
          value: 'rate_limit',
        },
      ],
      actions: [
        {
          type: 'create_task',
          module: 'FORGE',
          parameters: {
            recordId: 'DEC-001',
          },
        },
      ],
      createdAt: '2026-08-30T10:05:00Z',
      updatedAt: '2026-08-30T10:05:00Z',
      metadata: {
        intentScope: 'task_dispatch',
      },
    },
    {
      id: 'AUTO-003',
      name: 'Forge Task Context Evaluation Request Intent',
      description: 'Prepare Pulse status evaluation request parameters when a Forge task is created.',
      status: 'active',
      ownerModule: 'FORGE',
      trigger: {
        type: 'event',
        module: 'FORGE',
        recordType: 'Task',
        eventAction: 'created',
      },
      conditions: [
        {
          field: 'recordId',
          operator: 'equals',
          value: 'TASK-001',
        },
      ],
      actions: [
        {
          type: 'request_review',
          module: 'PULSE',
          parameters: {
            recordId: 'TASK-001',
            evaluationTarget: 'DEC-001',
          },
        },
      ],
      createdAt: '2026-08-30T10:10:00Z',
      updatedAt: '2026-08-30T10:10:00Z',
      metadata: {
        intentScope: 'evaluation_routing',
      },
    },
    {
      id: 'AUTO-004',
      name: 'Vault Specification Registration Context Intent',
      description: 'Prepare Vault context storage parameters when an onboarding specification item is updated.',
      status: 'paused',
      ownerModule: 'VAULT',
      trigger: {
        type: 'event',
        module: 'VAULT',
        recordType: 'VaultItem',
        eventAction: 'updated',
      },
      conditions: [
        {
          field: 'filename',
          operator: 'equals',
          value: 'client_onboarding_spec_v1.pdf',
        },
      ],
      actions: [
        {
          type: 'store_context',
          module: 'VAULT',
          parameters: {
            recordId: 'ITEM-001',
          },
        },
      ],
      createdAt: '2026-08-30T10:15:00Z',
      updatedAt: '2026-08-30T10:15:00Z',
      metadata: {
        intentScope: 'context_retention',
      },
    },
  ];

const CANONICAL_MODULES: ReadonlySet<string> = new Set([
  'SIGNAL',
  'AI',
  'FORGE',
  'PULSE',
  'VAULT',
  'SYSTEM',
]);

const CANONICAL_STATUSES: ReadonlySet<string> = new Set([
  'draft',
  'active',
  'paused',
  'disabled',
]);

const CANONICAL_TRIGGER_TYPES: ReadonlySet<string> = new Set([
  'event',
  'condition',
]);

const CANONICAL_ACTION_TYPES: ReadonlySet<string> = new Set([
  'notify',
  'create_task',
  'request_review',
  'store_context',
]);

const CANONICAL_EVENT_ACTIONS: ReadonlySet<OSEventAction> = new Set<OSEventAction>([
  'created',
  'updated',
  'received',
  'started',
  'completed',
  'failed',
  'approved',
  'rejected',
  'archived',
  'resolved',
  'dispatched',
]);

function isPlainObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isParseableTimestamp(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Date.parse(value));
}

export class OSAutomationStore {
  private automations: Map<string, OSAutomation> = new Map();

  constructor(initialRegistry: OSAutomation[] = osAutomationsRegistry) {
    for (const item of initialRegistry) {
      this.addAutomation(item);
    }
  }

  /**
   * Registers an automation into the store.
   * Duplicate IDs are rejected; existing automations are never silently overwritten.
   */
  addAutomation(automation: Readonly<OSAutomation>): void {
    this.validateAutomation(automation);
    this.automations.set(automation.id, structuredClone(automation));
  }

  /**
   * Retrieves a single automation by ID.
   */
  getAutomation(id: string): OSAutomation | undefined {
    const auto = this.automations.get(id);
    return auto ? structuredClone(auto) : undefined;
  }

  /**
   * Returns deep-cloned copies of all stored automations.
   */
  getAll(): OSAutomation[] {
    return Array.from(this.automations.values()).map((a) => structuredClone(a));
  }

  /**
   * Returns all automations with status 'active'.
   */
  getActive(): OSAutomation[] {
    const result: OSAutomation[] = [];
    for (const auto of this.automations.values()) {
      if (auto.status === 'active') {
        result.push(structuredClone(auto));
      }
    }
    return result;
  }

  /**
   * Returns all automations belonging to a specific owner module.
   */
  getByOwnerModule(module: OSAutomationModule): OSAutomation[] {
    const result: OSAutomation[] = [];
    for (const auto of this.automations.values()) {
      if (auto.ownerModule === module) {
        result.push(structuredClone(auto));
      }
    }
    return result;
  }

  /**
   * Updates an automation's status. Returns true if updated, false if unknown ID.
   */
  updateStatus(id: string, status: OSAutomationStatus): boolean {
    const auto = this.automations.get(id);
    if (!auto) return false;
    auto.status = status;
    auto.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Returns total count of registered automations.
   */
  get size(): number {
    return this.automations.size;
  }

  private validateAutomation(automation: Readonly<OSAutomation>): void {
    if (!automation.id || automation.id.trim() === '') {
      throw new Error('[OSAutomationStore] Automation id must be a non-empty string.');
    }

    if (!automation.name || automation.name.trim() === '') {
      throw new Error(
        `[OSAutomationStore] Automation "${automation.id}" name must be a non-empty string.`
      );
    }

    if (!automation.description || automation.description.trim() === '') {
      throw new Error(
        `[OSAutomationStore] Automation "${automation.id}" description must be a non-empty string.`
      );
    }

    if (!CANONICAL_STATUSES.has(automation.status)) {
      throw new Error(
        `[OSAutomationStore] Invalid status "${automation.status}" for automation "${automation.id}".`
      );
    }

    if (!CANONICAL_MODULES.has(automation.ownerModule)) {
      throw new Error(
        `[OSAutomationStore] Invalid ownerModule "${automation.ownerModule}" for automation "${automation.id}".`
      );
    }

    this.validateTrigger(automation.id, automation.trigger);

    if (!Array.isArray(automation.conditions)) {
      throw new Error(
        `[OSAutomationStore] Automation "${automation.id}" conditions must be an array.`
      );
    }

    for (const condition of automation.conditions) {
      if (!isPlainObject(condition)) {
        throw new Error(
          `[OSAutomationStore] Automation "${automation.id}" contains a malformed condition.`
        );
      }
      if (!condition.field || condition.field.trim() === '') {
        throw new Error(
          `[OSAutomationStore] Automation "${automation.id}" condition field must be a non-empty string.`
        );
      }
      if (!condition.operator || condition.operator.trim() === '') {
        throw new Error(
          `[OSAutomationStore] Automation "${automation.id}" condition operator must be a non-empty string.`
        );
      }
    }

    if (!Array.isArray(automation.actions)) {
      throw new Error(
        `[OSAutomationStore] Automation "${automation.id}" actions must be an array.`
      );
    }

    for (const action of automation.actions) {
      if (!isPlainObject(action)) {
        throw new Error(
          `[OSAutomationStore] Automation "${automation.id}" contains a malformed action.`
        );
      }
      if (!CANONICAL_ACTION_TYPES.has(action.type)) {
        throw new Error(
          `[OSAutomationStore] Invalid action type "${String(action.type)}" for automation "${automation.id}".`
        );
      }
      if (!CANONICAL_MODULES.has(action.module)) {
        throw new Error(
          `[OSAutomationStore] Invalid action module "${String(action.module)}" for automation "${automation.id}".`
        );
      }
      if (!isPlainObject(action.parameters)) {
        throw new Error(
          `[OSAutomationStore] Automation "${automation.id}" action parameters must be a valid object.`
        );
      }
    }

    if (!automation.createdAt || !isParseableTimestamp(automation.createdAt)) {
      throw new Error(
        `[OSAutomationStore] Automation "${automation.id}" createdAt must be a non-empty parseable timestamp.`
      );
    }

    if (!automation.updatedAt || !isParseableTimestamp(automation.updatedAt)) {
      throw new Error(
        `[OSAutomationStore] Automation "${automation.id}" updatedAt must be a non-empty parseable timestamp.`
      );
    }

    if (!isPlainObject(automation.metadata)) {
      throw new Error(
        `[OSAutomationStore] Automation "${automation.id}" metadata must be a valid object.`
      );
    }

    if (this.automations.has(automation.id)) {
      throw new Error(
        `[OSAutomationStore] Duplicate automation ID rejected: ${automation.id}`
      );
    }
  }

  private validateTrigger(automationId: string, trigger: OSAutomationTrigger): void {
    if (!isPlainObject(trigger)) {
      throw new Error(
        `[OSAutomationStore] Automation "${automationId}" trigger must be a valid object.`
      );
    }

    if (!CANONICAL_TRIGGER_TYPES.has(trigger.type)) {
      throw new Error(
        `[OSAutomationStore] Invalid trigger type "${String(trigger.type)}" for automation "${automationId}".`
      );
    }

    if (!CANONICAL_MODULES.has(trigger.module)) {
      throw new Error(
        `[OSAutomationStore] Invalid trigger module "${String(trigger.module)}" for automation "${automationId}".`
      );
    }

    if (trigger.recordType !== undefined && trigger.recordType.trim() === '') {
      throw new Error(
        `[OSAutomationStore] Automation "${automationId}" trigger recordType must be a non-empty string when supplied.`
      );
    }

    if (trigger.eventAction !== undefined && !CANONICAL_EVENT_ACTIONS.has(trigger.eventAction)) {
      throw new Error(
        `[OSAutomationStore] Automation "${automationId}" trigger eventAction "${String(trigger.eventAction)}" is not a canonical OSEventAction.`
      );
    }

    if (trigger.condition !== undefined && trigger.condition.trim() === '') {
      throw new Error(
        `[OSAutomationStore] Automation "${automationId}" trigger condition must be a non-empty string when supplied.`
      );
    }
  }
}

/**
 * Default singleton instance initialized with canonical osAutomationsRegistry.
 */
export const osAutomationStore = new OSAutomationStore();