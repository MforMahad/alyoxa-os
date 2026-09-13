import { describe, it, expect } from '@jest/globals';
import { osEventsRegistry } from '@/data/os/events';
import { osIntegrationObservabilityRuntime } from '../integrationObservabilityRuntime';
import { OSIntegrationResult } from '../integrationRuntime';
import { osIntegrationObservabilityStore } from '../integrationObservability';
import { OSModuleHandoffResult } from '../moduleHandoffRuntime';
import { OSRuntimeSafetyResult } from '../runtimeSafety';
import { osIntegrationContractStore } from '../integrationContracts';

export function run13_6_3_ObservabilityAudits(): boolean {
  osIntegrationObservabilityStore.clear();

  // 1. Contract Lookup Uses Store API
  const contract001 = osIntegrationContractStore.getContract('CONTRACT-001');
  const contract002 = osIntegrationContractStore.getContract('CONTRACT-002');
  const contract004 = osIntegrationContractStore.getContract('CONTRACT-004');

  if (!contract001 || !contract002 || !contract004) {
    throw new Error('Test Failed: Store lookup could not resolve canonical contracts.');
  }

  // 2. Canonical Resolution & Identity Protection Verification
  const matchedSource = {
    module: contract001.sourceModule,
    recordId: 'OBS-001',
    recordType: contract001.sourceRecordType,
  };

  const mockMatchedResolution: OSIntegrationResult = {
    status: 'matched',
    source: matchedSource,
    handoffs: [
      {
        contractId: contract001.id,
        source: matchedSource,
        targetModule: contract001.targetModule,
        targetRecordType: contract001.targetRecordType,
        requiredReferences: contract001.requiredReferences,
        metadata: contract001.metadata,
        status: 'HANDOFF_PREPARED',
      },
    ],
    errors: [],
  };

  const obs1 = osIntegrationObservabilityRuntime.recordIntegrationResolution(
    mockMatchedResolution,
    contract001.sourceModule,
    'OBS-001',
    { id: 'obs-test-1', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (obs1.contractId !== 'CONTRACT-001' || obs1.status !== 'completed') {
    throw new Error('Test Failed: Integration resolution observation recording failed.');
  }

  // 3. Reject Identity Mismatch (sourceModule / sourceRecordId vs resolution.source)
  try {
    osIntegrationObservabilityRuntime.recordIntegrationResolution(
      mockMatchedResolution,
      'VAULT', // Mismatched module
      'OBS-001',
      { id: 'obs-test-mismatch', timestamp: '2026-09-10T12:00:00Z' }
    );
    throw new Error('Test Failed: Identity mismatch was not rejected deterministically.');
  } catch (err) {
    if (
      !(err instanceof Error) ||
      !err.message.includes('Observability identity mismatch')
    ) {
      throw err;
    }
  }

  // 4. EVT-004 Identity Preservation Verification
  const canonicalEvt004 = osEventsRegistry.find((evt) => evt.id === 'EVT-004');
  if (!canonicalEvt004) {
    throw new Error('Test Precondition Failed: EVT-004 missing from registry.');
  }

  const mockNotFoundResult: OSIntegrationResult = {
    status: 'not_found',
    source: {
      module: canonicalEvt004.module,
      recordId: canonicalEvt004.recordId,
      recordType: canonicalEvt004.recordType,
    },
    handoffs: [],
    errors: ['No contract matched'],
  };

  const obs2 = osIntegrationObservabilityRuntime.recordEventResolution(
    canonicalEvt004,
    mockNotFoundResult,
    { id: 'obs-test-2', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (
    obs2.sourceModule !== canonicalEvt004.module ||
    obs2.sourceRecordId !== canonicalEvt004.recordId ||
    obs2.status !== 'failed'
  ) {
    throw new Error('Test Failed: EVT-004 canonical identity not preserved.');
  }

  // 5. Truthful `not_supported` Semantics
  const mockNotSupportedResult: OSModuleHandoffResult = {
    status: 'not_supported',
    sourceRecordId: 'INS-001',
    targetModule: contract004.targetModule,
    targetRecordType: contract004.targetRecordType,
    contractId: contract004.id,
    package: null,
    metadata: contract004.metadata,
    errors: ['Target module adapter not supported'],
  };

  const obs3 = osIntegrationObservabilityRuntime.recordModuleHandoff(
    mockNotSupportedResult,
    { id: 'obs-test-3', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (
    obs3.metadata.adapterSupported !== false ||
    obs3.sourceModule !== 'SYSTEM' || // Verified SYSTEM module fallback on missing package
    obs3.metadata.sourceIdentityFallbackUsed !== true ||
    !obs3.summary.includes('target adapter is not supported')
  ) {
    throw new Error('Test Failed: not_supported semantics or fallback identity misconfigured.');
  }

  // 6. Runtime Safety Failures Use `result.errors`
  const mockSafetyFailure: OSRuntimeSafetyResult = {
    status: 'invalid',
    targetModule: contract002.targetModule,
    targetRecordType: contract002.targetRecordType,
    sourceRecordId: 'DEC-001',
    contractId: contract002.id,
    handoffResult: null,
    metadata: contract002.metadata,
    errors: ['Schema validation error: target record mismatched'],
  };

  const obs4 = osIntegrationObservabilityRuntime.recordRuntimeSafety(
    mockSafetyFailure,
    { id: 'obs-test-4', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (
    obs4.summary !== 'Schema validation error: target record mismatched' ||
    obs4.status !== 'failed' ||
    obs4.sourceModule !== 'SYSTEM'
  ) {
    throw new Error('Test Failed: Runtime safety failure summary did not use result.errors.');
  }

  return true;
}

describe('OS Integration Observability Runtime', () => {
  it('passes 13.6.3 observability audits', () => {
    expect(run13_6_3_ObservabilityAudits()).toBe(true);
  });
});