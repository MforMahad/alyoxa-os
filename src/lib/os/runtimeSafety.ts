import { OSIntegrationModule } from './integrationRuntime';
import { OSModuleHandoffResult } from './moduleHandoffRuntime';
import {
  crossModuleReferencesRegistry,
  CrossModuleReference,
} from './crossModuleReferences';
import {
  osIntegrationContractsRegistry,
  OSIntegrationContract,
} from './integrationContracts';

export type OSRuntimeSafetyStatus = 'valid' | 'invalid';

export interface OSRuntimeSafetyResult {
  status: OSRuntimeSafetyStatus;
  targetModule: OSIntegrationModule | null;
  targetRecordType: string;
  sourceRecordId: string;
  contractId: string;
  handoffResult: OSModuleHandoffResult | null;
  metadata: Record<string, unknown>;
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

export class OSRuntimeSafetyValidator {
  private refRegistry: ReadonlyArray<CrossModuleReference>;
  private contractRegistry: ReadonlyArray<OSIntegrationContract>;

  constructor(
    refRegistry: ReadonlyArray<CrossModuleReference> = crossModuleReferencesRegistry,
    contractRegistry: ReadonlyArray<OSIntegrationContract> = osIntegrationContractsRegistry
  ) {
    this.refRegistry = refRegistry;
    this.contractRegistry = contractRegistry;
  }

