import { describe, it, expect } from '@jest/globals';
import { OSEvent, osEventsRegistry } from '@/data/os/events';
import { SharedContextStore, sharedContextStore } from '../sharedContext';
import { osEventBus } from '../eventBus';

const FIXED_TIMESTAMP = '2026-08-30T10:15:00Z';

function eventById(id: string): OSEvent {
  const event = osEventsRegistry.find((evt) => evt.id === id);
  if (!event) {
    throw new Error(`Canonical event ${id} missing from osEventsRegistry.`);
  }
  return event;
}

export function runSharedContextVerification(): boolean {
  console.log('[SharedContext Verification] Starting checks...');
  let passed = true;

  const testStore = new SharedContextStore();

  // Test 1: Project from real locked OSEvent fixture (EVT-001)
  const sampleEvent = osEventsRegistry[0]; // OBS-001
  const projectedEntry = testStore.projectFromEvent(sampleEvent);

  if (  
    projectedEntry.source.recordId !== 'OBS-001' ||
    projectedEntry.source.module !== 'SIGNAL'
  ) {
    console.error('FAIL: Projection source reference mismatch.');
    passed = false;
  }

  // Test 2: Reference Extraction from Locked OSEvent Fixture (EVT-002)
  const insightEvent = osEventsRegistry[1]; // INS-001 referencing OBS-001
  const projectedInsight = testStore.projectFromEvent(insightEvent);

  if (
    projectedInsight.references.length !== 1 ||
    projectedInsight.references[0].recordId !== 'OBS-001' ||
    projectedInsight.references[0].module !== 'SIGNAL'
  ) {
    console.error('FAIL: Metadata cross-reference extraction failed.');
    passed = false;
  }

  // Test 3: Query by Module
  const signalEntries = testStore.getByModule('SIGNAL');
  if (signalEntries.length !== 2) {
    console.error('FAIL: Query by module returned incorrect count.');
    passed = false;
  }

  // Test 4: Query by Reference (OBS-001 is direct source in EVT-001 & reference in EVT-002)
  const obsReferences = testStore.getByReference('OBS-001');
  if (obsReferences.length !== 2) {
    console.error('FAIL: Query by reference ID failed to aggregate matching records.');
    passed = false;
  }

  // Test 5: Verify strict locked OSEventAction & Actor compliance with valid mock
  const lockedTestEvent: OSEvent = {
    id: 'EVT-LOCK-TEST-01',
    module: 'AI',
    action: 'created', // Valid OSEventAction
    recordId: 'DEC-001',
    recordType: 'decision',
    timestamp: FIXED_TIMESTAMP,
    actor: 'AI-CORE', // Valid established actor
    summary: 'Test decision projection',
    metadata: {
      sourceObservationId: 'OBS-001',
    },
  };

  const projectedLockTest = testStore.projectFromEvent(lockedTestEvent);
  if (!projectedLockTest || projectedLockTest.source.module !== 'AI') {
    console.error('FAIL: Locked-compliant test event failed to project.');
    passed = false;
  }

  // Test 6: Strict immutability check
  projectedEntry.metadata.tampered = true;
  const reFetched = testStore.get(projectedEntry.id);
  if (reFetched?.metadata.tampered === true) {
    console.error('FAIL: Internal context store state was mutated externally.');
    passed = false;
  }

  // Test 7: Singleton instance remains clean and unused until explicitly invoked
  if (sharedContextStore.size !== 0) {
    console.error('FAIL: Singleton store modified prior to explicit calls.');
    passed = false;
  }

  console.log(
    `[SharedContext Verification] Checks complete. Result: ${
      passed ? 'PASSED' : 'FAILED'
    }`
  );
  return passed;
}

