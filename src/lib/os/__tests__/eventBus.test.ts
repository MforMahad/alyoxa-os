import { describe, it, expect } from '@jest/globals';
import { OSEvent, osEventsRegistry } from '@/data/os/events';
import { osEventBus, OSEventBus } from '../eventBus';

const FIXED_TIMESTAMP = '2026-08-30T09:45:00Z';

const mockEvent: OSEvent = {
  id: 'EVT-TEST-001',
  module: 'SYSTEM',
  action: 'started',
  recordId: 'SYS-001',
  recordType: 'test',
  timestamp: FIXED_TIMESTAMP,
  actor: 'SYSTEM',
  summary: 'Verification test event',
  metadata: {},
};

const nextEvent: OSEvent = {
  id: 'EVT-TEST-002',
  module: 'SYSTEM',
  action: 'updated',
  recordId: 'SYS-001',
  recordType: 'test',
  timestamp: FIXED_TIMESTAMP,
  actor: 'SYSTEM',
  summary: 'Follow-up verification test event',
  metadata: {},
};

export function runEventBusVerification(): boolean {
  console.log('[OSEventBus Verification] Starting checks...');
  let passed = true;

  const testBus = new OSEventBus();

  // Test 1: Single subscriber receives event
  let receivedEvent1: OSEvent | null = null;
  const listener1 = (event: OSEvent) => {
    receivedEvent1 = event;
  };
  testBus.subscribe(listener1);

  testBus.publish(mockEvent);

  if (receivedEvent1 !== mockEvent) {
    console.error('FAIL: Subscriber 1 did not receive published event');
    passed = false;
  }

  // Test 2: Multiple subscribers receive same event
  let receivedEvent2: OSEvent | null = null;
  const listener2 = (event: OSEvent) => {
    receivedEvent2 = event;
  };
  testBus.subscribe(listener2);

  testBus.publish(mockEvent);

  if (receivedEvent1 !== mockEvent || receivedEvent2 !== mockEvent) {
    console.error('FAIL: Multiple subscribers failed to receive event');
    passed = false;
  }

  // Test 3: Duplicate subscription prevention
  let deliveryCount = 0;
  const countingListener = () => {
    deliveryCount++;
  };
  testBus.subscribe(countingListener);
  testBus.subscribe(countingListener); // Duplicate call

  testBus.publish(mockEvent);

  if (deliveryCount !== 1) {
    console.error('FAIL: Duplicate subscription caused multiple deliveries');
    passed = false;
  }
  testBus.unsubscribe(countingListener);

  // Test 4: Unsubscribe prevents delivery & safe double unsubscribe
  testBus.unsubscribe(listener1);
  testBus.unsubscribe(listener1); // Safe repeated call
  receivedEvent1 = null;

  testBus.publish(mockEvent);

  if (receivedEvent1 !== null) {
    console.error('FAIL: Unsubscribed listener received event');
    passed = false;
  }

  // Test 4b: Unsubscribe function returned by subscribe()
  let receivedViaReturnedUnsubscribe: OSEvent | null = null;
  const returnedUnsubscribeListener = (event: OSEvent) => {
    receivedViaReturnedUnsubscribe = event;
  };
  const unsubscribeReturned = testBus.subscribe(returnedUnsubscribeListener);
  unsubscribeReturned();
  unsubscribeReturned(); // Safe repeated call of returned unsubscriber
  receivedViaReturnedUnsubscribe = null;
  testBus.publish(mockEvent);
  if (receivedViaReturnedUnsubscribe !== null) {
    console.error('FAIL: Listener unsubscribed via subscribe() return value still received event');
    passed = false;
  }

  // Test 5: Safe publish with zero subscribers
  const emptyBus = new OSEventBus();
  try {
    emptyBus.publish(mockEvent);
  } catch (err) {
    console.error('FAIL: Publish with 0 listeners threw error', err);
    passed = false;
  }

  // Test 6: Listener failure isolation
  const faultyListener = () => {
    throw new Error('Simulated listener crash');
  };
  let survivorReceived = false;
  const survivorListener = () => {
    survivorReceived = true;
  };

  emptyBus.subscribe(faultyListener);
  emptyBus.subscribe(survivorListener);

  emptyBus.publish(mockEvent);

  if (!survivorReceived) {
    console.error('FAIL: Faulty listener interrupted execution to other subscribers');
    passed = false;
  }

  // Test 7: Fixtures integrity & no auto-publish
  if (osEventBus.listenerCount !== 0) {
    console.error('FAIL: osEventBus has listeners attached automatically upon import');
    passed = false;
  }

  if (osEventsRegistry.length !== 10) {
    console.error('FAIL: osEventsRegistry count altered');
    passed = false;
  }

  // Test 8: Snapshot semantics — remove during publish
  const snapshotRemoveBus = new OSEventBus();
  const receivedWhileRemoved: string[] = [];
  const snapshotRemoveListener = (event: OSEvent) => {
    receivedWhileRemoved.push(event.id);
    snapshotRemoveBus.unsubscribe(snapshotRemoveListener);
  };
  snapshotRemoveBus.subscribe(snapshotRemoveListener);
  snapshotRemoveBus.publish(mockEvent);
  snapshotRemoveBus.publish(nextEvent);
  if (
    receivedWhileRemoved.length !== 1 ||
    receivedWhileRemoved[0] !== mockEvent.id
  ) {
    console.error(
      'FAIL: Listener removed during publish did not receive only the current event'
    );
    passed = false;
  }

  // Test 9: Snapshot semantics — add during publish
  const snapshotAddBus = new OSEventBus();
  const receivedByAdded: string[] = [];
  const addedDuringPublish = (event: OSEvent) => {
    receivedByAdded.push(event.id);
  };
  const adder = () => {
    snapshotAddBus.subscribe(addedDuringPublish);
  };
  snapshotAddBus.subscribe(adder);
  snapshotAddBus.publish(mockEvent);
  snapshotAddBus.publish(nextEvent);
  if (
    receivedByAdded.length !== 1 ||
    receivedByAdded[0] !== nextEvent.id
  ) {
    console.error(
      'FAIL: Listener added during publish did not receive only the next event'
    );
    passed = false;
  }

  console.log(`[OSEventBus Verification] Checks complete. Result: ${passed ? 'PASSED' : 'FAILED'}`);
  return passed;
}

