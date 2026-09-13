import { OSIntegrationModule } from './integrationRuntime';
import { OSContextHandoffPackage } from './contextHandoffRuntime';
import {
  crossModuleReferencesRegistry,
  CrossModuleReference,
} from './crossModuleReferences';

export type OSModuleHandoffExecutionStatus =
  | 'prepared'
  | 'invalid'
  | 'not_supported';

export interface OSModuleHandoffResult {
  status: OSModuleHandoffExecutionStatus;
  targetModule: OSIntegrationModule | null;
  targetRecordType: string;
  sourceRecordId: string;
  contractId: string;
  package: OSContextHandoffPackage | null;
  metadata: Record<string, unknown>;
  errors: string[];
}

export interface OSModuleHandoffAdapter {
  module: OSIntegrationModule;
  accepts(handoff: Readonly<OSContextHandoffPackage>): boolean;
  prepare(handoff: Readonly<OSContextHandoffPackage>): OSModuleHandoffResult;
}

const CANONICAL_MODULES: ReadonlySet<OSIntegrationModule> = new Set([
  'SIGNAL',
  'AI',
  'FORGE',
  'PULSE',
  'VAULT',
  'SYSTEM',
]);

// Modular declarative adapters (No execution side-effects)
export class DeclarativeModuleHandoffAdapter implements OSModuleHandoffAdapter {
  public readonly module: OSIntegrationModule;

  constructor(module: OSIntegrationModule) {
    this.module = module;
  }

  public accepts(handoff: Readonly<OSContextHandoffPackage>): boolean {
    return handoff.targetModule === this.module;
  }

  public prepare(handoff: Readonly<OSContextHandoffPackage>): OSModuleHandoffResult {
    const safePackage = structuredClone(handoff);

    return {
      status: 'prepared',
      targetModule: safePackage.targetModule,
      targetRecordType: safePackage.targetRecordType,
      sourceRecordId: safePackage.source.recordId,
      contractId: safePackage.contractId,
      package: safePackage,
      metadata: {
        preparedAtStage: 'MODULE_HANDOFF_READY',
        adapterModule: this.module,
      },
      errors: [],
    };
  }
}

export class OSModuleHandoffAdapterRegistry {
  private adapters = new Map<OSIntegrationModule, OSModuleHandoffAdapter>();

  constructor(adapters: ReadonlyArray<OSModuleHandoffAdapter> = []) {
    for (const adapter of adapters) {
      this.register(adapter);
    }
  }

  public register(adapter: OSModuleHandoffAdapter): void {
    this.adapters.set(adapter.module, adapter);
  }

  public getByModule(module: OSIntegrationModule): OSModuleHandoffAdapter | undefined {
    return this.adapters.get(module);
  }

  public has(module: OSIntegrationModule): boolean {
    return this.adapters.has(module);
  }

  public getAll(): ReadonlyArray<OSModuleHandoffAdapter> {
    return Array.from(this.adapters.values());
  }
}

// Built-in register only for modules with active target boundaries
export const osModuleHandoffAdapterRegistry = new OSModuleHandoffAdapterRegistry([
  new DeclarativeModuleHandoffAdapter('AI'),
  new DeclarativeModuleHandoffAdapter('FORGE'),
  new DeclarativeModuleHandoffAdapter('PULSE'),
]);

export class OSModuleHandoffRuntime {
  private adapterRegistry: OSModuleHandoffAdapterRegistry;
  private refRegistry: ReadonlyArray<CrossModuleReference>;

  constructor(
    adapterRegistry: OSModuleHandoffAdapterRegistry = osModuleHandoffAdapterRegistry,
    refRegistry: ReadonlyArray<CrossModuleReference> = crossModuleReferencesRegistry
  ) {
    this.adapterRegistry = adapterRegistry;
    this.refRegistry = refRegistry;
  }

  public prepareModuleHandoff(
    pkg: Readonly<OSContextHandoffPackage>
  ): OSModuleHandoffResult {
    if (!pkg) {
      return this.buildInvalidResult(pkg, ['Package is null or undefined.']);
    }

    const safePackage: OSContextHandoffPackage = structuredClone(pkg);
    const errors: string[] = [];

    // 1. Validate status
    if (safePackage.status !== 'CONTEXT_HANDOFF_PREPARED') {
      errors.push(`Invalid package status "${safePackage.status}".`);
    }

    // 2. Validate target module canonical vocabulary
    if (!CANONICAL_MODULES.has(safePackage.targetModule)) {
      errors.push(`Invalid target module "${safePackage.targetModule}".`);
    }

    // 3. Validate source
    if (!safePackage.source || !safePackage.source.module || !safePackage.source.recordId) {
      errors.push('Invalid or missing source record.');
    }

    // 4. Validate contract ID
    if (!safePackage.contractId) {
      errors.push('Missing contractId.');
    }

    // 5. Validate references presence
    if (!safePackage.references || safePackage.references.length === 0) {
      errors.push('Missing required references.');
    }

    // 6. Canonical Reference Verification
    if (safePackage.references && safePackage.references.length > 0) {
      const refMap = new Map(this.refRegistry.map((ref) => [ref.id, ref]));

      for (const packageRef of safePackage.references) {
        const canonicalRef = refMap.get(packageRef.id);

        if (!canonicalRef) {
          errors.push(`Reference "${packageRef.id}" not found in canonical reference registry.`);
          continue;
        }

        if (canonicalRef.sourceModule !== safePackage.source.module) {
          errors.push(
            `Canonical reference sourceModule "${canonicalRef.sourceModule}" does not match package source module "${safePackage.source.module}".`
          );
        }

        if (canonicalRef.targetModule !== safePackage.targetModule) {
          errors.push(
            `Canonical reference targetModule "${canonicalRef.targetModule}" does not match package target module "${safePackage.targetModule}".`
          );
        }

        if (canonicalRef.sourceRecordId !== safePackage.source.recordId) {
          errors.push(
            `Canonical reference sourceRecordId "${canonicalRef.sourceRecordId}" does not match package source recordId "${safePackage.source.recordId}".`
          );
        }
      }
    }

    if (errors.length > 0) {
      return this.buildInvalidResult(safePackage, errors);
    }

    // Route to Target Module Adapter
    const adapter = this.adapterRegistry.getByModule(safePackage.targetModule);

    if (!adapter) {
      return {
        status: 'not_supported',
        targetModule: safePackage.targetModule,
        targetRecordType: safePackage.targetRecordType,
        sourceRecordId: safePackage.source.recordId,
        contractId: safePackage.contractId,
        package: safePackage,
        metadata: {
          reason: `No execution adapter registered for canonical module "${safePackage.targetModule}".`,
        },
        errors: [],
      };
    }

    if (!adapter.accepts(safePackage)) {
      return this.buildInvalidResult(safePackage, [
        `Adapter for module "${adapter.module}" rejected the handoff package.`,
      ]);
    }

    return adapter.prepare(safePackage);
  }

  private buildInvalidResult(
    pkg: Readonly<OSContextHandoffPackage> | null,
    errors: string[]
  ): OSModuleHandoffResult {
    return {
      status: 'invalid',
      targetModule: pkg?.targetModule || null,
      targetRecordType: pkg?.targetRecordType || '',
      sourceRecordId: pkg?.source?.recordId || '',
      contractId: pkg?.contractId || '',
      package: null,
      metadata: {},
      errors,
    };
  }
}

export const osModuleHandoffRuntime = new OSModuleHandoffRuntime();