  public validateHandoff(
    handoffResult: Readonly<OSModuleHandoffResult>
  ): OSRuntimeSafetyResult {
    if (!handoffResult) {
      return this.buildInvalidResult(handoffResult, ['Module handoff result is null or undefined.']);
    }

    const safeResult: OSModuleHandoffResult = structuredClone(handoffResult);
    const errors: string[] = [];

    // 1. Validate status: must be 'prepared' or 'not_supported' (structurally valid unhandled canonical target)
    if (safeResult.status !== 'prepared' && safeResult.status !== 'not_supported') {
      errors.push(`Invalid handoff status "${safeResult.status}". Expected "prepared" or "not_supported".`);
    }

    // 2. Validate package existence
    const pkg = safeResult.package;
    if (!pkg) {
      errors.push('Handoff result contains no context handoff package.');
      return this.buildInvalidResult(safeResult, errors);
    }

    // Envelope vs Package Integrity Validation
    if (safeResult.targetModule !== pkg.targetModule) {
      errors.push(
        `Envelope targetModule "${safeResult.targetModule}" does not match package targetModule "${pkg.targetModule}".`
      );
    }

    if (safeResult.targetRecordType !== pkg.targetRecordType) {
      errors.push(
        `Envelope targetRecordType "${safeResult.targetRecordType}" does not match package targetRecordType "${pkg.targetRecordType}".`
      );
    }

    if (safeResult.sourceRecordId !== pkg.source?.recordId) {
      errors.push(
        `Envelope sourceRecordId "${safeResult.sourceRecordId}" does not match package source.recordId "${pkg.source?.recordId}".`
      );
    }

    if (safeResult.contractId !== pkg.contractId) {
      errors.push(
        `Envelope contractId "${safeResult.contractId}" does not match package contractId "${pkg.contractId}".`
      );
    }

    // 3. Validate target module is canonical
    if (!pkg.targetModule || !CANONICAL_MODULES.has(pkg.targetModule)) {
      errors.push(`Target module "${pkg.targetModule}" is missing or non-canonical.`);
    }

    // 4. Validate source module is canonical and record ID exists
    if (!pkg.source || !pkg.source.module || !CANONICAL_MODULES.has(pkg.source.module)) {
      errors.push(`Source module "${pkg.source?.module}" is missing or non-canonical.`);
    }

    if (!pkg.source?.recordId || pkg.source.recordId.trim() === '') {
      errors.push('Source record ID is missing or empty.');
    }

    // 5. Validate contract existence and canonical alignment
    if (!pkg.contractId || pkg.contractId.trim() === '') {
      errors.push('Contract ID is missing or empty.');
    } else {
      const canonicalContract = this.contractRegistry.find((c) => c.id === pkg.contractId);

      if (!canonicalContract) {
        errors.push(`Contract "${pkg.contractId}" not found in canonical integration contracts registry.`);
      } else {
        if (canonicalContract.sourceModule !== pkg.source.module) {
          errors.push(
            `Canonical contract sourceModule "${canonicalContract.sourceModule}" does not match package source module "${pkg.source.module}".`
          );
        }

        if (canonicalContract.targetModule !== pkg.targetModule) {
          errors.push(
            `Canonical contract targetModule "${canonicalContract.targetModule}" does not match package target module "${pkg.targetModule}".`
          );
        }

        if (canonicalContract.sourceRecordType !== pkg.source.recordType) {
          errors.push(
            `Canonical contract sourceRecordType "${canonicalContract.sourceRecordType}" does not match package source recordType "${pkg.source.recordType}".`
          );
        }

        if (canonicalContract.targetRecordType !== pkg.targetRecordType) {
          errors.push(
            `Canonical contract targetRecordType "${canonicalContract.targetRecordType}" does not match package target recordType "${pkg.targetRecordType}".`
          );
        }
      }
    }

    // 6. Validate target record type existence
    if (!pkg.targetRecordType || pkg.targetRecordType.trim() === '') {
      errors.push('Target record type is missing or empty.');
    }

    // 7. Validate required references presence
    if (!pkg.references || pkg.references.length === 0) {
      errors.push('Required references array is missing or empty.');
    }

    // 8-11. Canonical Reference Resolution & Consistency
    if (pkg.references && pkg.references.length > 0) {
      const refMap = new Map(this.refRegistry.map((ref) => [ref.id, ref]));

      for (const packageRef of pkg.references) {
        const canonicalRef = refMap.get(packageRef.id);

        if (!canonicalRef) {
          errors.push(`Reference "${packageRef.id}" not found in canonical reference registry.`);
          continue;
        }

        if (canonicalRef.sourceModule !== pkg.source.module) {
          errors.push(
            `Canonical reference sourceModule "${canonicalRef.sourceModule}" does not match package source module "${pkg.source.module}".`
          );
        }

        if (canonicalRef.targetModule !== pkg.targetModule) {
          errors.push(
            `Canonical reference targetModule "${canonicalRef.targetModule}" does not match package target module "${pkg.targetModule}".`
          );
        }

        if (canonicalRef.sourceRecordId !== pkg.source.recordId) {
          errors.push(
            `Canonical reference sourceRecordId "${canonicalRef.sourceRecordId}" does not match package source recordId "${pkg.source.recordId}".`
          );
        }
      }
    }

    if (errors.length > 0) {
      return this.buildInvalidResult(safeResult, errors);
    }

    return {
      status: 'valid',
      targetModule: safeResult.targetModule,
      targetRecordType: safeResult.targetRecordType,
      sourceRecordId: safeResult.sourceRecordId,
      contractId: safeResult.contractId,
      handoffResult: safeResult,
      metadata: {
        validatedAtStage: 'RUNTIME_SAFETY_PASSED',
        adapterSupported: safeResult.status === 'prepared',
      },
      errors: [],
    };
  }

  private buildInvalidResult(
    handoffResult: Readonly<OSModuleHandoffResult> | null,
    errors: string[]
  ): OSRuntimeSafetyResult {
    return {
      status: 'invalid',
      targetModule: handoffResult?.targetModule || null,
      targetRecordType: handoffResult?.targetRecordType || '',
      sourceRecordId: handoffResult?.sourceRecordId || '',
      contractId: handoffResult?.contractId || '',
      handoffResult: null,
      metadata: {},
      errors,
    };
  }
}

export const osRuntimeSafetyValidator = new OSRuntimeSafetyValidator();