describe('OS Event Bus', () => {
  it('passes Event Bus delivery, isolation, and fixture integrity verification', () => {
    expect(runEventBusVerification()).toBe(true);
  });

  it('unsubscribe function returned by subscribe() stops later delivery and is safe to call twice', () => {
    const bus = new OSEventBus();
    const received: OSEvent[] = [];
    const listener = (event: OSEvent) => {
      received.push(event);
    };

    const unsubscribe = bus.subscribe(listener);
    bus.publish(mockEvent);
    expect(received).toEqual([mockEvent]);
    expect(bus.listenerCount).toBe(1);

    unsubscribe();
    expect(bus.listenerCount).toBe(0);
    unsubscribe();
    expect(bus.listenerCount).toBe(0);

    bus.publish(nextEvent);
    expect(received).toEqual([mockEvent]);
  });

  it('listener removed during publish still receives the current event but not the next event', () => {
    const bus = new OSEventBus();
    const receivedIds: string[] = [];
    const listener = (event: OSEvent) => {
      receivedIds.push(event.id);
      bus.unsubscribe(listener);
    };

    bus.subscribe(listener);
    bus.publish(mockEvent);
    expect(receivedIds).toEqual([mockEvent.id]);
    expect(bus.listenerCount).toBe(0);

    bus.publish(nextEvent);
    expect(receivedIds).toEqual([mockEvent.id]);
  });

  it('listener added during publish does not receive the current event but receives the next event', () => {
    const bus = new OSEventBus();
    const receivedByAdded: string[] = [];
    const addedDuringPublish = (event: OSEvent) => {
      receivedByAdded.push(event.id);
    };
    const adder = () => {
      bus.subscribe(addedDuringPublish);
    };

    bus.subscribe(adder);
    bus.publish(mockEvent);
    expect(receivedByAdded).toEqual([]);
    expect(bus.listenerCount).toBe(2);

    bus.publish(nextEvent);
    expect(receivedByAdded).toEqual([nextEvent.id]);
  });
});
