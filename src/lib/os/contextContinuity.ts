import {
  OSIntegrationHandoff,
  OSIntegrationModule,
  OSIntegrationSource,
} from './integrationRuntime';
import {
  crossModuleReferencesRegistry,
  CrossModuleReference,
} from './crossModuleReferences';
import {
  sharedContextStore,
  SharedContextEntry,
  SharedContextStore,
} from './sharedContext';
import {
  osIntegrationContractStore,
  OSIntegrationContractStore,
} from './integrationContracts';
import { osScenarioManager } from './scenarioDefinition';
import { osEndToEndLoopExecutor, OSEndToEndLoopResult } from './endToEndLoop';
import { osEventBus } from './eventBus';

export interface OSContextHandoffPackage {
  contractId: string;
  source: OSIntegrationSource;
  targetModule: OSIntegrationModule;
  targetRecordType: string;
  references: CrossModuleReference[];
  contextEntries: SharedContextEntry[];
  metadata: Record<string, unknown>;
  status: 'CONTEXT_HANDOFF_PREPARED';
}

export type OSContextHandoffStatus = 'prepared' | 'invalid' | 'not_found';

export interface OSContextHandoffResult {
  status: OSContextHandoffStatus;
  package: OSContextHandoffPackage | null;
  errors: string[];
}

const CANONICAL_MODULES: ReadonlySet<OSIntegrationModule> = new Set([
  'SIGNAL',
  'AI',
  'FORGE',
  'PULSE',
  'VAULT',
  'SYSTEM',
]);

export class OSContextHandoffRuntime {
  private refRegistry: ReadonlyArray<CrossModuleReference>;
  private contextStore: SharedContextStore;
  private contractStore: OSIntegrationContractStore;

  constructor(
    refRegistry: ReadonlyArray<CrossModuleReference> = crossModuleReferencesRegistry,
    contextStore: SharedContextStore = sharedContextStore,
    contractStore: OSIntegrationContractStore = osIntegrationContractStore
  ) {
    this.refRegistry = refRegistry;
    this.contextStore = contextStore;
    this.contractStore = contractStore;
  }

