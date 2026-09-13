export type OSIntegrationModule =
  | 'SIGNAL'
  | 'AI'
  | 'FORGE'
  | 'PULSE'
  | 'VAULT'
  | 'SYSTEM';

export interface OSIntegrationContract {
  id: string;
  sourceModule: OSIntegrationModule;
  targetModule: OSIntegrationModule;
  sourceRecordType: string;
  targetRecordType: string;
  purpose: string;
  crossModuleRefId?: string;
  requiredReferences: string[];
  metadata: Record<string, unknown>;
}

const VALID_MODULES = new Set<OSIntegrationModule>([
  'SIGNAL',
  'AI',
  'FORGE',
  'PULSE',
  'VAULT',
  'SYSTEM',
]);

function validateContract(contract: OSIntegrationContract): void {
  if (!contract || typeof contract !== 'object') {
    throw new Error('Contract must be a valid object.');
  }
  if (typeof contract.id !== 'string' || contract.id.trim() === '') {
    throw new Error('Contract id must be a non-empty string.');
  }
  if (!VALID_MODULES.has(contract.sourceModule)) {
    throw new Error(`Invalid sourceModule: ${String(contract.sourceModule)}`);
  }
  if (!VALID_MODULES.has(contract.targetModule)) {
    throw new Error(`Invalid targetModule: ${String(contract.targetModule)}`);
  }
  if (typeof contract.sourceRecordType !== 'string' || contract.sourceRecordType.trim() === '') {
    throw new Error('sourceRecordType must be a non-empty string.');
  }
  if (typeof contract.targetRecordType !== 'string' || contract.targetRecordType.trim() === '') {
    throw new Error('targetRecordType must be a non-empty string.');
  }
  if (typeof contract.purpose !== 'string' || contract.purpose.trim() === '') {
    throw new Error('purpose must be a non-empty string.');
  }
  if (!Array.isArray(contract.requiredReferences)) {
    throw new Error('requiredReferences must be an array.');
  }
  for (const ref of contract.requiredReferences) {
    if (typeof ref !== 'string' || ref.trim() === '') {
      throw new Error('Every requiredReferences entry must be a non-empty string.');
    }
  }
  if (contract.crossModuleRefId !== undefined) {
    if (typeof contract.crossModuleRefId !== 'string' || contract.crossModuleRefId.trim() === '') {
      throw new Error('crossModuleRefId must be a non-empty string if provided.');
    }
  }
  if (
    !contract.metadata ||
    typeof contract.metadata !== 'object' ||
    Array.isArray(contract.metadata) ||
    Object.prototype.toString.call(contract.metadata) !== '[object Object]'
  ) {
    throw new Error('metadata must be a plain object.');
  }
}

/**
 * Deterministic OS Integration Contracts Registry.
 * Purely declarative contracts defining inter-module context and reference exchange expectations.
 */
export const osIntegrationContractsRegistry: OSIntegrationContract[] = [
  {
    id: 'CONTRACT-001',
    sourceModule: 'SIGNAL',
    targetModule: 'AI',
    sourceRecordType: 'observation',
    targetRecordType: 'Decision',
    purpose: 'Provide telemetry latency observation context from Signal to AI decision evaluation.',
    crossModuleRefId: 'CMR-001',
    requiredReferences: ['OBS-001'],
    metadata: {
      contractScope: 'telemetry_context_provision',
    },
  },
  {
    id: 'CONTRACT-002',
    sourceModule: 'AI',
    targetModule: 'FORGE',
    sourceRecordType: 'decision',
    targetRecordType: 'Task',
    purpose: 'Provide AI rate limit decision context to Forge task creation.',
    crossModuleRefId: 'CMR-002',
    requiredReferences: ['DEC-001'],
    metadata: {
      contractScope: 'task_context_provision',
    },
  },
  {
    id: 'CONTRACT-003',
    sourceModule: 'FORGE',
    targetModule: 'PULSE',
    sourceRecordType: 'execution_task',
    targetRecordType: 'Request',
    purpose: 'Provide Forge task context to Pulse status evaluation requests.',
    crossModuleRefId: 'CMR-005',
    requiredReferences: ['TASK-001'],
    metadata: {
      contractScope: 'status_request_context',
    },
  },
  {
    id: 'CONTRACT-004',
    sourceModule: 'SIGNAL',
    targetModule: 'PULSE',
    sourceRecordType: 'insight',
    targetRecordType: 'Request',
    purpose: 'Provide Signal insight context to Pulse decision evaluation requests.',
    crossModuleRefId: 'CMR-004',
    requiredReferences: ['INS-001'],
    metadata: {
      contractScope: 'insight_evaluation_context',
    },
  },
];

export class OSIntegrationContractStore {
  private contracts: Map<string, OSIntegrationContract> = new Map();

  constructor(initialRegistry: OSIntegrationContract[] = osIntegrationContractsRegistry) {
    for (const item of initialRegistry) {
      this.addContract(item);
    }
  }

  addContract(contract: Readonly<OSIntegrationContract>): void {
    validateContract(contract as OSIntegrationContract);
    if (this.contracts.has(contract.id)) {
      throw new Error(`Contract with ID "${contract.id}" already exists.`);
    }
    this.contracts.set(contract.id, structuredClone(contract));
  }

  getContract(id: string): OSIntegrationContract | undefined {
    const contract = this.contracts.get(id);
    return contract ? structuredClone(contract) : undefined;
  }

  getAll(): OSIntegrationContract[] {
    return Array.from(this.contracts.values()).map((c) => structuredClone(c));
  }

  getBySourceModule(module: OSIntegrationModule): OSIntegrationContract[] {
    const result: OSIntegrationContract[] = [];
    for (const contract of this.contracts.values()) {
      if (contract.sourceModule === module) {
        result.push(structuredClone(contract));
      }
    }
    return result;
  }

  getByTargetModule(module: OSIntegrationModule): OSIntegrationContract[] {
    const result: OSIntegrationContract[] = [];
    for (const contract of this.contracts.values()) {
      if (contract.targetModule === module) {
        result.push(structuredClone(contract));
      }
    }
    return result;
  }

  get size(): number {
    return this.contracts.size;
  }
}

export const osIntegrationContractStore = new OSIntegrationContractStore();