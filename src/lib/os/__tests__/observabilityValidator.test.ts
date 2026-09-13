import { describe, it, expect } from '@jest/globals';
import { osIntegrationContractStore } from '../integrationContracts';
import { OSIntegrationObservation } from '../integrationObservability';
import { osObservabilityValidator } from '../observabilityValidator';

export function run13_6_5_ObservabilityValidatorTests(): boolean {
  const contract001 = osIntegrationContractStore.getContract('CONTRACT-001');
  const contract002 = osIntegrationContractStore.getContract('CONTRACT-002');

  if (!contract001 || !contract002) {
    throw new Error('Test Precondition Failed: Missing required contracts.');
  }

  // --- 1. Valid Observations across all 5 stages ---
  const validObservations: OSIntegrationObservation[] = [
    {
      id: 'obs-v1',
      timestamp: '2026-09-10T12:00:00Z',
      stage: 'INTEGRATION_RESOLUTION',
      status: 'completed',
      sourceModule: contract001.sourceModule,
      sourceRecordId: 'REC-001',
      targetModule: contract001.targetModule,
      contractId: contract001.id,
      summary: 'Matched successfully',
      metadata: {},
    },
    {
      id: 'obs-v2',
      timestamp: '2026-09-10T12:00:00Z',
      stage: 'EVENT_RESOLUTION',
      status: 'completed',
      sourceModule: 'SIGNAL',
      sourceRecordId: 'EVT-001',
      summary: 'Event resolved',
      metadata: {},
    },
    {
      id: 'obs-v3',
      timestamp: '2026-09-10T12:00:00Z',
      stage: 'CONTEXT_HANDOFF',
      status: 'completed',
      sourceModule: contract001.sourceModule,
      sourceRecordId: 'REC-001',
      targetModule: contract001.targetModule,
      contractId: contract001.id,
      summary: 'Context handoff prepared',
      metadata: {},
    },
    {
      id: 'obs-v4',
      timestamp: '2026-09-10T12:00:00Z',
      stage: 'MODULE_HANDOFF',
      status: 'completed',
      sourceModule: contract001.sourceModule,
      sourceRecordId: 'REC-001',
      targetModule: contract001.targetModule,
      contractId: contract001.id,
      summary: 'Module handoff evaluated',
      metadata: { adapterSupported: false },
    },
    {
      id: 'obs-v5',
      timestamp: '2026-09-10T12:00:00Z',
      stage: 'RUNTIME_SAFETY',
      status: 'failed',
      sourceModule: contract002.sourceModule,
      sourceRecordId: 'REC-002',
      targetModule: contract002.targetModule,
      contractId: contract002.id,
      summary: 'Validation failed: missing context',
      metadata: {},
    },
  ];

  for (const obs of validObservations) {
    const res = osObservabilityValidator.validateObservation(obs);
    if (!res.valid) {
      throw new Error(`Valid observation failed validation for stage ${obs.stage}: ${res.errors.join(', ')}`);
    }
  }

  // --- Dedicated SYSTEM Module Acceptance Test ---
  const systemModuleObs: OSIntegrationObservation = {
    id: 'obs-system-module',
    timestamp: '2026-09-10T12:00:00Z',
    stage: 'INTEGRATION_RESOLUTION',
    status: 'completed',
    sourceModule: 'SYSTEM',
    sourceRecordId: 'SYS-REC-001',
    targetModule: 'VAULT',
    summary: 'System module operational validation',
    metadata: {},
  };
  const resSystem = osObservabilityValidator.validateObservation(systemModuleObs);
  if (!resSystem.valid) {
    throw new Error(`Test Failed: SYSTEM module observation rejected: ${resSystem.errors.join(', ')}`);
  }

  // --- 2. Invalid Stage ---
  const invalidStageObs: OSIntegrationObservation = {
    ...validObservations[0],
    stage: 'INVALID_STAGE' as any,
  };
  const resStage = osObservabilityValidator.validateObservation(invalidStageObs);
  if (resStage.valid || !resStage.errors.some((e) => e.includes('Invalid observation stage'))) {
    throw new Error('Test Failed: Expected invalid stage error.');
  }

  // --- 3. Invalid Status ---
  const invalidStatusObs: OSIntegrationObservation = {
    ...validObservations[0],
    status: 'unknown' as any,
  };
  const resStatus = osObservabilityValidator.validateObservation(invalidStatusObs);
  if (resStatus.valid || !resStatus.errors.some((e) => e.includes('Invalid observation status'))) {
    throw new Error('Test Failed: Expected invalid status error.');
  }

  // --- 4. Empty ID ---
  const emptyIdObs: OSIntegrationObservation = {
    ...validObservations[0],
    id: '',
  };
  const resId = osObservabilityValidator.validateObservation(emptyIdObs);
  if (resId.valid || !resId.errors.some((e) => e.includes('Observation ID must be a non-empty string.'))) {
    throw new Error('Test Failed: Expected empty ID error.');
  }

  // --- 5. Empty Source Record ID ---
  const emptySourceRecordIdObs: OSIntegrationObservation = {
    ...validObservations[0],
    sourceRecordId: '   ',
  };
  const resSrcId = osObservabilityValidator.validateObservation(emptySourceRecordIdObs);
  if (resSrcId.valid || !resSrcId.errors.some((e) => e.includes('Source record ID must be a non-empty string.'))) {
    throw new Error('Test Failed: Expected empty source record ID error.');
  }

  // --- 6. Invalid Timestamp ---
  const invalidTimestampObs: OSIntegrationObservation = {
    ...validObservations[0],
    timestamp: 'not-a-date',
  };
  const resTs = osObservabilityValidator.validateObservation(invalidTimestampObs);
  if (resTs.valid || !resTs.errors.some((e) => e.includes('Invalid timestamp format'))) {
    throw new Error('Test Failed: Expected invalid timestamp format error.');
  }

  // --- 7. Unknown Contract ---
  const unknownContractObs: OSIntegrationObservation = {
    ...validObservations[0],
    contractId: 'CONTRACT-NONEXISTENT',
  };
  const resContract = osObservabilityValidator.validateObservation(unknownContractObs);
  if (resContract.valid || !resContract.errors.some((e) => e.includes('does not exist in the contract store'))) {
    throw new Error('Test Failed: Expected unknown contract error.');
  }

  // --- 8. Source / Contract Mismatch ---
  const sourceMismatchObs: OSIntegrationObservation = {
    ...validObservations[0],
    sourceModule: 'AI',
    contractId: contract001.id,
  };
  const resSourceMismatch = osObservabilityValidator.validateObservation(sourceMismatchObs);
  if (resSourceMismatch.valid || !resSourceMismatch.errors.some((e) => e.includes('Source module mismatch'))) {
    throw new Error('Test Failed: Expected source module mismatch error.');
  }

  // --- 9. Target / Contract Mismatch ---
  const targetMismatchObs: OSIntegrationObservation = {
    ...validObservations[0],
    targetModule: 'SIGNAL',
    contractId: contract001.id,
  };
  const resTargetMismatch = osObservabilityValidator.validateObservation(targetMismatchObs);
  if (resTargetMismatch.valid || !resTargetMismatch.errors.some((e) => e.includes('Target module mismatch'))) {
    throw new Error('Test Failed: Expected target module mismatch error.');
  }

  // --- 10. RUNTIME_SAFETY Failed Diagnostic Validation ---
  const badSafetyObs: OSIntegrationObservation = {
    id: 'obs-bad-safety',
    timestamp: '2026-09-10T12:00:00Z',
    stage: 'RUNTIME_SAFETY',
    status: 'failed',
    sourceModule: 'SYSTEM',
    sourceRecordId: 'REC-001',
    summary: '',
    metadata: {},
  };
  const resSafety = osObservabilityValidator.validateObservation(badSafetyObs);
  if (resSafety.valid || !resSafety.errors.some((e) => e.includes('RUNTIME_SAFETY failed observation must include diagnostic summary'))) {
    throw new Error('Test Failed: Expected RUNTIME_SAFETY diagnostic summary error.');
  }

  // --- 11. Immutability & Determinism Check ---
  const testObs = structuredClone(validObservations[0]);
  const snapshotBefore = structuredClone(testObs);

  const val1 = osObservabilityValidator.validateObservation(testObs);
  const val2 = osObservabilityValidator.validateObservation(testObs);

  if (!val1.valid || !val2.valid || JSON.stringify(val1) !== JSON.stringify(val2)) {
    throw new Error('Test Failed: Validation must be deterministic.');
  }

  if (JSON.stringify(testObs) !== JSON.stringify(snapshotBefore)) {
    throw new Error('Test Failed: Validator mutated the input observation object.');
  }

  return true;
}

describe('OS Observability Validator', () => {
  it('passes 13.6.5 validator tests', () => {
    expect(run13_6_5_ObservabilityValidatorTests()).toBe(true);
  });
});