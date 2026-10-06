import {
    OSIntegrationObservation,
    OSRuntimeStage,
    OSRuntimeObservationStatus,
  } from './integrationObservability';
  import { OSIntegrationContractStore, osIntegrationContractStore } from './integrationContracts';
  import { OSIntegrationModule } from './integrationContracts';
  
  export interface OSObservationValidationResult {
    valid: boolean;
    observationId: string;
    errors: string[];
  }
  
  const VALID_MODULES: readonly OSIntegrationModule[] = [
    'SIGNAL',
    'AI',
    'FORGE',
    'PULSE',
    'VAULT',
    'SYSTEM',
  ];
  
  const VALID_STAGES: readonly OSRuntimeStage[] = [
    'INTEGRATION_RESOLUTION',
    'EVENT_RESOLUTION',
    'CONTEXT_HANDOFF',
    'MODULE_HANDOFF',
    'RUNTIME_SAFETY',
  ];
  
  const VALID_STATUSES: readonly OSRuntimeObservationStatus[] = [
    'started',
    'completed',
    'failed',
  ];
  
  export class OSObservabilityValidator {
    constructor(
      private readonly contractStore: OSIntegrationContractStore = osIntegrationContractStore
    ) {}
  
    validateObservation(observation: OSIntegrationObservation): OSObservationValidationResult {
      const errors: string[] = [];
      const observationId = observation?.id ?? '';
  
      // 1. ID Check
      if (!observationId || typeof observationId !== 'string' || observationId.trim() === '') {
        errors.push('Observation ID must be a non-empty string.');
      }
  
      // 2. Timestamp Check (ISO 8601)
      if (!observation?.timestamp || typeof observation.timestamp !== 'string') {
        errors.push('Timestamp must be a valid ISO 8601 string.');
      } else {
        const parsedDate = Date.parse(observation.timestamp);
        if (Number.isNaN(parsedDate)) {
          errors.push(`Invalid timestamp format: "${observation.timestamp}". Expected ISO 8601.`);
        }
      }
  
      // 3. Stage Check
      const stage = observation?.stage;
      if (!stage || !(VALID_STAGES as readonly string[]).includes(stage)) {
        errors.push(`Invalid observation stage: "${String(stage)}".`);
      }
  
      // 4. Status Check
      const status = observation?.status;
      if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
        errors.push(`Invalid observation status: "${String(status)}".`);
      }
  
      // 5. Source Module Check
      if (!observation?.sourceModule || !VALID_MODULES.includes(observation.sourceModule)) {
        errors.push(`Invalid sourceModule: "${String(observation?.sourceModule)}".`);
      }
  
      // 6. Source Record ID Check
      if (
        !observation?.sourceRecordId ||
        typeof observation.sourceRecordId !== 'string' ||
        observation.sourceRecordId.trim() === ''
      ) {
        errors.push('Source record ID must be a non-empty string.');
      }
  
      // 7. Target Module Check (if present)
      if (observation?.targetModule !== undefined && observation.targetModule !== null) {
        if (!VALID_MODULES.includes(observation.targetModule)) {
          errors.push(`Invalid targetModule: "${String(observation.targetModule)}".`);
        }
      }
  
      // 8. Contract Verification
      if (observation?.contractId) {
        const contract = this.contractStore.getContract(observation.contractId);
        if (!contract) {
          errors.push(`Contract ID "${observation.contractId}" does not exist in the contract store.`);
        } else {
          if (observation.sourceModule && observation.sourceModule !== contract.sourceModule) {
            errors.push(
              `Source module mismatch: observation sourceModule "${observation.sourceModule}" does not match contract sourceModule "${contract.sourceModule}".`
            );
          }
          if (
            observation.targetModule !== undefined &&
            observation.targetModule !== null &&
            observation.targetModule !== contract.targetModule
          ) {
            errors.push(
              `Target module mismatch: observation targetModule "${observation.targetModule}" does not match contract targetModule "${contract.targetModule}".`
            );
          }
        }
      }
  
      // 9. Stage-Specific Semantics
      if (observation?.stage === 'RUNTIME_SAFETY') {
        if (observation.status === 'failed') {
          const hasSummary =
            typeof observation.summary === 'string' && observation.summary.trim() !== '';
          if (!hasSummary) {
            errors.push('RUNTIME_SAFETY failed observation must include diagnostic summary.');
          }
        }
      }
  
      return {
        valid: errors.length === 0,
        observationId,
        errors,
      };
    }
  }
  
  export const osObservabilityValidator = new OSObservabilityValidator();