  /**
   * Accepts a prepared OSIntegrationHandoff and builds a deterministic OSContextHandoffPackage.
   * Aligned strictly with Phase 12.3 SharedContextEntry & 12.4 CrossModuleReference schemas.
   */
  public prepareContextHandoff(
    handoff: Readonly<OSIntegrationHandoff>
  ): OSContextHandoffResult {
    const safeHandoff: OSIntegrationHandoff = structuredClone(handoff);
    const errors: string[] = [];

    // 1. Validate handoff status
    if (safeHandoff.status !== 'HANDOFF_PREPARED') {
      return {
        status: 'invalid',
        package: null,
        errors: [
          `Invalid handoff status "${safeHandoff.status}". Expected "HANDOFF_PREPARED".`,
        ],
      };
    }

    // 2. Validate module vocabulary
    if (!CANONICAL_MODULES.has(safeHandoff.source.module)) {
      return {
        status: 'invalid',
        package: null,
        errors: [`Invalid source module "${safeHandoff.source.module}".`],
      };
    }

    if (!CANONICAL_MODULES.has(safeHandoff.targetModule)) {
      return {
        status: 'invalid',
        package: null,
        errors: [`Invalid target module "${safeHandoff.targetModule}".`],
      };
    }

    // 3. Resolve Integration Contract using contract store helper (.getById / .getAll)
    const contracts = this.contractStore.getAll();
    const contract = contracts.find((c) => c.id === safeHandoff.contractId);

    if (!contract) {
      return {
        status: 'not_found',
        package: null,
        errors: [
          `Integration contract "${safeHandoff.contractId}" not found in contract store.`,
        ],
      };
    }

    // Validate contract-level record types and required references
    if (safeHandoff.source.recordType !== contract.sourceRecordType) {
      errors.push(
        `Handoff source recordType "${safeHandoff.source.recordType}" does not match contract sourceRecordType "${contract.sourceRecordType}".`
      );
    }

    if (safeHandoff.targetRecordType !== contract.targetRecordType) {
      errors.push(
        `Handoff targetRecordType "${safeHandoff.targetRecordType}" does not match contract targetRecordType "${contract.targetRecordType}".`
      );
    }

    if (
      safeHandoff.requiredReferences.length !== contract.requiredReferences.length ||
      !safeHandoff.requiredReferences.every(
        (val, idx) => val === contract.requiredReferences[idx]
      )
    ) {
      errors.push(
        `Handoff requiredReferences do not match contract requiredReferences.`
      );
    }

    // 4. Resolve canonical CrossModuleReference
    if (!contract.crossModuleRefId) {
      return {
        status: 'invalid',
        package: null,
        errors: [
          `Contract "${contract.id}" does not specify a crossModuleRefId.`,
        ],
      };
    }

    const refMap = new Map(this.refRegistry.map((ref) => [ref.id, ref]));
    const canonicalRef = refMap.get(contract.crossModuleRefId);

    if (!canonicalRef) {
      return {
        status: 'not_found',
        package: null,
        errors: [
          `Canonical CrossModuleReference "${contract.crossModuleRefId}" not found in registry.`,
        ],
      };
    }

    // 5. Validate Reference Alignment against Handoff
    if (canonicalRef.sourceModule !== safeHandoff.source.module) {
      errors.push(
        `Canonical ref "${canonicalRef.id}" sourceModule "${canonicalRef.sourceModule}" does not match handoff source module "${safeHandoff.source.module}".`
      );
    }

    if (canonicalRef.sourceRecordId !== safeHandoff.source.recordId) {
      errors.push(
        `Canonical ref "${canonicalRef.id}" sourceRecordId "${canonicalRef.sourceRecordId}" does not match handoff source recordId "${safeHandoff.source.recordId}".`
      );
    }

    if (canonicalRef.targetModule !== safeHandoff.targetModule) {
      errors.push(
        `Canonical ref "${canonicalRef.id}" targetModule "${canonicalRef.targetModule}" does not match handoff target module "${safeHandoff.targetModule}".`
      );
    }

    if (errors.length > 0) {
      return {
        status: 'invalid',
        package: null,
        errors,
      };
    }

    // 6. Query Shared Context using exact locked Phase 12.3 schema (source & references array)
    const allContextEntries = this.contextStore.getAll();
    const relevantContextEntries = allContextEntries.filter((entry) => {
      // Match primary source linkage
      const matchSource =
        entry.source.module === safeHandoff.source.module &&
        entry.source.recordId === safeHandoff.source.recordId;

      // Match target module / recordId across references array
      const matchTargetRef = entry.references.some(
        (ref) =>
          ref.module === safeHandoff.targetModule &&
          ref.recordId === canonicalRef.targetRecordId
      );

      return matchSource || matchTargetRef;
    });

    // 7. Assemble declarative OSContextHandoffPackage
    const handoffPackage: OSContextHandoffPackage = {
      contractId: safeHandoff.contractId,
      source: structuredClone(safeHandoff.source),
      targetModule: safeHandoff.targetModule,
      targetRecordType: safeHandoff.targetRecordType,
      references: [structuredClone(canonicalRef)],
      contextEntries: structuredClone(relevantContextEntries),
      metadata: {
        ...structuredClone(safeHandoff.metadata),
        preparedAtStage: 'CONTEXT_HANDOFF_PREPARED',
        resolvedRefId: canonicalRef.id,
        resolvedTargetRecordId: canonicalRef.targetRecordId,
      },
      status: 'CONTEXT_HANDOFF_PREPARED',
    };

    return {
      status: 'prepared',
      package: handoffPackage,
      errors: [],
    };
  }
}

export const osContextHandoffRuntime = new OSContextHandoffRuntime();

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

export function compareContextReferences(
  ref1: CrossModuleReference,
  ref2: CrossModuleReference
): boolean {
  return (
    ref1.id === ref2.id &&
    ref1.sourceModule === ref2.sourceModule &&
    ref1.sourceRecordId === ref2.sourceRecordId &&
    ref1.targetModule === ref2.targetModule &&
    ref1.targetRecordId === ref2.targetRecordId &&
    ref1.type === ref2.type
  );
}

export function compareCrossModuleReferences(
  refs1: CrossModuleReference[],
  refs2: CrossModuleReference[]
): boolean {
  if (refs1.length !== refs2.length) return false;
  return refs1.every((r1, i) => compareContextReferences(r1, refs2[i]));
}

export function compareSharedContextReferences(
  refs1: SharedContextEntry['references'],
  refs2: SharedContextEntry['references']
): boolean {
  if (refs1.length !== refs2.length) return false;
  return refs1.every((r1, i) => {
    const r2 = refs2[i];
    return (
      r1.module === r2.module &&
      r1.recordId === r2.recordId &&
      r1.recordType === r2.recordType
    );
  });
}

