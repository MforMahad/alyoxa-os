import { describe, it, expect } from '@jest/globals';

import {
  OSIntegrationObservabilityStore,
  osIntegrationObservabilityStore,
  OSIntegrationObservation,
} from '../integrationObservability';

export function runOSIntegrationObservabilityVerification(): boolean {
  console.log(
    '[OS Integration Observability Verification] Starting Phase 13.6.1 & 13.6.2 checks...',
  );

  let passed = true;

  const store = new OSIntegrationObservabilityStore();

  const mockObs1: OSIntegrationObservation = {
    id: 'OBSERVATION-001',
    stage: 'CONTEXT_HANDOFF',
    status: 'completed',
    sourceModule: 'SIGNAL',
    sourceRecordId: 'OBS-001',
    targetModule: 'AI',
    contractId: 'CONTRACT-001',
    timestamp: '2026-01-01T00:00:00Z',
    summary: 'Context handoff prepared successfully.',
    metadata: { refCount: 1 },
  };

  const mockObs2: OSIntegrationObservation = {
    id: 'OBSERVATION-002',
    stage: 'RUNTIME_SAFETY',
    status: 'completed',
    sourceModule: 'SIGNAL',
    sourceRecordId: 'OBS-001',
    targetModule: 'AI',
    contractId: 'CONTRACT-001',
    timestamp: '2026-01-01T00:00:01Z',
    summary: 'Runtime safety validation passed.',
    metadata: { valid: true },
  };

  const mockObs3: OSIntegrationObservation = {
    id: 'OBSERVATION-003',
    stage: 'MODULE_HANDOFF',
    status: 'started',
    sourceModule: 'FORGE',
    sourceRecordId: 'TASK-001',
    targetModule: 'PULSE',
    contractId: 'CONTRACT-002',
    timestamp: '2026-01-01T00:00:02Z',
    summary: 'Preparing module handoff.',
    metadata: {},
  };

  // 1. Create and store a valid observation
  try {
    store.record(mockObs1);

    if (store.size !== 1) {
      console.error('FAIL: Store size mismatch after record.');
      passed = false;
    }
  } catch (err) {
    console.error('FAIL: Error storing valid observation:', err);
    passed = false;
  }

  // 2. Retrieve by ID
  const retrieved1 = store.get('OBSERVATION-001');

  if (
    !retrieved1 ||
    retrieved1.id !== 'OBSERVATION-001' ||
    retrieved1.stage !== 'CONTEXT_HANDOFF'
  ) {
    console.error('FAIL: Retrieve by ID failed.');
    passed = false;
  }

  // 3. Retrieve all observations & 4. Preserve insertion order
  store.record(mockObs2);
  store.record(mockObs3);

  const all = store.getAll();

  if (
    all.length !== 3 ||
    all[0].id !== 'OBSERVATION-001' ||
    all[1].id !== 'OBSERVATION-002' ||
    all[2].id !== 'OBSERVATION-003'
  ) {
    console.error('FAIL: Insertion order or count mismatch in getAll().');
    passed = false;
  }

  // 5. Filter by runtime stage
  const stageFiltered = store.getByStage('RUNTIME_SAFETY');

  if (
    stageFiltered.length !== 1 ||
    stageFiltered[0].id !== 'OBSERVATION-002'
  ) {
    console.error('FAIL: Filter by stage failed.');
    passed = false;
  }

  // 6. Filter by source module + source record ID
  const sourceFiltered = store.getBySource('SIGNAL', 'OBS-001');

  if (sourceFiltered.length !== 2) {
    console.error('FAIL: Filter by source failed.');
    passed = false;
  }

  // 7. Filter by contract ID
  const contractFiltered = store.getByContract('CONTRACT-002');

  if (
    contractFiltered.length !== 1 ||
    contractFiltered[0].id !== 'OBSERVATION-003'
  ) {
    console.error('FAIL: Filter by contract ID failed.');
    passed = false;
  }

  // 8. Missing required ID is rejected
  try {
    store.record({ ...mockObs1, id: '' });
    console.error('FAIL: Missing ID was not rejected.');
    passed = false;
  } catch {
    // Expected behavior
  }

  // 9. Missing source record ID is rejected
  try {
    store.record({
      ...mockObs1,
      id: 'OBS-ERR-1',
      sourceRecordId: '',
    });
    console.error('FAIL: Missing sourceRecordId was not rejected.');
    passed = false;
  } catch {
    // Expected behavior
  }

  // 10. Invalid stage is rejected
  try {
    store.record({
      ...mockObs1,
      id: 'OBS-ERR-2',
      stage:
        'INVALID_STAGE' as unknown as OSIntegrationObservation['stage'],
    });
    console.error('FAIL: Invalid stage was not rejected.');
    passed = false;
  } catch {
    // Expected behavior
  }

  // 11. Invalid status is rejected
  try {
    store.record({
      ...mockObs1,
      id: 'OBS-ERR-3',
      status:
        'INVALID_STATUS' as unknown as OSIntegrationObservation['status'],
    });
    console.error('FAIL: Invalid status was not rejected.');
    passed = false;
  } catch {
    // Expected behavior
  }

  // 12. Duplicate IDs are rejected deterministically
  try {
    store.record({ ...mockObs1 });

    console.error('FAIL: Duplicate ID was not rejected.');
    passed = false;
  } catch (err: unknown) {
    if (
      !(err instanceof Error) ||
      !err.message.includes('Duplicate observation ID rejected')
    ) {
      console.error(
        'FAIL: Unexpected error message on duplicate ID rejection.',
      );
      passed = false;
    }
  }

  // 13. Returned observation is defensively cloned
  const clonedGet = store.get('OBSERVATION-001');

  if (clonedGet) {
    clonedGet.summary = 'MUTATED';

    if (store.get('OBSERVATION-001')?.summary === 'MUTATED') {
      console.error(
        'FAIL: Internal store state was mutated through get().',
      );
      passed = false;
    }
  }

  // 14. Stored input mutation does not mutate the store
  const inputToMutate = {
    ...mockObs1,
    id: 'OBS-MUTATE-INPUT',
  };

  store.record(inputToMutate);
  inputToMutate.summary = 'MUTATED INPUT';

  if (
    store.get('OBS-MUTATE-INPUT')?.summary === 'MUTATED INPUT'
  ) {
    console.error(
      'FAIL: Store internal state was mutated via input reference.',
    );
    passed = false;
  }

  // 15. getAll() results cannot mutate internal state
  const allClones = store.getAll();

  allClones[0].summary = 'MUTATED ALL';

  if (store.get('OBSERVATION-001')?.summary === 'MUTATED ALL') {
    console.error(
      'FAIL: Store internal state was mutated via getAll() array element.',
    );
    passed = false;
  }

  // 16. clear() empties the store
  store.clear();

  if (store.size !== 0 || store.getAll().length !== 0) {
    console.error('FAIL: Store clear() did not empty the store.');
    passed = false;
  }

  // 17. Empty-store behavior is deterministic
  if (
    store.get('NON_EXISTENT') !== undefined ||
    store.getByStage('CONTEXT_HANDOFF').length !== 0 ||
    store.getBySource('SIGNAL', 'OBS-001').length !== 0 ||
    store.getByContract('CONTRACT-001').length !== 0
  ) {
    console.error(
      'FAIL: Empty store queries returned non-empty results.',
    );
    passed = false;
  }

  // 18. Singleton store exists and exposes the expected API
  if (
    typeof osIntegrationObservabilityStore.record !== 'function' ||
    typeof osIntegrationObservabilityStore.get !== 'function' ||
    typeof osIntegrationObservabilityStore.getAll !== 'function' ||
    typeof osIntegrationObservabilityStore.getByStage !== 'function' ||
    typeof osIntegrationObservabilityStore.getBySource !== 'function' ||
    typeof osIntegrationObservabilityStore.getByContract !== 'function' ||
    typeof osIntegrationObservabilityStore.clear !== 'function'
  ) {
    console.error(
      'FAIL: Singleton store instance does not match expected API.',
    );
    passed = false;
  }

  // 19. Valid observations with omitted optional targetModule/contractId remain valid
  const optionalObs: OSIntegrationObservation = {
    id: 'OBSERVATION-OPTIONAL',
    stage: 'INTEGRATION_RESOLUTION',
    status: 'completed',
    sourceModule: 'SIGNAL',
    sourceRecordId: 'OBS-001',
    timestamp: '2026-01-01T00:00:03Z',
    summary: 'Observation without optional target/contract.',
    metadata: {},
  };

  try {
    store.record(optionalObs);

    const retrievedOptional = store.get('OBSERVATION-OPTIONAL');

    if (
      !retrievedOptional ||
      retrievedOptional.targetModule !== undefined ||
      retrievedOptional.contractId !== undefined
    ) {
      console.error('FAIL: Omitted optional fields check failed.');
      passed = false;
    }
  } catch (err) {
    console.error(
      'FAIL: Failed storing observation with omitted optional fields:',
      err,
    );
    passed = false;
  }

  // 20. Store remains isolated and in-memory.
  // No Event Bus, persistence, or external integration is invoked by the store.
  if (store.size !== 1) {
    console.error('FAIL: Store isolation sanity check failed.');
    passed = false;
  }

  console.log(
    `[OS Integration Observability Verification] Verification complete. Result: ${
      passed ? 'PASSED' : 'FAILED'
    }`,
  );

  return passed;
}

describe('OS Integration Observability Store', () => {
  it('passes 13.6.1 and 13.6.2 verification', () => {
    expect(runOSIntegrationObservabilityVerification()).toBe(true);
  });
});