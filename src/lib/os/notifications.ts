export type OSNotificationModule =
  | 'SIGNAL'
  | 'AI'
  | 'FORGE'
  | 'PULSE'
  | 'VAULT'
  | 'SYSTEM';

export type OSNotificationSeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type OSNotificationStatus =
  | 'unread'
  | 'read';

export type OSNotificationType =
  | 'event'
  | 'approval'
  | 'attention'
  | 'completion'
  | 'failure'
  | 'system';

export interface OSNotification {
  id: string;
  module: OSNotificationModule;
  type: OSNotificationType;
  severity: OSNotificationSeverity;
  status: OSNotificationStatus;
  title: string;
  message: string;
  recordId: string;
  recordType: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export const osNotificationsRegistry: OSNotification[] = [
    {
      id: 'NOTIF-001',
      module: 'SIGNAL',
      type: 'event',
      severity: 'info',
      status: 'unread',
      title: 'Telemetry Observation Recorded',
      message: 'Telemetry latency observation OBS-001 recorded.',
      recordId: 'OBS-001',
      recordType: 'Observation',
      timestamp: '2026-08-30T10:00:00Z',
      metadata: { metric: 'latency' },
    },
    {
      id: 'NOTIF-002',
      module: 'SIGNAL',
      type: 'event',
      severity: 'info',
      status: 'unread',
      title: 'Telemetry Insight Recorded',
      message: 'Performance anomaly insight INS-001 recorded.',
      recordId: 'INS-001',
      recordType: 'Insight',
      timestamp: '2026-08-30T10:05:00Z',
      metadata: { analysis: 'anomaly' },
    },
    {
      id: 'NOTIF-003',
      module: 'AI',
      type: 'event',
      severity: 'info',
      status: 'unread',
      title: 'AI Decision Recorded',
      message: 'Rate limit threshold decision DEC-001 recorded.',
      recordId: 'DEC-001',
      recordType: 'Decision',
      timestamp: '2026-08-30T10:10:00Z',
      metadata: { threshold: 'rate_limit' },
    },
    {
      id: 'NOTIF-004',
      module: 'AI',
      type: 'event',
      severity: 'info',
      status: 'read',
      title: 'AI Execution Run Recorded',
      message: 'Optimization execution run RUN-001 recorded.',
      recordId: 'RUN-001',
      recordType: 'ExecutionRun',
      timestamp: '2026-08-30T10:12:00Z',
      metadata: { executionId: 'RUN-001' },
    },
    {
      id: 'NOTIF-005',
      module: 'FORGE',
      type: 'event',
      severity: 'info',
      status: 'unread',
      title: 'Forge Task Recorded',
      message: 'Rate limit adjustment task TASK-001 recorded.',
      recordId: 'TASK-001',
      recordType: 'Task',
      timestamp: '2026-08-30T10:15:00Z',
      metadata: { taskType: 'adjustment' },
    },
    {
      id: 'NOTIF-006',
      module: 'FORGE',
      type: 'event',
      severity: 'info',
      status: 'read',
      title: 'Forge Record Created',
      message: 'Execution record REC-001 created.',
      recordId: 'REC-001',
      recordType: 'Record',
      timestamp: '2026-08-30T10:18:00Z',
      metadata: { recordType: 'execution' },
    },
    {
      id: 'NOTIF-007',
      module: 'PULSE',
      type: 'event',
      severity: 'info',
      status: 'unread',
      title: 'Pulse Request Recorded',
      message: 'Request REQ-001 seeking decision evaluation context recorded.',
      recordId: 'REQ-001',
      recordType: 'Request',
      timestamp: '2026-08-30T10:20:00Z',
      metadata: { requestType: 'status_check' },
    },
    {
      id: 'NOTIF-008',
      module: 'VAULT',
      type: 'event',
      severity: 'info',
      status: 'read',
      title: 'Vault Item Registered',
      message: 'Onboarding specification document ITEM-001 registered.',
      recordId: 'ITEM-001',
      recordType: 'VaultItem',
      timestamp: '2026-08-30T10:25:00Z',
      metadata: { filename: 'client_onboarding_spec_v1.pdf' },
    },
    {
      id: 'NOTIF-009',
      module: 'VAULT',
      type: 'event',
      severity: 'info',
      status: 'unread',
      title: 'Knowledge Entry Registered',
      message: 'Client Onboarding Scope Requirements KNOW-001 registered.',
      recordId: 'KNOW-001',
      recordType: 'KnowledgeEntry',
      timestamp: '2026-08-30T10:30:00Z',
      metadata: { topic: 'onboarding_scope' },
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

const CANONICAL_TYPES: ReadonlySet<string> = new Set([
  'event',
  'approval',
  'attention',
  'completion',
  'failure',
  'system',
]);

const CANONICAL_SEVERITIES: ReadonlySet<string> = new Set([
  'info',
  'success',
  'warning',
  'error',
]);

const CANONICAL_STATUSES: ReadonlySet<string> = new Set([
  'unread',
  'read',
]);

export class OSNotificationStore {
  private notifications: Map<string, OSNotification> = new Map();

  constructor(initialRegistry: OSNotification[] = osNotificationsRegistry) {
    for (const item of initialRegistry) {
      this.addNotification(item);
    }
  }

  addNotification(notification: Readonly<OSNotification>): void {
    this.validateNotification(notification);
    this.notifications.set(notification.id, this.cloneNotification(notification));
  }

  getNotification(id: string): OSNotification | undefined {
    const notif = this.notifications.get(id);
    return notif ? this.cloneNotification(notif) : undefined;
  }

  getAll(): OSNotification[] {
    return Array.from(this.notifications.values()).map((n) => this.cloneNotification(n));
  }

  getUnread(): OSNotification[] {
    const result: OSNotification[] = [];
    for (const notif of this.notifications.values()) {
      if (notif.status === 'unread') {
        result.push(this.cloneNotification(notif));
      }
    }
    return result;
  }

  getByModule(module: OSNotificationModule): OSNotification[] {
    const result: OSNotification[] = [];
    for (const notif of this.notifications.values()) {
      if (notif.module === module) {
        result.push(this.cloneNotification(notif));
      }
    }
    return result;
  }

  getByRecordId(recordId: string): OSNotification[] {
    const result: OSNotification[] = [];
    for (const notif of this.notifications.values()) {
      if (notif.recordId === recordId) {
        result.push(this.cloneNotification(notif));
      }
    }
    return result;
  }

  markAsRead(id: string): boolean {
    const notif = this.notifications.get(id);
    if (!notif) return false;
    notif.status = 'read';
    return true;
  }

  markAsUnread(id: string): boolean {
    const notif = this.notifications.get(id);
    if (!notif) return false;
    notif.status = 'unread';
    return true;
  }

  markAllAsRead(): void {
    for (const notif of this.notifications.values()) {
      notif.status = 'read';
    }
  }

  get size(): number {
    return this.notifications.size;
  }

  private validateNotification(notification: Readonly<OSNotification>): void {
    if (!notification.id || notification.id.trim() === '') {
      throw new Error('[OSNotificationStore] Notification id must be a non-empty string.');
    }

    if (!CANONICAL_MODULES.has(notification.module)) {
      throw new Error(
        `[OSNotificationStore] Invalid module "${notification.module}" for notification "${notification.id}".`
      );
    }

    if (!CANONICAL_TYPES.has(notification.type)) {
      throw new Error(
        `[OSNotificationStore] Invalid type "${notification.type}" for notification "${notification.id}".`
      );
    }

    if (!CANONICAL_SEVERITIES.has(notification.severity)) {
      throw new Error(
        `[OSNotificationStore] Invalid severity "${notification.severity}" for notification "${notification.id}".`
      );
    }

    if (!CANONICAL_STATUSES.has(notification.status)) {
      throw new Error(
        `[OSNotificationStore] Invalid status "${notification.status}" for notification "${notification.id}".`
      );
    }

    if (!notification.title || notification.title.trim() === '') {
      throw new Error(
        `[OSNotificationStore] Notification "${notification.id}" title must be a non-empty string.`
      );
    }

    if (!notification.message || notification.message.trim() === '') {
      throw new Error(
        `[OSNotificationStore] Notification "${notification.id}" message must be a non-empty string.`
      );
    }

    if (!notification.recordId || notification.recordId.trim() === '') {
      throw new Error(
        `[OSNotificationStore] Notification "${notification.id}" recordId must be a non-empty string.`
      );
    }

    if (!notification.recordType || notification.recordType.trim() === '') {
      throw new Error(
        `[OSNotificationStore] Notification "${notification.id}" recordType must be a non-empty string.`
      );
    }

    if (!notification.timestamp || notification.timestamp.trim() === '' || Number.isNaN(Date.parse(notification.timestamp))) {
      throw new Error(
        `[OSNotificationStore] Notification "${notification.id}" timestamp must be a non-empty parseable timestamp.`
      );
    }

    if (this.notifications.has(notification.id)) {
      throw new Error(
        `[OSNotificationStore] Duplicate notification ID rejected: ${notification.id}`
      );
    }
  }

  private cloneNotification(notif: OSNotification): OSNotification {
    return {
      ...notif,
      metadata: notif.metadata ? structuredClone(notif.metadata) : {},
    };
  }
}

export const osNotificationStore = new OSNotificationStore();