export function compareContextEntries(
  entries1: SharedContextEntry[],
  entries2: SharedContextEntry[]
): boolean {
  if (entries1.length !== entries2.length) return false;
  return entries1.every((e1, i) => {
    const e2 = entries2[i];
    return (
      e1.id === e2.id &&
      e1.source.module === e2.source.module &&
      e1.source.recordId === e2.source.recordId &&
      e1.source.recordType === e2.source.recordType &&
      e1.title === e2.title &&
      e1.summary === e2.summary &&
      e1.timestamp === e2.timestamp &&
      e1.relevance === e2.relevance &&
      e1.references.length === e2.references.length &&
      compareSharedContextReferences(e1.references, e2.references)
    );
  });
}

export function comparePackages(
  pkg1: OSContextHandoffPackage | null,
  pkg2: OSContextHandoffPackage | null
): boolean {
  if (!pkg1 && !pkg2) return true;
  if (!pkg1 || !pkg2) return false;
  return (
    pkg1.contractId === pkg2.contractId &&
    pkg1.source.module === pkg2.source.module &&
    pkg1.source.recordId === pkg2.source.recordId &&
    pkg1.source.recordType === pkg2.source.recordType &&
    pkg1.targetModule === pkg2.targetModule &&
    pkg1.targetRecordType === pkg2.targetRecordType &&
    pkg1.references.length === pkg2.references.length &&
    compareCrossModuleReferences(pkg1.references, pkg2.references) &&
    pkg1.contextEntries.length === pkg2.contextEntries.length &&
    compareContextEntries(pkg1.contextEntries, pkg2.contextEntries)
  );
}

