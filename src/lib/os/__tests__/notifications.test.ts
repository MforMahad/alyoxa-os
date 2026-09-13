import { describe, it, expect } from '@jest/globals';
import {
  OSNotification,
  OSNotificationStore,
  osNotificationStore,
  osNotificationsRegistry,
  OSNotificationModule,
  OSNotificationSeverity,
  OSNotificationStatus,
  OSNotificationType,
} from '../notifications';

const CANONICAL_IDS = [
  'NOTIF-001',
  'NOTIF-002',
  'NOTIF-003',
  'NOTIF-004',
  'NOTIF-005',
  'NOTIF-006',
  'NOTIF-007',
  'NOTIF-008',
  'NOTIF-009',
] as const;

function cloneCanonical(id: string): OSNotification {
  const found = osNotificationsRegistry.find((notif) => notif.id === id);
  if (!found) {
    throw new Error(`Canonical notification ${id} missing from registry.`);
  }
  return {
    ...found,
    metadata: structuredClone(found.metadata),
  };
}

export function runOSNotificationsVerification(): boolean {
  console.log('[OS Notifications Final Verification] Running exhaustive checks...');
  let passed = true;

  const validModules = new Set<OSNotificationModule>([
    'SIGNAL',
    'AI',
    'FORGE',
    'PULSE',
    'VAULT',
    'SYSTEM',
  ]);

  const validTypes = new Set<OSNotificationType>([
    'event',
    'approval',
    'attention',
    'completion',
    'failure',
    'system',
  ]);

  const validSeverities = new Set<OSNotificationSeverity>([
    'info',
    'success',
    'warning',
    'error',
  ]);

  const validStatuses = new Set<OSNotificationStatus>([
    'read',
    'unread',
  ]);

  const establishedRecordIds = new Set([
    'OBS-001',
    'INS-001',
    'DEC-001',
    'RUN-001',
    'TASK-001',
    'REC-001',
    'REQ-001',
    'ITEM-001',
    'KNOW-001',
  ]);

  // 1. Registry non-empty check
  if (osNotificationsRegistry.length === 0) {
    console.error('FAIL: Registry is empty.');
    passed = false;
  }

  // 2. Structural & Field Validation
  for (const notif of osNotificationsRegistry) {
    if (!validModules.has(notif.module)) {
      console.error(`FAIL: Invalid module "${notif.module}" in ${notif.id}`);
      passed = false;
    }
    if (!validTypes.has(notif.type)) {
      console.error(`FAIL: Invalid type "${notif.type}" in ${notif.id}`);
      passed = false;
    }
    if (!validSeverities.has(notif.severity)) {
      console.error(`FAIL: Invalid severity "${notif.severity}" in ${notif.id}`);
      passed = false;
    }
    if (!validStatuses.has(notif.status)) {
      console.error(`FAIL: Invalid status "${notif.status}" in ${notif.id}`);
      passed = false;
    }
    if (!notif.title || notif.title.trim() === '') {
      console.error(`FAIL: Empty title in ${notif.id}`);
      passed = false;
    }
    if (!notif.message || notif.message.trim() === '') {
      console.error(`FAIL: Empty message in ${notif.id}`);
      passed = false;
    }
    if (!notif.recordType || notif.recordType.trim() === '') {
      console.error(`FAIL: Empty recordType in ${notif.id}`);
      passed = false;
    }
    if (!notif.timestamp || Number.isNaN(Date.parse(notif.timestamp))) {
      console.error(`FAIL: Invalid parseable timestamp in ${notif.id}`);
      passed = false;
    }
    if (!establishedRecordIds.has(notif.recordId)) {
      console.error(
        `FAIL: recordId "${notif.recordId}" in ${notif.id} is not an established OS record.`
      );
      passed = false;
    }
  }

  // 3. Specific Alignment Checks for NOTIF-002 and NOTIF-007
  const notif002 = osNotificationsRegistry.find((n) => n.id === 'NOTIF-002');
  if (notif002?.type !== 'event' || notif002?.severity !== 'info') {
    console.error('FAIL: NOTIF-002 must be type "event" and severity "info".');
    passed = false;
  }

  const notif007 = osNotificationsRegistry.find((n) => n.id === 'NOTIF-007');
  if (notif007?.type !== 'event' || notif007?.severity !== 'info') {
    console.error('FAIL: NOTIF-007 must be type "event" and severity "info".');
    passed = false;
  }

  // 4. Singleton store size match
  if (osNotificationStore.size !== osNotificationsRegistry.length) {
    console.error('FAIL: Singleton store size does not match registry length.');
    passed = false;
  }

  // Use a fresh isolated store for state change tests
  const freshStore = new OSNotificationStore(osNotificationsRegistry);

  // 5. markAsRead changes ONLY requested notification
  const targetId = 'NOTIF-001';
  const untouchedId = 'NOTIF-002';

  freshStore.markAsRead(targetId);
  if (
    freshStore.getNotification(targetId)?.status !== 'read' ||
    freshStore.getNotification(untouchedId)?.status !== 'unread'
  ) {
    console.error('FAIL: markAsRead did not mutate only the target notification.');
    passed = false;
  }

  // 6. markAsUnread restores requested notification
  freshStore.markAsUnread(targetId);
  if (freshStore.getNotification(targetId)?.status !== 'unread') {
    console.error('FAIL: markAsUnread failed to restore status.');
    passed = false;
  }

  // 7 & 8. Unknown notification ID returns false for markAsRead / markAsUnread
  if (freshStore.markAsRead('NON-EXISTENT-ID') !== false) {
    console.error('FAIL: markAsRead for unknown ID did not return false.');
    passed = false;
  }
  if (freshStore.markAsUnread('NON-EXISTENT-ID') !== false) {
    console.error('FAIL: markAsUnread for unknown ID did not return false.');
    passed = false;
  }

  // 9. getAll() returned objects cannot mutate internal state
  const allList = freshStore.getAll();
  allList[0].metadata.tampered = true;
  if (freshStore.getNotification(allList[0].id)?.metadata.tampered === true) {
    console.error('FAIL: getAll() exposed mutable internal objects.');
    passed = false;
  }

  // 10. getUnread() returned objects cannot mutate internal state
  const unreadList = freshStore.getUnread();
  if (unreadList.length > 0) {
    unreadList[0].metadata.tampered = true;
    if (freshStore.getNotification(unreadList[0].id)?.metadata.tampered === true) {
      console.error('FAIL: getUnread() exposed mutable internal objects.');
      passed = false;
    }
  }

  // 11. getByModule() returned objects cannot mutate internal state
  const moduleList = freshStore.getByModule('SIGNAL');
  if (moduleList.length > 0) {
    moduleList[0].metadata.tampered = true;
    if (freshStore.getNotification(moduleList[0].id)?.metadata.tampered === true) {
      console.error('FAIL: getByModule() exposed mutable internal objects.');
      passed = false;
    }
  }

  // 12. getByRecordId() returned objects cannot mutate internal state
  const recordList = freshStore.getByRecordId('OBS-001');
  if (recordList.length > 0) {
    recordList[0].metadata.tampered = true;
    if (freshStore.getNotification(recordList[0].id)?.metadata.tampered === true) {
      console.error('FAIL: getByRecordId() exposed mutable internal objects.');
      passed = false;
    }
  }

  // 13. Canonical registry remains unchanged after store state mutations
  const originalMetadataCount = Object.keys(osNotificationsRegistry[0].metadata).length;
  freshStore.markAllAsRead();
  if (
    Object.keys(osNotificationsRegistry[0].metadata).length !== originalMetadataCount ||
    osNotificationsRegistry[0].status !== 'unread'
  ) {
    console.error('FAIL: Store mutations leaked into canonical osNotificationsRegistry.');
    passed = false;
  }

  console.log(
    `[OS Notifications Final Verification] Checks complete. Result: ${
      passed ? 'PASSED' : 'FAILED'
    }`
  );
  return passed;
}

