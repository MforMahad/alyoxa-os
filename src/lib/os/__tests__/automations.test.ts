import { describe, it, expect } from '@jest/globals';
import { OSEventAction } from '../../../data/os/events';
import {
  OSAutomation,
  OSAutomationStore,
  osAutomationStore,
  osAutomationsRegistry,
} from '../automations';

const CANONICAL_IDS = ['AUTO-001', 'AUTO-002', 'AUTO-003', 'AUTO-004'] as const;

const CANONICAL_EVENT_ACTIONS = new Set<OSEventAction>([
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

function cloneCanonical(id: string): OSAutomation {
  const found = osAutomationsRegistry.find((auto) => auto.id === id);
  if (!found) {
    throw new Error(`Canonical automation ${id} missing from registry.`);
  }
  return structuredClone(found);
}

export function runOSAutomationsVerification(): boolean {
  console.log('[OS Automations Final Audit] Verification starting...');
  let passed = true;

  const forbiddenConcepts = [
    'recorded',
    'registered',
    'indexing',
    'adjustment',
    'storageScope',
    'onboarding_docs',
  ];

  // 1. Check Canonical 12.1 OSEventAction Union Compliance
  for (const auto of osAutomationsRegistry) {
    if (auto.trigger.eventAction) {
      if (!CANONICAL_EVENT_ACTIONS.has(auto.trigger.eventAction)) {
        console.error(
          `FAIL: ${auto.id} uses non-canonical trigger eventAction "${auto.trigger.eventAction}".`
        );
        passed = false;
      }
    }
  }

  // 2. Check for Neutralized & Removed Unverified Concepts
  for (const auto of osAutomationsRegistry) {
    const serialized = JSON.stringify(auto);
    for (const concept of forbiddenConcepts) {
      if (serialized.includes(concept)) {
        console.error(
          `FAIL: ${auto.id} contains unverified/non-canonical concept "${concept}".`
        );
        passed = false;
      }
    }
  }

  // 3. Isolated Store Immutability & Operational Checks
  const testStore = new OSAutomationStore(osAutomationsRegistry);

  if (testStore.size !== osAutomationsRegistry.length) {
    console.error('FAIL: Store size mismatch.');
    passed = false;
  }

  const queried = testStore.getAutomation('AUTO-001');
  if (queried) {
    queried.actions[0].parameters.leak = true;
    if (testStore.getAutomation('AUTO-001')?.actions[0].parameters.leak === true) {
      console.error('FAIL: Immutability breach in getAutomation.');
      passed = false;
    }
  }

  testStore.updateStatus('AUTO-001', 'paused');
  if (osAutomationsRegistry[0].status !== 'active') {
    console.error('FAIL: Canonical registry mutated.');
    passed = false;
  }

  console.log(
    `[OS Automations Final Audit] Verification complete. Result: ${
      passed ? 'PASSED' : 'FAILED'
    }`
  );
  return passed;
}

describe('OS Automations', () => {
  it('passes canonical automation registry and store verification', () => {
    expect(runOSAutomationsVerification()).toBe(true);
  });

  it('canonical fixtures are structurally valid and remain declarative', () => {
    expect(osAutomationsRegistry).toHaveLength(4);
    expect(osAutomationsRegistry.map((auto) => auto.id)).toEqual([...CANONICAL_IDS]);
    expect(osAutomationStore.size).toBe(4);

    for (const auto of osAutomationsRegistry) {
      expect(auto.trigger).toEqual(expect.objectContaining({ type: 'event' }));
      expect(Array.isArray(auto.conditions)).toBe(true);
      expect(Array.isArray(auto.actions)).toBe(true);
      expect(auto.actions.length).toBeGreaterThan(0);
      if (auto.trigger.eventAction) {
        expect(CANONICAL_EVENT_ACTIONS.has(auto.trigger.eventAction)).toBe(true);
      }
    }
  });

  it('rejects duplicate automation IDs instead of silently overwriting', () => {
    const isolated = new OSAutomationStore([]);
    isolated.addAutomation(cloneCanonical('AUTO-001'));
    expect(isolated.size).toBe(1);

    expect(() => isolated.addAutomation(cloneCanonical('AUTO-001'))).toThrow(
      '[OSAutomationStore] Duplicate automation ID rejected: AUTO-001'
    );
    expect(isolated.size).toBe(1);
    expect(isolated.getAutomation('AUTO-001')?.ownerModule).toBe('SIGNAL');
  });

  it('rejects invalid runtime module, status, trigger, and action values', () => {
    const isolated = new OSAutomationStore([]);

    const invalidStatus = cloneCanonical('AUTO-001');
    Reflect.set(invalidStatus, 'status', 'running');
    expect(() => isolated.addAutomation(invalidStatus)).toThrow(
      '[OSAutomationStore] Invalid status "running" for automation "AUTO-001".'
    );

    const invalidOwner = cloneCanonical('AUTO-002');
    invalidOwner.id = 'AUTO-INVALID-OWNER';
    Reflect.set(invalidOwner, 'ownerModule', 'INVALID_MODULE');
    expect(() => isolated.addAutomation(invalidOwner)).toThrow(
      '[OSAutomationStore] Invalid ownerModule "INVALID_MODULE" for automation "AUTO-INVALID-OWNER".'
    );

    const invalidTriggerType = cloneCanonical('AUTO-003');
    invalidTriggerType.id = 'AUTO-INVALID-TRIGGER';
    Reflect.set(invalidTriggerType.trigger, 'type', 'schedule');
    expect(() => isolated.addAutomation(invalidTriggerType)).toThrow(
      '[OSAutomationStore] Invalid trigger type "schedule" for automation "AUTO-INVALID-TRIGGER".'
    );

    const invalidEventAction = cloneCanonical('AUTO-001');
    invalidEventAction.id = 'AUTO-INVALID-ACTION-EVENT';
    Reflect.set(invalidEventAction.trigger, 'eventAction', 'recorded');
    expect(() => isolated.addAutomation(invalidEventAction)).toThrow(
      '[OSAutomationStore] Automation "AUTO-INVALID-ACTION-EVENT" trigger eventAction "recorded" is not a canonical OSEventAction.'
    );

    const invalidActionType = cloneCanonical('AUTO-002');
    invalidActionType.id = 'AUTO-INVALID-ACTION-TYPE';
    Reflect.set(invalidActionType.actions[0], 'type', 'execute_forge');
    expect(() => isolated.addAutomation(invalidActionType)).toThrow(
      '[OSAutomationStore] Invalid action type "execute_forge" for automation "AUTO-INVALID-ACTION-TYPE".'
    );

    expect(isolated.size).toBe(0);
  });

  it('rejects a malformed nested trigger', () => {
    const isolated = new OSAutomationStore([]);
    const missingTrigger = cloneCanonical('AUTO-001');
    missingTrigger.id = 'AUTO-NULL-TRIGGER';
    Reflect.set(missingTrigger, 'trigger', null);
    expect(() => isolated.addAutomation(missingTrigger)).toThrow(
      '[OSAutomationStore] Automation "AUTO-NULL-TRIGGER" trigger must be a valid object.'
    );

    const emptyRecordType = cloneCanonical('AUTO-001');
    emptyRecordType.id = 'AUTO-EMPTY-RECORD-TYPE';
    emptyRecordType.trigger.recordType = '';
    expect(() => isolated.addAutomation(emptyRecordType)).toThrow(
      '[OSAutomationStore] Automation "AUTO-EMPTY-RECORD-TYPE" trigger recordType must be a non-empty string when supplied.'
    );

    const emptyCondition = cloneCanonical('AUTO-004');
    emptyCondition.id = 'AUTO-EMPTY-TRIGGER-CONDITION';
    emptyCondition.trigger.condition = '   ';
    expect(() => isolated.addAutomation(emptyCondition)).toThrow(
      '[OSAutomationStore] Automation "AUTO-EMPTY-TRIGGER-CONDITION" trigger condition must be a non-empty string when supplied.'
    );
    expect(isolated.size).toBe(0);
  });

  it('rejects malformed conditions', () => {
    const isolated = new OSAutomationStore([]);
    const notArray = cloneCanonical('AUTO-001');
    notArray.id = 'AUTO-BAD-COND-ARRAY';
    Reflect.set(notArray, 'conditions', { field: 'metric' });
    expect(() => isolated.addAutomation(notArray)).toThrow(
      '[OSAutomationStore] Automation "AUTO-BAD-COND-ARRAY" conditions must be an array.'
    );

    const emptyField = cloneCanonical('AUTO-001');
    emptyField.id = 'AUTO-EMPTY-FIELD';
    emptyField.conditions[0].field = '';
    expect(() => isolated.addAutomation(emptyField)).toThrow(
      '[OSAutomationStore] Automation "AUTO-EMPTY-FIELD" condition field must be a non-empty string.'
    );

    const emptyOperator = cloneCanonical('AUTO-002');
    emptyOperator.id = 'AUTO-EMPTY-OPERATOR';
    emptyOperator.conditions[0].operator = '';
    expect(() => isolated.addAutomation(emptyOperator)).toThrow(
      '[OSAutomationStore] Automation "AUTO-EMPTY-OPERATOR" condition operator must be a non-empty string.'
    );
    expect(isolated.size).toBe(0);
  });

  it('rejects malformed actions', () => {
    const isolated = new OSAutomationStore([]);
    const notArray = cloneCanonical('AUTO-001');
    notArray.id = 'AUTO-BAD-ACTION-ARRAY';
    Reflect.set(notArray, 'actions', null);
    expect(() => isolated.addAutomation(notArray)).toThrow(
      '[OSAutomationStore] Automation "AUTO-BAD-ACTION-ARRAY" actions must be an array.'
    );

    const badParameters = cloneCanonical('AUTO-001');
    badParameters.id = 'AUTO-BAD-PARAMS';
    Reflect.set(badParameters.actions[0], 'parameters', ['not-an-object']);
    expect(() => isolated.addAutomation(badParameters)).toThrow(
      '[OSAutomationStore] Automation "AUTO-BAD-PARAMS" action parameters must be a valid object.'
    );

    const invalidActionModule = cloneCanonical('AUTO-003');
    invalidActionModule.id = 'AUTO-INVALID-ACTION-MODULE';
    Reflect.set(invalidActionModule.actions[0], 'module', 'QUEUE');
    expect(() => isolated.addAutomation(invalidActionModule)).toThrow(
      '[OSAutomationStore] Invalid action module "QUEUE" for automation "AUTO-INVALID-ACTION-MODULE".'
    );
    expect(isolated.size).toBe(0);
  });

  it('getAutomation() results cannot mutate internal state', () => {
    const store = new OSAutomationStore(osAutomationsRegistry);
    const fetched = store.getAutomation('AUTO-001');
    expect(fetched).toBeDefined();
    if (!fetched) {
      throw new Error('AUTO-001 missing from store.');
    }
    fetched.actions[0].parameters.leak = true;
    fetched.name = 'mutated';
    fetched.conditions[0].field = 'mutated';

    const reFetched = store.getAutomation('AUTO-001');
    expect(reFetched?.actions[0].parameters.leak).toBeUndefined();
    expect(reFetched?.name).toBe('Telemetry Latency Observation Notification Intent');
    expect(reFetched?.conditions[0].field).toBe('metric');
  });

  it('getAll() results cannot mutate internal state', () => {
    const store = new OSAutomationStore(osAutomationsRegistry);
    const all = store.getAll();
    all[0].metadata.tampered = true;
    all.pop();

    expect(store.size).toBe(4);
    expect(store.getAll().map((auto) => auto.id)).toEqual([...CANONICAL_IDS]);
    expect(store.getAutomation('AUTO-001')?.metadata.tampered).toBeUndefined();
  });

  it('getActive() returns only active automations', () => {
    const store = new OSAutomationStore(osAutomationsRegistry);
    expect(store.getActive().map((auto) => auto.id)).toEqual([
      'AUTO-001',
      'AUTO-002',
      'AUTO-003',
    ]);
    store.updateStatus('AUTO-001', 'paused');
    expect(store.getActive().map((auto) => auto.id)).toEqual(['AUTO-002', 'AUTO-003']);
  });

  it('getByOwnerModule() returns only automations for that owner', () => {
    const store = new OSAutomationStore(osAutomationsRegistry);
    expect(store.getByOwnerModule('SIGNAL').map((auto) => auto.id)).toEqual(['AUTO-001']);
    expect(store.getByOwnerModule('VAULT').map((auto) => auto.id)).toEqual(['AUTO-004']);
    expect(store.getByOwnerModule('PULSE')).toEqual([]);
  });

  it('unknown IDs return expected results', () => {
    const store = new OSAutomationStore(osAutomationsRegistry);
    expect(store.getAutomation('NON-EXISTENT-ID')).toBeUndefined();
    expect(store.updateStatus('NON-EXISTENT-ID', 'paused')).toBe(false);
  });

  it('updateStatus() changes only the target and writes updatedAt', () => {
    const store = new OSAutomationStore(osAutomationsRegistry);
    const before = store.getAutomation('AUTO-001');
    expect(before?.status).toBe('active');

    expect(store.updateStatus('AUTO-001', 'paused')).toBe(true);
    const after = store.getAutomation('AUTO-001');
    expect(after?.status).toBe('paused');
    expect(after?.updatedAt).not.toBe(before?.updatedAt);
    expect(Number.isNaN(Date.parse(after?.updatedAt ?? ''))).toBe(false);
    expect(store.getAutomation('AUTO-002')?.status).toBe('active');
  });

  it('canonical registry remains isolated from store mutations', () => {
    const snapshot = JSON.stringify(osAutomationsRegistry);
    const store = new OSAutomationStore(osAutomationsRegistry);
    store.updateStatus('AUTO-001', 'disabled');
    const fetched = store.getAutomation('AUTO-004');
    if (fetched) {
      fetched.metadata.tampered = true;
    }

    expect(osAutomationsRegistry[0].status).toBe('active');
    expect(JSON.stringify(osAutomationsRegistry)).toBe(snapshot);
  });

  it('custom store initialization is isolated from the canonical singleton', () => {
    const custom = cloneCanonical('AUTO-004');
    custom.id = 'AUTO-CUSTOM-001';
    const isolated = new OSAutomationStore([custom]);

    expect(isolated.size).toBe(1);
    expect(isolated.getAutomation('AUTO-CUSTOM-001')?.ownerModule).toBe('VAULT');
    expect(isolated.getAutomation('AUTO-001')).toBeUndefined();
    expect(osAutomationStore.size).toBe(4);
    expect(osAutomationStore.getAutomation('AUTO-CUSTOM-001')).toBeUndefined();
    expect(osAutomationStore.getAutomation('AUTO-004')?.id).toBe('AUTO-004');
  });
});