export function verifyContextContinuity(
  runtime: ContextContinuityRuntime = osEndToEndLoopExecutor,
  invocationIndex: number = 1
): OSContextContinuityResult {
  const initialListenerCount = osEventBus.listenerCount;
  const errors: string[] = [];
  const stages: ContextContinuityDetail[] = [];

  const scenario = osScenarioManager.getCanonicalScenario();
  const scenarioName = scenario.name;
  
  if (!scenario.contracts || scenario.contracts.length === 0) {
    const errorMsg = 'Canonical scenario defines no contracts.';
    return {
      status: 'invalid',
      scenarioName,
      sourceIdentity: { module: '', recordId: '', recordType: '' },
      contractId: '',
      targetIdentity: { module: 'AI', recordType: 'decision' },
      contextEntries: [],
      references: [],
      stages: [{ stage: 'EVENT_TO_CONTEXT_HANDOFF', verified: false, errors: [errorMsg] }],
      errors: [errorMsg],
    };
  }

  const contractId = scenario.contracts[0];
  const expectedSourceModule = scenario.records.signal.module;
  const expectedSourceRecordId = scenario.records.signal.recordId;
  const expectedSourceRecordType = 'observation';
  const expectedTargetModule = 'AI';
  const expectedTargetRecordType = 'decision';

  const sourceIdentity = {
    module: expectedSourceModule,
    recordId: expectedSourceRecordId,
    recordType: expectedSourceRecordType,
  };

  const targetIdentity = {
    module: expectedTargetModule,
    recordType: expectedTargetRecordType,
  };

  const loopResult = runtime.executeCanonicalLoop(invocationIndex);

  const eventRes = loopResult.stages.eventResolution;
  const contextHandoff = loopResult.stages.contextHandoff;
  const moduleHandoff = loopResult.stages.moduleHandoff;
  const runtimeSafety = loopResult.stages.runtimeSafety;

  let pkg: OSContextHandoffPackage | null = null;
  if (contextHandoff && contextHandoff.package) {
    pkg = contextHandoff.package;
  }

  // Stage 1: EVENT_TO_CONTEXT_HANDOFF
  const stage1Errors: string[] = [];
  if (!eventRes) {
    stage1Errors.push('Event resolution stage missing.');
  } else {
    if (!eventRes.source) {
      stage1Errors.push('Event resolution source is missing.');
    } else {
      if (eventRes.source.module !== expectedSourceModule) {
        stage1Errors.push(`Event resolution source module mismatch.`);
      }
      if (eventRes.source.recordId !== expectedSourceRecordId) {
        stage1Errors.push(`Event resolution source recordId mismatch.`);
      }
      if (eventRes.source.recordType !== expectedSourceRecordType) {
        stage1Errors.push(`Event resolution source recordType mismatch.`);
      }
    }
  }

  if (!contextHandoff) {
    stage1Errors.push('Context handoff stage missing.');
  } else if (!pkg) {
    stage1Errors.push('Context handoff package is null.');
  } else {
    if (pkg.contractId !== contractId) {
      stage1Errors.push(`Context package contractId mismatch.`);
    }
    if (pkg.targetModule !== expectedTargetModule) {
      stage1Errors.push(`Context package targetModule mismatch.`);
    }
    if (pkg.targetRecordType !== expectedTargetRecordType) {
      stage1Errors.push(`Context package targetRecordType mismatch.`);
    }
    if (eventRes && eventRes.source) {
      if (pkg.source.module !== eventRes.source.module) {
        stage1Errors.push(`Package source module does not match event source module.`);
      }
      if (pkg.source.recordId !== eventRes.source.recordId) {
        stage1Errors.push(`Package source recordId does not match event source recordId.`);
      }
      if (pkg.source.recordType !== eventRes.source.recordType) {
        stage1Errors.push(`Package source recordType does not match event source recordType.`);
      }
    }
  }

  stages.push({
    stage: 'EVENT_TO_CONTEXT_HANDOFF',
    verified: stage1Errors.length === 0,
    errors: stage1Errors,
  });
  errors.push(...stage1Errors);

  // Stage 2: CONTEXT_TO_MODULE_HANDOFF
  const stage2Errors: string[] = [];
  if (!moduleHandoff) {
    stage2Errors.push('Module handoff stage missing.');
  } else {
    if (moduleHandoff.targetModule !== expectedTargetModule) {
      stage2Errors.push('Module handoff targetModule mismatch.');
    }
    if (moduleHandoff.package) {
      if (moduleHandoff.package.targetModule !== moduleHandoff.targetModule) {
        stage2Errors.push('Module handoff package targetModule does not match module handoff targetModule.');
      }
      if (moduleHandoff.package.targetRecordType !== expectedTargetRecordType) {
        stage2Errors.push('Module handoff package targetRecordType does not match canonical target recordType.');
      }
    }
    if (!comparePackages(pkg, moduleHandoff.package)) {
      stage2Errors.push('Module handoff package does not match context handoff package.');
    }
  }

  stages.push({
    stage: 'CONTEXT_TO_MODULE_HANDOFF',
    verified: stage2Errors.length === 0,
    errors: stage2Errors,
  });
  errors.push(...stage2Errors);

  // Stage 3: MODULE_TO_RUNTIME_SAFETY
  const stage3Errors: string[] = [];
  if (!runtimeSafety) {
    stage3Errors.push('Runtime safety stage missing.');
  } else {
    if (runtimeSafety.contractId !== contractId) {
      stage3Errors.push('Runtime safety contractId mismatch.');
    }
    if (runtimeSafety.targetModule !== expectedTargetModule) {
      stage3Errors.push('Runtime safety targetModule mismatch.');
    }
    if (runtimeSafety.sourceRecordId !== expectedSourceRecordId) {
      stage3Errors.push('Runtime safety sourceRecordId mismatch.');
    }
    if (moduleHandoff && runtimeSafety.handoffResult && runtimeSafety.handoffResult.package) {
      if (runtimeSafety.handoffResult.package.contractId !== moduleHandoff.package?.contractId) {
        stage3Errors.push('Runtime safety handoff package contractId does not match module handoff package contractId.');
      }
      const matchPackages = comparePackages(
        moduleHandoff.package,
        runtimeSafety.handoffResult.package
      );
      if (!matchPackages) {
        stage3Errors.push('Runtime safety handoff package does not match module handoff package.');
      }
    }
  }

  stages.push({
    stage: 'MODULE_TO_RUNTIME_SAFETY',
    verified: stage3Errors.length === 0,
    errors: stage3Errors,
  });
  errors.push(...stage3Errors);

  // Check event bus listener count invariant
  const finalListenerCount = osEventBus.listenerCount;
  if (finalListenerCount !== initialListenerCount) {
    errors.push(
      `EventBus listener count changed from ${initialListenerCount} to ${finalListenerCount}.`
    );
  }

  const contextEntries = structuredClone(pkg?.contextEntries ?? []);
  const references = structuredClone(pkg?.references ?? []);

  const overallStatus: OSContextContinuityStatus =
    errors.length === 0 ? 'valid' : 'invalid';

  return {
    status: overallStatus,
    scenarioName,
    sourceIdentity,
    contractId,
    targetIdentity,
    contextEntries,
    references,
    stages,
    errors,
  };
}

export const osContextContinuityVerifier = {
  verifyContextContinuity,
  verify: verifyContextContinuity,
};