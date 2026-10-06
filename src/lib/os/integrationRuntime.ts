import {
    OSIntegrationContract,
    OSIntegrationModule,
    osIntegrationContractStore,
    OSIntegrationContractStore,
  } from './integrationContracts';
  import {
    crossModuleReferencesRegistry,
    CrossModuleReference,
  } from './crossModuleReferences';
  import { OSEvent, OSEventAction } from '../../data/os/events';

  // Re-export OSIntegrationModule for downstream consumer runtimes
export type { OSIntegrationModule };
  
  export interface OSIntegrationSource {
    module: OSIntegrationModule;
    recordId: string;
    recordType: string;
  }
  
  export interface OSIntegrationHandoff {
    contractId: string;
    source: OSIntegrationSource;
    targetModule: OSIntegrationModule;
    targetRecordType: string;
    requiredReferences: string[];
    metadata: Record<string, unknown>;
    status: 'HANDOFF_PREPARED';
  }
  
  export type OSIntegrationResolutionStatus =
    | 'matched'
    | 'not_found'
    | 'invalid';
  
  export interface OSIntegrationResult {
    status: OSIntegrationResolutionStatus;
    source: OSIntegrationSource;
    handoffs: OSIntegrationHandoff[];
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
  
  // Aligned exactly with the locked 12.1 OSEventAction union
  const CANONICAL_ACTIONS: ReadonlySet<OSEventAction> = new Set<OSEventAction>([
    'created',
    'updated',
    'received',
    'started',
    'completed',
    'failed',
    'approved',
    'rejected',
    'archived',
    'resolved',
    'dispatched',
  ]);
  
  export class OSIntegrationRuntime {
    private contractStore: OSIntegrationContractStore;
    private refRegistry: ReadonlyArray<CrossModuleReference>;
  
    constructor(
      contractStore: OSIntegrationContractStore = osIntegrationContractStore,
      refRegistry: ReadonlyArray<CrossModuleReference> = crossModuleReferencesRegistry
    ) {
      this.contractStore = contractStore;
      this.refRegistry = refRegistry;
    }
  
    /**
     * Resolves, validates, and prepares declarative handoffs for a given source record.
     * Pure and deterministic with zero execution side effects.
     */
    public resolveAndPrepare(source: Readonly<OSIntegrationSource>): OSIntegrationResult {
      const safeSource: OSIntegrationSource = structuredClone(source);
      const errors: string[] = [];
  
      // 1. Module Vocabulary Validation
      if (!CANONICAL_MODULES.has(safeSource.module)) {
        return {
          status: 'invalid',
          source: safeSource,
          handoffs: [],
          errors: [`Invalid source module "${safeSource.module}".`],
        };
      }
  
      // 2. Contract Resolution
      const candidateContracts = this.contractStore
        .getAll()
        .filter(
          (contract) =>
            contract.sourceModule === safeSource.module &&
            contract.sourceRecordType === safeSource.recordType &&
            contract.requiredReferences.includes(safeSource.recordId)
        );
  
      if (candidateContracts.length === 0) {
        return {
          status: 'not_found',
          source: safeSource,
          handoffs: [],
          errors: [`No matching integration contracts found for recordId "${safeSource.recordId}".`],
        };
      }
  
      const preparedHandoffs: OSIntegrationHandoff[] = [];
      const refMap = new Map(this.refRegistry.map((ref) => [ref.id, ref]));
  
      // 3. Contract Validation & Handoff Preparation
      for (const contract of candidateContracts) {
        const validationError = this.validateContract(contract, safeSource, refMap);
  
        if (validationError) {
          errors.push(validationError);
          continue;
        }
  
        const handoff: OSIntegrationHandoff = {
          contractId: contract.id,
          source: structuredClone(safeSource),
          targetModule: contract.targetModule,
          targetRecordType: contract.targetRecordType,
          requiredReferences: structuredClone(contract.requiredReferences),
          metadata: {
            ...structuredClone(contract.metadata),
            preparedAtStage: 'RUNTIME_HANDOFF_PREPARED',
          },
          status: 'HANDOFF_PREPARED',
        };
  
        preparedHandoffs.push(handoff);
      }
  
      if (preparedHandoffs.length === 0 && errors.length > 0) {
        return {
          status: 'invalid',
          source: safeSource,
          handoffs: [],
          errors,
        };
      }
  
      return {
        status: preparedHandoffs.length > 0 ? 'matched' : 'not_found',
        source: safeSource,
        handoffs: preparedHandoffs,
        errors,
      };
    }
  
    /**
     * Accepts an OSEvent input, extracts the source record, and resolves matching contract handoffs.
     * Input-only processing with zero Event Bus subscription or side effects.
     */
    public resolveEventAndPrepare(event: Readonly<OSEvent>): OSIntegrationResult {
      const safeEvent: OSEvent = structuredClone(event);
  
      // Validate Event Action against canonical 12.1 vocabulary
      if (!CANONICAL_ACTIONS.has(safeEvent.action)) {
        const source: OSIntegrationSource = {
          module: safeEvent.module as OSIntegrationModule,
          recordId: safeEvent.recordId || '',
          recordType: safeEvent.recordType || '',
        };
  
        return {
          status: 'invalid',
          source,
          handoffs: [],
          errors: [`Unsupported or non-canonical event action "${safeEvent.action}".`],
        };
      }
  
      // Validate Event Module without mutating to SYSTEM
      if (!CANONICAL_MODULES.has(safeEvent.module as OSIntegrationModule)) {
        const source: OSIntegrationSource = {
          module: safeEvent.module as OSIntegrationModule,
          recordId: safeEvent.recordId || '',
          recordType: safeEvent.recordType || '',
        };
  
        return {
          status: 'invalid',
          source,
          handoffs: [],
          errors: [`Invalid source module "${safeEvent.module}" in event.`],
        };
      }
  
      // Direct extraction without text parsing or heuristics
      const source: OSIntegrationSource = {
        module: safeEvent.module as OSIntegrationModule,
        recordId: safeEvent.recordId,
        recordType: safeEvent.recordType,
      };
  
      const result = this.resolveAndPrepare(source);
  
      // Decorate handoff metadata with explicit event attribution
      if (result.handoffs.length > 0) {
        result.handoffs = result.handoffs.map((handoff) => ({
          ...handoff,
          metadata: {
            ...handoff.metadata,
            resolvedFromEventId: safeEvent.id,
            resolvedFromEventAction: safeEvent.action,
          },
        }));
      }
  
      return result;
    }
  
    private validateContract(
      contract: Readonly<OSIntegrationContract>,
      source: Readonly<OSIntegrationSource>,
      refMap: Map<string, CrossModuleReference>
    ): string | null {
      if (contract.sourceModule !== source.module) {
        return `Contract ${contract.id} sourceModule "${contract.sourceModule}" does not match source module "${source.module}".`;
      }
  
      if (contract.sourceRecordType !== source.recordType) {
        return `Contract ${contract.id} sourceRecordType "${contract.sourceRecordType}" does not match source recordType "${source.recordType}".`;
      }
  
      if (!contract.requiredReferences.includes(source.recordId)) {
        return `Contract ${contract.id} requiredReferences does not contain source recordId "${source.recordId}".`;
      }
  
      if (contract.crossModuleRefId) {
        const canonicalRef = refMap.get(contract.crossModuleRefId);
  
        if (!canonicalRef) {
          return `Contract ${contract.id} references non-existent canonical CrossModuleRef "${contract.crossModuleRefId}".`;
        }
  
        if (canonicalRef.sourceModule !== contract.sourceModule) {
          return `Canonical Ref "${canonicalRef.id}" sourceModule "${canonicalRef.sourceModule}" mismatches contract sourceModule "${contract.sourceModule}".`;
        }
  
        if (canonicalRef.targetModule !== contract.targetModule) {
          return `Canonical Ref "${canonicalRef.id}" targetModule "${canonicalRef.targetModule}" mismatches contract targetModule "${contract.targetModule}".`;
        }
  
        if (canonicalRef.sourceRecordId !== source.recordId) {
          return `Canonical Ref "${canonicalRef.id}" sourceRecordId "${canonicalRef.sourceRecordId}" does not match supplied source recordId "${source.recordId}".`;
        }
      }
  
      return null;
    }
  }

  
  
  export const osIntegrationRuntime = new OSIntegrationRuntime();