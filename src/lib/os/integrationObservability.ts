import { OSIntegrationModule } from './integrationContracts';

export type OSRuntimeStage =
  | 'INTEGRATION_RESOLUTION'
  | 'EVENT_RESOLUTION'
  | 'CONTEXT_HANDOFF'
  | 'MODULE_HANDOFF'
  | 'RUNTIME_SAFETY';

export type OSRuntimeObservationStatus =
  | 'started'
  | 'completed'
  | 'failed';

export interface OSIntegrationObservation {
  id: string;
  stage: OSRuntimeStage;
  status: OSRuntimeObservationStatus;

  sourceModule: OSIntegrationModule;
  sourceRecordId: string;

  targetModule?: OSIntegrationModule;
  contractId?: string;

  timestamp: string;
  summary: string;

  metadata: Record<string, unknown>;
}

const CANONICAL_MODULES = new Set<OSIntegrationModule>([
  'SIGNAL',
  'PULSE',
  'AI',
  'FORGE',
  'VAULT',
  'SYSTEM',
]);

const CANONICAL_STAGES = new Set<OSRuntimeStage>([
  'INTEGRATION_RESOLUTION',
  'EVENT_RESOLUTION',
  'CONTEXT_HANDOFF',
  'MODULE_HANDOFF',
  'RUNTIME_SAFETY',
]);

const CANONICAL_STATUSES = new Set<OSRuntimeObservationStatus>([
  'started',
  'completed',
  'failed',
]);

export class OSIntegrationObservabilityStore {
  private readonly observations = new Map<string, OSIntegrationObservation>();

  private validate(observation: OSIntegrationObservation): void {
    if (!observation || typeof observation !== 'object') {
      throw new Error('[ObservabilityStore] Observation must be a valid object.');
    }

    if (!observation.id || observation.id.trim() === '') {
      throw new Error('[ObservabilityStore] Observation id must be a non-empty string.');
    }

    if (!observation.sourceModule || !CANONICAL_MODULES.has(observation.sourceModule)) {
      throw new Error(`[ObservabilityStore] Invalid sourceModule: ${observation.sourceModule}`);
    }

    if (!observation.sourceRecordId || observation.sourceRecordId.trim() === '') {
      throw new Error('[ObservabilityStore] Observation sourceRecordId must be a non-empty string.');
    }

    if (!observation.stage || !CANONICAL_STAGES.has(observation.stage)) {
      throw new Error(`[ObservabilityStore] Invalid stage: ${observation.stage}`);
    }

    if (!observation.status || !CANONICAL_STATUSES.has(observation.status)) {
      throw new Error(`[ObservabilityStore] Invalid status: ${observation.status}`);
    }

    if (!observation.timestamp || observation.timestamp.trim() === '') {
      throw new Error('[ObservabilityStore] Observation timestamp must be a non-empty string.');
    }

    if (!observation.summary || observation.summary.trim() === '') {
      throw new Error('[ObservabilityStore] Observation summary must be a non-empty string.');
    }

    if (observation.targetModule !== undefined && !CANONICAL_MODULES.has(observation.targetModule)) {
      throw new Error(`[ObservabilityStore] Invalid targetModule: ${observation.targetModule}`);
    }

    if (observation.contractId !== undefined && observation.contractId.trim() === '') {
      throw new Error('[ObservabilityStore] Observation contractId cannot be an empty string.');
    }
  }

  record(observation: OSIntegrationObservation): void {
    this.validate(observation);

    if (this.observations.has(observation.id)) {
      throw new Error(`[ObservabilityStore] Duplicate observation ID rejected: ${observation.id}`);
    }

    this.observations.set(observation.id, structuredClone(observation));
  }

  get(id: string): OSIntegrationObservation | undefined {
    const obs = this.observations.get(id);
    return obs ? structuredClone(obs) : undefined;
  }

  getAll(): OSIntegrationObservation[] {
    return Array.from(this.observations.values()).map((obs) => structuredClone(obs));
  }

  getByStage(stage: OSRuntimeStage): OSIntegrationObservation[] {
    return this.getAll().filter((obs) => obs.stage === stage);
  }

  getBySource(
    sourceModule: OSIntegrationModule,
    sourceRecordId: string
  ): OSIntegrationObservation[] {
    return this.getAll().filter(
      (obs) => obs.sourceModule === sourceModule && obs.sourceRecordId === sourceRecordId
    );
  }

  getByContract(contractId: string): OSIntegrationObservation[] {
    return this.getAll().filter((obs) => obs.contractId === contractId);
  }

  clear(): void {
    this.observations.clear();
  }

  get size(): number {
    return this.observations.size;
  }
}

export const osIntegrationObservabilityStore = new OSIntegrationObservabilityStore();