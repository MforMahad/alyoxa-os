import { describe, it, expect } from '@jest/globals';
import { osScenarioManager } from '../scenarioDefinition';
import { osIntegrationContractStore } from '../integrationContracts';

export function run13_7_1_ScenarioDefinitionTests(): boolean {
  const scenario = osScenarioManager.getCanonicalScenario();

  // 1. Validate Pipeline Order
  const expectedPipeline = ['SIGNAL', 'AI', 'FORGE', 'PULSE'];
  if (JSON.stringify(scenario.pipeline) !== JSON.stringify(expectedPipeline)) {
    throw new Error('Test Failed: Pipeline does not match SIGNAL → AI → FORGE → PULSE.');
  }

  // 2. Validate Canonical Records
  if (scenario.records.signal.recordId !== 'OBS-001' || scenario.records.signal.module !== 'SIGNAL') {
    throw new Error('Test Failed: Signal record mismatch.');
  }
  if (scenario.records.ai.recordId !== 'DEC-001' || scenario.records.ai.module !== 'AI') {
    throw new Error('Test Failed: AI record mismatch.');
  }
  if (scenario.records.forge.recordId !== 'TASK-001' || scenario.records.forge.module !== 'FORGE') {
    throw new Error('Test Failed: Forge record mismatch.');
  }
  if (scenario.records.pulse.recordId !== 'REQ-001' || scenario.records.pulse.module !== 'PULSE') {
    throw new Error('Test Failed: Pulse record mismatch.');
  }

  // 3. Validate Canonical References with Exact Mappings
  const refMap = new Map(scenario.references.map((r) => [r.id, r]));

  const ref1 = refMap.get('REF-001');
  if (
    !ref1 ||
    ref1.fromModule !== 'SIGNAL' ||
    ref1.toModule !== 'AI' ||
    ref1.sourceRecordId !== 'OBS-001' ||
    ref1.targetRecordId !== 'DEC-001'
  ) {
    throw new Error('Test Failed: REF-001 canonical mapping mismatch.');
  }

  const ref2 = refMap.get('REF-002');
  if (
    !ref2 ||
    ref2.fromModule !== 'AI' ||
    ref2.toModule !== 'FORGE' ||
    ref2.sourceRecordId !== 'DEC-001' ||
    ref2.targetRecordId !== 'TASK-001'
  ) {
    throw new Error('Test Failed: REF-002 canonical mapping mismatch.');
  }

  const ref3 = refMap.get('REF-003');
  if (
    !ref3 ||
    ref3.fromModule !== 'FORGE' ||
    ref3.toModule !== 'PULSE' ||
    ref3.sourceRecordId !== 'TASK-001' ||
    ref3.targetRecordId !== 'REQ-001'
  ) {
    throw new Error('Test Failed: REF-003 canonical mapping mismatch.');
  }

  // 4. Validate Contracts Exist in Store
  for (const contractId of scenario.contracts) {
    const contract = osIntegrationContractStore.getContract(contractId);
    if (!contract) {
      throw new Error(`Test Failed: Canonical contract ${contractId} not found in store.`);
    }
  }

  // 5. Validate Execution Semantics (Non-executed distinction)
  if (
    scenario.executionSemantics.mode !== 'PREPARED_VALIDATED_OBSERVED' ||
    scenario.executionSemantics.executed !== false ||
    scenario.executionSemantics.completed !== false
  ) {
    throw new Error('Test Failed: Execution semantics must strictly distinguish non-execution.');
  }

  // 6. Immutability & Determinism
  const snap1 = JSON.stringify(osScenarioManager.getCanonicalScenario());
  const snap2 = JSON.stringify(osScenarioManager.getCanonicalScenario());
  if (snap1 !== snap2) {
    throw new Error('Test Failed: Scenario definition is not deterministic.');
  }

  return true;
}

describe('OS Scenario Definition', () => {
  it('passes 13.7.1 canonical scenario definition verification', () => {
    expect(run13_7_1_ScenarioDefinitionTests()).toBe(true);
  });
});