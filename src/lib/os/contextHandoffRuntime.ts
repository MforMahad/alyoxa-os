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