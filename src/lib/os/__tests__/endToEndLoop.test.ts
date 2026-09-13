import { describe, it, expect } from '@jest/globals';

import { osEndToEndLoopExecutor } from '../endToEndLoop';
import { osEventBus } from '../eventBus';
import { osScenarioManager } from '../scenarioDefinition';

describe(
  'OSEndToEndLoopExecutor (Phase 13.7.2 Final Test Hardening & Lock Verification)',
  () => {
    it('executes the successful canonical end-to-end loop with exact stage progression and verifies all five distinct observability stages in order', () => {
      const initialListenerCount = osEventBus.listenerCount;

      const result = osEndToEndLoopExecutor.executeCanonicalLoop();

      const finalListenerCount = osEventBus.listenerCount;

      expect(finalListenerCount).toBe(initialListenerCount);

      // Boundary invariants
      expect(result.executed).toBe(false);
      expect(result.completed).toBe(false);
      expect(result.errors).toEqual([]);
      expect(result.status).toBe('OBSERVED');

      // Stage presence
      expect(result.stages.eventResolution).toBeDefined();
      expect(result.stages.contextHandoff).toBeDefined();
      expect(result.stages.moduleHandoff).toBeDefined();
      expect(result.stages.runtimeSafety).toBeDefined();
      expect(result.stages.observability).toBeDefined();

      // Exact five observability stages in strict sequential order
      const observations = result.stages.observability ?? [];

      expect(observations.length).toBe(5);

      const expectedStages = [
        'EVENT_RESOLUTION',
        'INTEGRATION_RESOLUTION',
        'CONTEXT_HANDOFF',
        'MODULE_HANDOFF',
        'RUNTIME_SAFETY',
      ];

      observations.forEach((obs, index) => {
        expect(obs.stage).toBe(expectedStages[index]);
      });

      // Deterministic scenario identity
      const canonicalScenario =
        osScenarioManager.getCanonicalScenario();

      expect(result.scenarioName).toBe(canonicalScenario.name);
      expect(result.eventId).toBe('EVT-001');
      expect(result.sourceRecordId).toBe(
        canonicalScenario.records.signal.recordId,
      );

      // Verify the actual runtime chain directly
      const eventResolution = result.stages.eventResolution;
      const contextHandoff = result.stages.contextHandoff;
      const moduleHandoff = result.stages.moduleHandoff;
      const runtimeSafety = result.stages.runtimeSafety;

      expect(eventResolution?.status).toBe('matched');

      expect(eventResolution?.source.recordId).toBe('OBS-001');
      expect(eventResolution?.handoffs[0]?.contractId).toBe(
        'CONTRACT-001',
      );
      expect(eventResolution?.handoffs[0]?.targetModule).toBe('AI');

      expect(contextHandoff?.status).toBe('prepared');
      expect(contextHandoff?.package?.source.recordId).toBe('OBS-001');
      expect(contextHandoff?.package?.contractId).toBe('CONTRACT-001');
      expect(contextHandoff?.package?.targetModule).toBe('AI');

      expect(moduleHandoff?.status).toBe('prepared');
      expect(moduleHandoff?.targetModule).toBe('AI');

      expect(runtimeSafety?.status).toBe('valid');
      expect(runtimeSafety?.targetModule).toBe('AI');
      expect(runtimeSafety?.contractId).toBe('CONTRACT-001');
    });

    it('verifies result object referential isolation and unique observability IDs across identical canonical invocations', () => {
      const run1 = osEndToEndLoopExecutor.executeCanonicalLoop();
      const run2 = osEndToEndLoopExecutor.executeCanonicalLoop();

      // Separate result allocations
      expect(run1).not.toBe(run2);
      expect(run1.stages).not.toBe(run2.stages);
      expect(run1.stages.observability).not.toBe(
        run2.stages.observability,
      );

      // Canonical payload and status remain stable
      expect(run1.scenarioName).toEqual(run2.scenarioName);
      expect(run1.eventId).toEqual(run2.eventId);
      expect(run1.sourceRecordId).toEqual(run2.sourceRecordId);
      expect(run1.status).toEqual(run2.status);
      expect(run1.errors).toEqual(run2.errors);

      // Every invocation produces five distinct observations
      const ids1 = (run1.stages.observability ?? []).map(
        (obs) => obs.id,
      );

      const ids2 = (run2.stages.observability ?? []).map(
        (obs) => obs.id,
      );

      expect(ids1.length).toBe(5);
      expect(ids2.length).toBe(5);
      expect(new Set([...ids1, ...ids2]).size).toBe(10);
    });
  },
);