describe('OS Notifications', () => {
  it('passes canonical notification registry and store verification', () => {
    expect(runOSNotificationsVerification()).toBe(true);
  });

  it('canonical registry and singleton store stay synchronized', () => {
    expect(osNotificationsRegistry).toHaveLength(9);
    expect(osNotificationsRegistry.map((notif) => notif.id)).toEqual([...CANONICAL_IDS]);
    expect(osNotificationStore.size).toBe(osNotificationsRegistry.length);
    expect(osNotificationStore.getAll().map((notif) => notif.id)).toEqual([...CANONICAL_IDS]);
  });

  it('rejects duplicate notification IDs instead of silently overwriting', () => {
    const isolated = new OSNotificationStore([]);
    isolated.addNotification(cloneCanonical('NOTIF-001'));
    expect(isolated.size).toBe(1);

    expect(() => isolated.addNotification(cloneCanonical('NOTIF-001'))).toThrow(
      '[OSNotificationStore] Duplicate notification ID rejected: NOTIF-001'
    );
    expect(isolated.size).toBe(1);
    expect(isolated.getNotification('NOTIF-001')?.recordId).toBe('OBS-001');

    expect(
      () =>
        new OSNotificationStore([cloneCanonical('NOTIF-002'), cloneCanonical('NOTIF-002')])
    ).toThrow('[OSNotificationStore] Duplicate notification ID rejected: NOTIF-002');
  });

  it('rejects empty identity fields at the store boundary', () => {
    const isolated = new OSNotificationStore([]);
    const base = cloneCanonical('NOTIF-001');

    expect(() => isolated.addNotification({ ...base, id: '' })).toThrow(
      '[OSNotificationStore] Notification id must be a non-empty string.'
    );
    expect(() => isolated.addNotification({ ...base, id: 'NOTIF-EMPTY-TITLE', title: '   ' })).toThrow(
      '[OSNotificationStore] Notification "NOTIF-EMPTY-TITLE" title must be a non-empty string.'
    );
    expect(() => isolated.addNotification({ ...base, id: 'NOTIF-EMPTY-MSG', message: '' })).toThrow(
      '[OSNotificationStore] Notification "NOTIF-EMPTY-MSG" message must be a non-empty string.'
    );
    expect(() => isolated.addNotification({ ...base, id: 'NOTIF-EMPTY-REC', recordId: '' })).toThrow(
      '[OSNotificationStore] Notification "NOTIF-EMPTY-REC" recordId must be a non-empty string.'
    );
    expect(() => isolated.addNotification({ ...base, id: 'NOTIF-EMPTY-TYPE', recordType: '' })).toThrow(
      '[OSNotificationStore] Notification "NOTIF-EMPTY-TYPE" recordType must be a non-empty string.'
    );
    expect(() => isolated.addNotification({ ...base, id: 'NOTIF-EMPTY-TS', timestamp: '' })).toThrow(
      '[OSNotificationStore] Notification "NOTIF-EMPTY-TS" timestamp must be a non-empty parseable timestamp.'
    );
    expect(() => isolated.addNotification({ ...base, id: 'NOTIF-BAD-TS', timestamp: 'not-a-timestamp' })).toThrow(
      '[OSNotificationStore] Notification "NOTIF-BAD-TS" timestamp must be a non-empty parseable timestamp.'
    );
    expect(isolated.size).toBe(0);
  });

  it('rejects invalid enum-like runtime values at the store boundary', () => {
    const isolated = new OSNotificationStore([]);

    const invalidModule = cloneCanonical('NOTIF-001');
    Reflect.set(invalidModule, 'module', 'INVALID_MODULE');
    expect(() => isolated.addNotification(invalidModule)).toThrow(
      '[OSNotificationStore] Invalid module "INVALID_MODULE" for notification "NOTIF-001".'
    );

    const invalidType = cloneCanonical('NOTIF-002');
    invalidType.id = 'NOTIF-INVALID-TYPE';
    Reflect.set(invalidType, 'type', 'not_a_notification_type');
    expect(() => isolated.addNotification(invalidType)).toThrow(
      '[OSNotificationStore] Invalid type "not_a_notification_type" for notification "NOTIF-INVALID-TYPE".'
    );

    const invalidSeverity = cloneCanonical('NOTIF-003');
    invalidSeverity.id = 'NOTIF-INVALID-SEV';
    Reflect.set(invalidSeverity, 'severity', 'critical');
    expect(() => isolated.addNotification(invalidSeverity)).toThrow(
      '[OSNotificationStore] Invalid severity "critical" for notification "NOTIF-INVALID-SEV".'
    );

    const invalidStatus = cloneCanonical('NOTIF-004');
    invalidStatus.id = 'NOTIF-INVALID-STATUS';
    Reflect.set(invalidStatus, 'status', 'archived');
    expect(() => isolated.addNotification(invalidStatus)).toThrow(
      '[OSNotificationStore] Invalid status "archived" for notification "NOTIF-INVALID-STATUS".'
    );

    expect(isolated.size).toBe(0);
  });

  it('defensively clones results from every getter', () => {
    const store = new OSNotificationStore(osNotificationsRegistry);

    const byId = store.getNotification('NOTIF-001');
    expect(byId).toBeDefined();
    if (!byId) {
      throw new Error('NOTIF-001 missing from store.');
    }
    byId.metadata.tampered = true;
    byId.title = 'mutated';
    expect(store.getNotification('NOTIF-001')?.metadata.tampered).toBeUndefined();
    expect(store.getNotification('NOTIF-001')?.title).toBe('Telemetry Observation Recorded');

    const all = store.getAll();
    all[0].metadata.tampered = true;
    expect(store.getNotification(all[0].id)?.metadata.tampered).toBeUndefined();

    const unread = store.getUnread();
    unread[0].metadata.tampered = true;
    expect(store.getNotification(unread[0].id)?.metadata.tampered).toBeUndefined();

    const byModule = store.getByModule('SIGNAL');
    byModule[0].metadata.tampered = true;
    expect(store.getNotification(byModule[0].id)?.metadata.tampered).toBeUndefined();

    const byRecord = store.getByRecordId('OBS-001');
    byRecord[0].metadata.tampered = true;
    expect(store.getNotification(byRecord[0].id)?.metadata.tampered).toBeUndefined();
  });

  it('markAsRead changes only the target notification', () => {
    const store = new OSNotificationStore(osNotificationsRegistry);
    const before = store.getAll().map((notif) => ({ id: notif.id, status: notif.status }));

    expect(store.markAsRead('NOTIF-001')).toBe(true);
    expect(store.getNotification('NOTIF-001')?.status).toBe('read');
    expect(store.getNotification('NOTIF-002')?.status).toBe('unread');

    for (const snapshot of before) {
      if (snapshot.id === 'NOTIF-001') {
        continue;
      }
      expect(store.getNotification(snapshot.id)?.status).toBe(snapshot.status);
    }
  });

  it('markAsUnread changes only the target notification', () => {
    const store = new OSNotificationStore(osNotificationsRegistry);
    expect(store.getNotification('NOTIF-004')?.status).toBe('read');
    expect(store.getNotification('NOTIF-006')?.status).toBe('read');

    expect(store.markAsUnread('NOTIF-004')).toBe(true);
    expect(store.getNotification('NOTIF-004')?.status).toBe('unread');
    expect(store.getNotification('NOTIF-006')?.status).toBe('read');
    expect(store.getNotification('NOTIF-001')?.status).toBe('unread');
  });

  it('markAllAsRead updates store state without mutating canonical fixtures', () => {
    const snapshot = JSON.stringify(osNotificationsRegistry);
    const store = new OSNotificationStore(osNotificationsRegistry);

    store.markAllAsRead();
    expect(store.getUnread()).toEqual([]);
    expect(store.getAll().every((notif) => notif.status === 'read')).toBe(true);
    expect(osNotificationsRegistry[0].status).toBe('unread');
    expect(JSON.stringify(osNotificationsRegistry)).toBe(snapshot);
  });

  it('unknown IDs return expected results', () => {
    const store = new OSNotificationStore(osNotificationsRegistry);
    expect(store.getNotification('NON-EXISTENT-ID')).toBeUndefined();
    expect(store.markAsRead('NON-EXISTENT-ID')).toBe(false);
    expect(store.markAsUnread('NON-EXISTENT-ID')).toBe(false);
    expect(store.getByRecordId('NON-EXISTENT-ID')).toEqual([]);
  });

  it('custom store initialization is isolated from the canonical singleton', () => {
    const custom = {
      ...cloneCanonical('NOTIF-005'),
      id: 'NOTIF-CUSTOM-001',
    };
    const isolated = new OSNotificationStore([custom]);

    expect(isolated.size).toBe(1);
    expect(isolated.getNotification('NOTIF-CUSTOM-001')?.recordId).toBe('TASK-001');
    expect(isolated.getNotification('NOTIF-001')).toBeUndefined();
    expect(osNotificationStore.size).toBe(9);
    expect(osNotificationStore.getNotification('NOTIF-CUSTOM-001')).toBeUndefined();
    expect(osNotificationStore.getNotification('NOTIF-005')?.id).toBe('NOTIF-005');
  });
});
