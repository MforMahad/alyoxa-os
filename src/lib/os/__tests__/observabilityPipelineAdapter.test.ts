import { describe, it, expect } from '@jest/globals';
import { osEventsRegistry } from '@/data/os/events';
import { osIntegrationContractStore } from '../integrationContracts';
import { osIntegrationObservabilityStore } from '../integrationObservability';
import {
  OSObservabilityPipelineAdapter,
  osObservabilityPipelineAdapter,
} from '../observabilityPipelineAdapter';
import { OSIntegrationResult } from '../integrationRuntime';
import { OSContextHandoffResult } from '../contextHandoffRuntime';
import { OSModuleHandoffResult } from '../moduleHandoffRuntime';
import { OSRuntimeSafetyResult } from '../runtimeSafety';
import { OSIntegrationObservabilityRuntime } from '../integrationObservabilityRuntime';

export function run13_6_4_ObservabilityPipelineAdapterTests(): boolean {
  osIntegrationObservabilityStore.clear();

  const contract001 = osIntegrationContractStore.getContract('CONTRACT-001');
  const contract002 = osIntegrationContractStore.getContract('CONTRACT-002');
  const contract004 = osIntegrationContractStore.getContract('CONTRACT-004');
  const canonicalEvt004 = osEventsRegistry.find((evt) => evt.id === 'EVT-004');

  if (!contract001 || !contract002 || !contract004 || !canonicalEvt004) {
    throw new Error('Test Precondition Failed: Missing required canonical contracts/fixtures.');
  }

  // --- A & B. Observe Integration Resolution Fixture ---
  const source001 = {
    module: contract001.sourceModule,
    recordId: 'OBS-001',
    recordType: contract001.sourceRecordType,
  };

  const integrationResultFixture: OSIntegrationResult = {
    status: 'matched',
    source: source001,
    handoffs: [
      {
        contractId: contract001.id,
        source: source001,
        targetModule: contract001.targetModule,
        targetRecordType: contract001.targetRecordType,
        requiredReferences: contract001.requiredReferences,
        metadata: contract001.metadata,
        status: 'HANDOFF_PREPARED',
      },
    ],
    errors: [],
  };

  const snapshotIntegration = structuredClone(integrationResultFixture);

  const resA = osObservabilityPipelineAdapter.observeIntegrationResolution(
    integrationResultFixture,
    { id: 'obs-p1', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (
    resA.observation?.stage !== 'INTEGRATION_RESOLUTION' ||
    resA.observation?.sourceModule !== contract001.sourceModule ||
    resA.observation?.contractId !== 'CONTRACT-001' ||
    resA.observation?.status !== 'completed' ||
    JSON.stringify(resA.result) !== JSON.stringify(snapshotIntegration)
  ) {
    throw new Error('Test A/B Failed: Integration resolution observation mismatch or mutation.');
  }

  // --- C. Observe Event Resolution Fixture (EVT-004) ---
  const eventResultFixture: OSIntegrationResult = {
    status: 'not_found',
    source: {
      module: canonicalEvt004.module,
      recordId: canonicalEvt004.recordId,
      recordType: canonicalEvt004.recordType,
    },
    handoffs: [],
    errors: ['No contract matched'],
  };

  const snapshotEventResult = structuredClone(eventResultFixture);

  const resC = osObservabilityPipelineAdapter.observeEventResolution(
    canonicalEvt004,
    eventResultFixture,
    { id: 'obs-p2', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (
    resC.observation?.stage !== 'EVENT_RESOLUTION' ||
    resC.observation?.sourceModule !== canonicalEvt004.module ||
    resC.observation?.sourceRecordId !== canonicalEvt004.recordId ||
    resC.observation?.status !== 'failed' ||
    JSON.stringify(resC.result) !== JSON.stringify(snapshotEventResult)
  ) {
    throw new Error('Test C Failed: Event resolution observation canonical mismatch or mutation.');
  }

  // --- D. Observe Context Handoff Fixture ---
  const contextResultFixture: OSContextHandoffResult = {
    status: 'prepared',
    package: {
      contractId: contract001.id,
      source: source001,
      targetModule: contract001.targetModule,
      targetRecordType: contract001.targetRecordType,
      references: [],
      contextEntries: [],
      status: 'CONTEXT_HANDOFF_PREPARED',
      metadata: contract001.metadata,
    },
    errors: [],
  };

  const snapshotContextResult = structuredClone(contextResultFixture);

  const resD = osObservabilityPipelineAdapter.observeContextHandoff(
    contextResultFixture,
    { id: 'obs-p3', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (
    resD.observation?.stage !== 'CONTEXT_HANDOFF' ||
    resD.observation?.sourceModule !== contract001.sourceModule ||
    resD.observation?.targetModule !== contract001.targetModule ||
    JSON.stringify(resD.result) !== JSON.stringify(snapshotContextResult)
  ) {
    throw new Error('Test D Failed: Context handoff observation mismatch or mutation.');
  }

  // --- E. Observe Module Handoff Fixture (`not_supported`) ---
  const moduleResultFixture: OSModuleHandoffResult = {
    status: 'not_supported',
    sourceRecordId: 'INS-001',
    targetModule: contract004.targetModule,
    targetRecordType: contract004.targetRecordType,
    contractId: contract004.id,
    package: null,
    metadata: contract004.metadata,
    errors: ['Adapter not supported'],
  };

  const snapshotModuleResult = structuredClone(moduleResultFixture);

  const resE = osObservabilityPipelineAdapter.observeModuleHandoff(
    moduleResultFixture,
    { id: 'obs-p4', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (
    resE.observation?.stage !== 'MODULE_HANDOFF' ||
    resE.observation?.metadata.adapterSupported !== false ||
    resE.observation?.sourceModule !== 'SYSTEM' ||
    JSON.stringify(resE.result) !== JSON.stringify(snapshotModuleResult)
  ) {
    throw new Error('Test E Failed: Module handoff semantics mismatch or mutation.');
  }

  // --- F. Observe Runtime Safety Fixture ---
  const safetyResultFixture: OSRuntimeSafetyResult = {
    status: 'invalid',
    targetModule: contract002.targetModule,
    targetRecordType: contract002.targetRecordType,
    sourceRecordId: 'DEC-001',
    contractId: contract002.id,
    handoffResult: null,
    metadata: contract002.metadata,
    errors: ['Validation failed: missing context'],
  };

  const snapshotSafetyResult = structuredClone(safetyResultFixture);

  const resF = osObservabilityPipelineAdapter.observeRuntimeSafety(
    safetyResultFixture,
    { id: 'obs-p5', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (
    resF.observation?.stage !== 'RUNTIME_SAFETY' ||
    resF.observation?.summary !== 'Validation failed: missing context' ||
    resF.observation?.status !== 'failed' ||
    JSON.stringify(resF.result) !== JSON.stringify(snapshotSafetyResult)
  ) {
    throw new Error('Test F Failed: Runtime safety error propagation failed or mutated.');
  }

  // --- O. Non-Blocking Injected Error Isolation ---
  const throwingRuntime = new OSIntegrationObservabilityRuntime();
  throwingRuntime.recordContextHandoff = () => {
    throw new Error('Store persistence failure simulation');
  };

  const isolatedAdapter = new OSObservabilityPipelineAdapter(throwingRuntime);

  const resIsolation = isolatedAdapter.observeContextHandoff(
    contextResultFixture,
    { id: 'obs-fail-1', timestamp: '2026-09-10T12:00:00Z' }
  );

  if (
    resIsolation.observation !== null ||
    JSON.stringify(resIsolation.result) !== JSON.stringify(snapshotContextResult)
  ) {
    throw new Error('Test O Failed: Error in observation runtime altered or failed runtime result.');
  }

  // --- P. Duplicate ID Behavior Contract (Store throws duplicate key error) ---
  const resDup1 = osObservabilityPipelineAdapter.observeIntegrationResolution(
    integrationResultFixture,
    { id: 'obs-dup-key', timestamp: '2026-09-10T12:00:00Z' }
  );

  const snapshotDupResult = structuredClone(integrationResultFixture);

  const resDup2 = osObservabilityPipelineAdapter.observeIntegrationResolution(
    integrationResultFixture,
    { id: 'obs-dup-key', timestamp: '2026-09-10T12:05:00Z' }
  );

  if (
    resDup1.observation?.id !== 'obs-dup-key' ||
    resDup2.observation !== null || // Adapter isolated duplicate key error from store
    JSON.stringify(resDup2.result) !== JSON.stringify(snapshotDupResult)
  ) {
    throw new Error('Test P Failed: Duplicate ID store error isolation failed.');
  }

  return true;
}

describe('OS Observability Pipeline Adapter', () => {
  it('passes 13.6.4 pipeline adapter tests', () => {
    expect(run13_6_4_ObservabilityPipelineAdapterTests()).toBe(true);
  });
});