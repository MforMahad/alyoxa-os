import {
    osEndToEndLoopExecutor,
    OSEndToEndLoopExecutor,
    OSEndToEndLoopResult,
  } from './endToEndLoop';
  import { OSContextHandoffPackage } from './contextHandoffRuntime';
  import { OSModuleHandoffResult } from './moduleHandoffRuntime';
  import { OSRuntimeSafetyResult } from './runtimeSafety';
  import { SharedContextEntry, SharedContextReference } from './sharedContext';
  import { CrossModuleReference } from './crossModuleReferences';
  import { osEventBus } from './eventBus';
  import { osScenarioManager } from './scenarioDefinition';
  
  export type OSContextContinuityStatus = 'valid' | 'invalid';
  
  export interface ContextContinuityDetail {
    stage: string;
    verified: boolean;
    errors: string[];
  }
  
  export interface OSContextContinuityResult {
    status: OSContextContinuityStatus;
    scenarioName: string;
    sourceIdentity: {
      module: string;
      recordId: string;
      recordType: string;
    };
    contractId: string;
    targetIdentity: {
      module: string;
      recordType: string;
    };
    contextEntries: SharedContextEntry[];
    references: CrossModuleReference[];
    stages: ContextContinuityDetail[];
    errors: string[];
  }
  
  export interface ContextContinuityRuntime {
    executeCanonicalLoop: (invocationIndex?: number) => OSEndToEndLoopResult;
  }
  
  const defaultRuntime: ContextContinuityRuntime = osEndToEndLoopExecutor;
  
  function clone<T>(value: T): T {
    return structuredClone(value);
  }
  
  function compareContextReferences(
    left: SharedContextReference,
    right: SharedContextReference,
    path: string,
    errors: string[]
  ): void {
    if (left.module !== right.module) {
      errors.push(
        `${path}.module changed from "${left.module}" to "${right.module}".`
      );
    }
  
    if (left.recordId !== right.recordId) {
      errors.push(
        `${path}.recordId changed from "${left.recordId}" to "${right.recordId}".`
      );
    }
  
    if (left.recordType !== right.recordType) {
      errors.push(
        `${path}.recordType changed from "${left.recordType}" to "${right.recordType}".`
      );
    }
  }
  
  function compareCrossModuleReferences(
    left: CrossModuleReference,
    right: CrossModuleReference,
    path: string,
    errors: string[]
  ): void {
    if (left.id !== right.id) {
      errors.push(`${path}.id changed.`);
    }
  
    if (left.sourceModule !== right.sourceModule) {
      errors.push(`${path}.sourceModule changed.`);
    }
  
    if (left.sourceRecordId !== right.sourceRecordId) {
      errors.push(`${path}.sourceRecordId changed.`);
    }
  
    if (left.targetModule !== right.targetModule) {
      errors.push(`${path}.targetModule changed.`);
    }
  
    if (left.targetRecordId !== right.targetRecordId) {
      errors.push(`${path}.targetRecordId changed.`);
    }
  
    if (left.type !== right.type) {
      errors.push(`${path}.type changed.`);
    }
  }
  
  function compareContextEntries(
    left: SharedContextEntry,
    right: SharedContextEntry,
    path: string,
    errors: string[]
  ): void {
    if (left.id !== right.id) {
      errors.push(`${path}.id changed.`);
    }
  
    compareContextReferences(
      left.source,
      right.source,
      `${path}.source`,
      errors
    );
  
    if (left.title !== right.title) {
      errors.push(`${path}.title changed.`);
    }
  
    if (left.summary !== right.summary) {
      errors.push(`${path}.summary changed.`);
    }
  
    if (left.timestamp !== right.timestamp) {
      errors.push(`${path}.timestamp changed.`);
    }
  
    if (left.relevance !== right.relevance) {
      errors.push(`${path}.relevance changed.`);
    }
  
    if (left.references.length !== right.references.length) {
      errors.push(`${path}.references length changed.`);
    }
  
    const referenceCount = Math.min(
      left.references.length,
      right.references.length
    );
  
    for (let index = 0; index < referenceCount; index += 1) {
      compareContextReferences(
        left.references[index],
        right.references[index],
        `${path}.references[${index}]`,
        errors
      );
    }
  }
  
  function comparePackages(
    source: OSContextHandoffPackage,
    target: OSContextHandoffPackage,
    errors: string[]
  ): void {
    if (source.contractId !== target.contractId) {
      errors.push('Context package contractId changed.');
    }
  
    if (source.source.module !== target.source.module) {
      errors.push('Context package source module changed.');
    }
  
    if (source.source.recordId !== target.source.recordId) {
      errors.push('Context package source recordId changed.');
    }
  
    if (source.source.recordType !== target.source.recordType) {
      errors.push('Context package source recordType changed.');
    }
  
    if (source.targetModule !== target.targetModule) {
      errors.push('Context package target module changed.');
    }
  
    if (source.targetRecordType !== target.targetRecordType) {
      errors.push('Context package target recordType changed.');
    }
  
    if (source.references.length !== target.references.length) {
      errors.push('Context package references length changed.');
    }
  
    const referenceCount = Math.min(
      source.references.length,
      target.references.length
    );
  
    for (let index = 0; index < referenceCount; index += 1) {
      compareCrossModuleReferences(
        source.references[index],
        target.references[index],
        `references[${index}]`,
        errors
      );
    }
  
    if (source.contextEntries.length !== target.contextEntries.length) {
      errors.push('Context package contextEntries length changed.');
    }
  
    const entryCount = Math.min(
      source.contextEntries.length,
      target.contextEntries.length
    );
  
    for (let index = 0; index < entryCount; index += 1) {
      compareContextEntries(
        source.contextEntries[index],
        target.contextEntries[index],
        `contextEntries[${index}]`,
        errors
      );
    }
  }
  
  function verifyModuleHandoffContinuity(
    contextPackage: OSContextHandoffPackage,
    moduleResult: OSModuleHandoffResult,
    errors: string[]
  ): void {
    if (!moduleResult.package) {
      errors.push('Module handoff does not contain a context package.');
      return;
    }
  
    comparePackages(
      contextPackage,
      moduleResult.package,
      errors
    );
  
    if (moduleResult.contractId !== contextPackage.contractId) {
      errors.push('Module handoff contractId does not match context handoff.');
    }
  
    if (moduleResult.sourceRecordId !== contextPackage.source.recordId) {
      errors.push('Module handoff sourceRecordId does not match context handoff.');
    }
  
    if (moduleResult.targetModule !== contextPackage.targetModule) {
      errors.push('Module handoff targetModule does not match context handoff.');
    }
  
    if (moduleResult.targetRecordType !== contextPackage.targetRecordType) {
      errors.push(
        'Module handoff targetRecordType does not match context handoff.'
      );
    }
  }
  
  function verifyRuntimeSafetyContinuity(
    moduleResult: OSModuleHandoffResult,
    safetyResult: OSRuntimeSafetyResult,
    errors: string[]
  ): void {
    if (!safetyResult.handoffResult) {
      errors.push('Runtime safety result does not contain a handoff result.');
      return;
    }
  
    const safetyHandoff = safetyResult.handoffResult;
  
    if (safetyResult.contractId !== moduleResult.contractId) {
      errors.push('Runtime safety contractId changed.');
    }
  
    if (safetyResult.sourceRecordId !== moduleResult.sourceRecordId) {
      errors.push('Runtime safety sourceRecordId changed.');
    }
  
    if (safetyResult.targetModule !== moduleResult.targetModule) {
      errors.push('Runtime safety targetModule changed.');
    }
  
    if (safetyResult.targetRecordType !== moduleResult.targetRecordType) {
      errors.push('Runtime safety targetRecordType changed.');
    }
  
    if (!safetyHandoff.package || !moduleResult.package) {
      errors.push('Runtime safety lost the context handoff package.');
      return;
    }
  
    comparePackages(
      moduleResult.package,
      safetyHandoff.package,
      errors
    );
  }
  
  export function verifyContextContinuity(
    runtime: ContextContinuityRuntime = defaultRuntime,
    invocationIndex: number = 1
  ): OSContextContinuityResult {
    const listenerCountBefore = osEventBus.listenerCount;
  
    const scenario = osScenarioManager.getCanonicalScenario();
  
    const loop = runtime.executeCanonicalLoop(invocationIndex);
  
    const errors: string[] = [];
    const stages: ContextContinuityDetail[] = [];
  
    const expectedSource = {
      module: scenario.records.signal.module,
      recordId: scenario.records.signal.recordId,
      recordType: 'observation',
    };
  
    const eventResolution = loop.stages.eventResolution;
    const contextHandoff = loop.stages.contextHandoff;
    const moduleHandoff = loop.stages.moduleHandoff;
    const runtimeSafety = loop.stages.runtimeSafety;
  
    /*
     * Stage 1 — Event Resolution → Context Handoff
     */
    const eventErrors: string[] = [];
  
    if (!eventResolution) {
      eventErrors.push('Event resolution stage is missing.');
    }
  
    if (eventResolution) {
      if (eventResolution.source.module !== expectedSource.module) {
        eventErrors.push('Event resolution source module changed.');
      }
  
      if (eventResolution.source.recordId !== expectedSource.recordId) {
        eventErrors.push('Event resolution source recordId changed.');
      }
  
      if (eventResolution.source.recordType !== expectedSource.recordType) {
        eventErrors.push('Event resolution source recordType changed.');
      }
    }
  
    if (!contextHandoff?.package) {
      eventErrors.push('Context handoff package is missing.');
    } else if (eventResolution) {
      const firstHandoff = eventResolution.handoffs[0];
  
      if (!firstHandoff) {
        eventErrors.push('Event resolution contains no integration handoff.');
      } else {
        if (
          contextHandoff.package.source.module !== firstHandoff.source.module
        ) {
          eventErrors.push(
            'Context handoff source module does not match event resolution.'
          );
        }
  
        if (
          contextHandoff.package.source.recordId !== firstHandoff.source.recordId
        ) {
          eventErrors.push(
            'Context handoff source recordId does not match event resolution.'
          );
        }
  
        if (
          contextHandoff.package.source.recordType !==
          firstHandoff.source.recordType
        ) {
          eventErrors.push(
            'Context handoff source recordType does not match event resolution.'
          );
        }
  
        if (
          contextHandoff.package.contractId !== firstHandoff.contractId
        ) {
          eventErrors.push(
            'Context handoff contractId does not match event resolution.'
          );
        }
  
        if (
          contextHandoff.package.targetModule !== firstHandoff.targetModule
        ) {
          eventErrors.push(
            'Context handoff targetModule does not match event resolution.'
          );
        }
  
        if (
          contextHandoff.package.targetRecordType !==
          firstHandoff.targetRecordType
        ) {
          eventErrors.push(
            'Context handoff targetRecordType does not match event resolution.'
          );
        }
      }
    }
  
    if (eventErrors.length > 0) {
      errors.push(...eventErrors);
    }
  
    stages.push({
      stage: 'EVENT_TO_CONTEXT_HANDOFF',
      verified: eventErrors.length === 0,
      errors: eventErrors,
    });
  
    /*
     * Stage 2 — Context Handoff → Module Handoff
     */
    const moduleErrors: string[] = [];
  
    if (!contextHandoff?.package) {
      moduleErrors.push('Context handoff package is unavailable.');
    } else if (!moduleHandoff) {
      moduleErrors.push('Module handoff stage is missing.');
    } else {
      verifyModuleHandoffContinuity(
        contextHandoff.package,
        moduleHandoff,
        moduleErrors
      );
    }
  
    if (moduleErrors.length > 0) {
      errors.push(...moduleErrors);
    }
  
    stages.push({
      stage: 'CONTEXT_TO_MODULE_HANDOFF',
      verified: moduleErrors.length === 0,
      errors: moduleErrors,
    });
  
    /*
     * Stage 3 — Module Handoff → Runtime Safety
     */
    const safetyErrors: string[] = [];
  
    if (!moduleHandoff) {
      safetyErrors.push('Module handoff result is unavailable.');
    } else if (!runtimeSafety) {
      safetyErrors.push('Runtime safety stage is missing.');
    } else {
      verifyRuntimeSafetyContinuity(
        moduleHandoff,
        runtimeSafety,
        safetyErrors
      );
    }
  
    if (safetyErrors.length > 0) {
      errors.push(...safetyErrors);
    }
  
    stages.push({
      stage: 'MODULE_TO_RUNTIME_SAFETY',
      verified: safetyErrors.length === 0,
      errors: safetyErrors,
    });
  
    const finalPackage =
      runtimeSafety?.handoffResult?.package ??
      moduleHandoff?.package ??
      contextHandoff?.package;
  
    const contextEntries = finalPackage
      ? clone(finalPackage.contextEntries)
      : [];
  
    const references = finalPackage
      ? clone(finalPackage.references)
      : [];
  
    const listenerCountAfter = osEventBus.listenerCount;
  
    if (listenerCountBefore !== listenerCountAfter) {
      errors.push('Event bus listener count changed during verification.');
    }
  
    return {
      status: errors.length === 0 ? 'valid' : 'invalid',
      scenarioName: scenario.name,
      sourceIdentity: clone(expectedSource),
      contractId: finalPackage?.contractId ?? '',
      targetIdentity: {
        module: finalPackage?.targetModule ?? '',
        recordType: finalPackage?.targetRecordType ?? '',
      },
      contextEntries,
      references,
      stages,
      errors,
    };
  }
  
  export const osContextContinuityVerifier = {
    verify: (
      runtime: OSEndToEndLoopExecutor = osEndToEndLoopExecutor,
      invocationIndex: number = 1
    ): OSContextContinuityResult =>
      verifyContextContinuity(runtime, invocationIndex),
  };