describe('Shared Context', () => {
  it('passes shared context projection and query verification against locked events', () => {
    expect(runSharedContextVerification()).toBe(true);
  });

  it('projects canonical EVT-001 into SIGNAL / OBS-001 observation context', () => {
    const store = new SharedContextStore();
    const evt001 = eventById('EVT-001');
    const projected = store.projectFromEvent(evt001);

    expect(projectedEntryIdentity(projected)).toEqual({
      id: 'CTX-EVT-001',
      module: 'SIGNAL',
      recordId: 'OBS-001',
      recordType: 'observation',
    });
    expect(projected.summary).toBe(evt001.summary);
    expect(projected.timestamp).toBe(evt001.timestamp);
    expect(projected.relevance).toBe('high');
    expect(projected.references).toEqual([]);
    expect(store.size).toBe(1);
  });

  it('extracts EVT-002 metadata reference to SIGNAL / OBS-001', () => {
    const store = new SharedContextStore();
    const evt002 = eventById('EVT-002');
    const projected = store.projectFromEvent(evt002);

    expect(projected.source.recordId).toBe('INS-001');
    expect(projected.source.recordType).toBe('insight');
    expect(projected.references).toEqual([
      {
        module: 'SIGNAL',
        recordId: 'OBS-001',
        recordType: 'observation',
      },
    ]);
  });

  it('getByModule returns only entries for the requested module', () => {
    const store = new SharedContextStore();
    store.projectFromEvent(eventById('EVT-001'));
    store.projectFromEvent(eventById('EVT-002'));
    store.projectFromEvent(eventById('EVT-003'));

    const signalEntries = store.getByModule('SIGNAL');
    expect(signalEntries.map((entry) => entry.source.recordId).sort()).toEqual([
      'INS-001',
      'OBS-001',
    ]);
    expect(store.getByModule('AI')).toHaveLength(1);
    expect(store.getByModule('VAULT')).toEqual([]);
  });

  it('getByReference aggregates source and nested reference matches for OBS-001', () => {
    const store = new SharedContextStore();
    store.projectFromEvent(eventById('EVT-001'));
    store.projectFromEvent(eventById('EVT-002'));

    const matches = store.getByReference('OBS-001');
    expect(matches).toHaveLength(2);
    expect(matches.map((entry) => entry.id).sort()).toEqual([
      'CTX-EVT-001',
      'CTX-EVT-002',
    ]);
  });

  it('register inserts and later updates the same entry id', () => {
    const store = new SharedContextStore();
    const first = store.projectFromEvent(eventById('EVT-001'));
    expect(store.get(first.id)?.summary).toBe(eventById('EVT-001').summary);

    store.register({
      ...first,
      summary: 'Updated observation context',
      relevance: 'low',
    });

    const updated = store.get(first.id);
    expect(store.size).toBe(1);
    expect(updated?.summary).toBe('Updated observation context');
    expect(updated?.relevance).toBe('low');
    expect(updated?.source.recordId).toBe('OBS-001');
  });

  it('returned entries are defensively cloned from store state', () => {
    const store = new SharedContextStore();
    const projected = store.projectFromEvent(eventById('EVT-001'));
    projected.summary = 'mutated-summary';
    projected.source.recordId = 'OBS-MUTATED';

    const fetched = store.get(projected.id);
    expect(fetched?.summary).toBe(eventById('EVT-001').summary);
    expect(fetched?.source.recordId).toBe('OBS-001');
    expect(fetched).not.toBe(projected);
  });

  it('isolates nested metadata on returned entries', () => {
    const store = new SharedContextStore();
    const projected = store.projectFromEvent(eventById('EVT-001'));
    projected.metadata.tampered = true;
    projected.metadata.severity = 'low';

    const fetched = store.get(projected.id);
    expect(fetched?.metadata.tampered).toBeUndefined();
    expect(fetched?.metadata.severity).toBe('high');
  });

  it('isolates nested references on returned entries', () => {
    const store = new SharedContextStore();
    const projected = store.projectFromEvent(eventById('EVT-002'));
    expect(projected.references[0]).toBeDefined();
    projected.references[0].recordId = 'OBS-MUTATED';
    projected.references.pop();

    const fetched = store.get(projected.id);
    expect(fetched?.references).toEqual([
      {
        module: 'SIGNAL',
        recordId: 'OBS-001',
        recordType: 'observation',
      },
    ]);
  });

  it('empty store queries return empty results', () => {
    const store = new SharedContextStore();
    expect(store.size).toBe(0);
    expect(store.getAll()).toEqual([]);
    expect(store.get('CTX-EVT-001')).toBeUndefined();
    expect(store.getByModule('SIGNAL')).toEqual([]);
    expect(store.getByReference('OBS-001')).toEqual([]);
  });

  it('rejects invalid OSEvent.recordType at the projection boundary', () => {
    const store = new SharedContextStore();
    const invalidEvent: OSEvent = {
      id: 'EVT-INVALID-RECORD-TYPE',
      module: 'SIGNAL',
      action: 'created',
      recordId: 'OBS-001',
      recordType: 'not-a-shared-context-record-type',
      timestamp: FIXED_TIMESTAMP,
      actor: 'SIGNAL-ENGINE',
      summary: 'Invalid record type must not project',
      metadata: {},
    };

    expect(() => store.projectFromEvent(invalidEvent)).toThrow(
      '[SharedContextStore] Invalid OSEvent.recordType "not-a-shared-context-record-type" cannot be projected into SharedContextEntry.'
    );
    expect(store.size).toBe(0);
    expect(store.getAll()).toEqual([]);
  });

  it('projection is deterministic for the same canonical event', () => {
    const storeA = new SharedContextStore();
    const storeB = new SharedContextStore();
    const evt001 = eventById('EVT-001');

    const first = storeA.projectFromEvent(evt001);
    const second = storeA.projectFromEvent(evt001);
    const independent = storeB.projectFromEvent(evt001);

    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(independent));
    expect(storeA.size).toBe(1);
  });

  it('singleton remains clean until explicitly invoked', () => {
    expect(sharedContextStore.size).toBe(0);
    const isolated = new SharedContextStore();
    isolated.projectFromEvent(eventById('EVT-001'));
    expect(sharedContextStore.size).toBe(0);
  });

  it('importing and using Shared Context does not attach Event Bus listeners', () => {
    const initialListenerCount = osEventBus.listenerCount;
    const store = new SharedContextStore();
    store.projectFromEvent(eventById('EVT-001'));
    store.getByModule('SIGNAL');
    store.getByReference('OBS-001');
    expect(osEventBus.listenerCount).toBe(initialListenerCount);
    expect(osEventBus.listenerCount).toBe(0);
  });
});

function projectedEntryIdentity(entry: {
  id: string;
  source: { module: string; recordId: string; recordType: string };
}): {
  id: string;
  module: string;
  recordId: string;
  recordType: string;
} {
  return {
    id: entry.id,
    module: entry.source.module,
    recordId: entry.source.recordId,
    recordType: entry.source.recordType,
  };
}
