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
  crossModuleRefId: string;
  requiredReferences: string[];
  purpose: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export const osIntegrationContractsRegistry: OSIntegrationContract[] = [
  {
    id: 'CONTRACT-001',
    sourceModule: 'SIGNAL',
    targetModule: 'AI',
    sourceRecordType: 'observation',
    targetRecordType: 'decision',
    crossModuleRefId: 'CMR-001',
    requiredReferences: ['obs_89412a'],
    purpose:
      'Provide Signal billing failure observation context from Signal to AI decision evaluation.',
    createdAt: '2026-08-30T12:00:00Z',
    metadata: {
      contractScope: 'billing_context_provision',
      enforcementLevel: 'strict',
    },
  },
  {
    id: 'CONTRACT-002',
    sourceModule: 'AI',
    targetModule: 'FORGE',
    sourceRecordType: 'decision',
    targetRecordType: 'execution_task',
    crossModuleRefId: 'CMR-002',
    requiredReferences: ['DEC-001'],
    purpose:
      'Provide AI billing recovery decision context to Forge execution task creation.',
    createdAt: '2026-08-30T12:05:00Z',
    metadata: {
      contractScope: 'execution_task_context_provision',
      enforcementLevel: 'strict',
    },
  },
  {
    id: 'CONTRACT-003',
    sourceModule: 'FORGE',
    targetModule: 'PULSE',
    sourceRecordType: 'execution_task',
    targetRecordType: 'request',
    crossModuleRefId: 'CMR-005',
    requiredReferences: ['TASK-001'],
    purpose:
      'Provide Forge task context to Pulse status evaluation requests.',
    createdAt: '2026-08-30T12:10:00Z',
    metadata: {
      contractScope: 'status_request_context',
      enforcementLevel: 'strict',
    },
  },
  {
    id: 'CONTRACT-004',
    sourceModule: 'SIGNAL',
    targetModule: 'PULSE',
    sourceRecordType: 'insight',
    targetRecordType: 'request',
    crossModuleRefId: 'CMR-004',
    requiredReferences: ['ins_7721'],
    purpose:
      'Provide Signal billing failure insight context to Pulse decision evaluation requests.',
    createdAt: '2026-08-30T12:15:00Z',
    metadata: {
      contractScope: 'billing_insight_evaluation_context',
      enforcementLevel: 'strict',
    },
  },
];

const VALID_MODULES: ReadonlySet<string> = new Set([
  'SIGNAL',
  'AI',
  'FORGE',
  'PULSE',
  'VAULT',
  'SYSTEM',
]);

export class OSIntegrationContractStore {
  private contracts: Map<string, OSIntegrationContract> = new Map();

  constructor(initialRegistry: OSIntegrationContract[] = osIntegrationContractsRegistry) {
    for (const contract of initialRegistry) {
      this.addContract(contract);
    }
  }

  addContract(contract: Readonly<OSIntegrationContract>): void {
    this.validateContract(contract);
    this.contracts.set(contract.id, this.cloneContract(contract));
  }

  getContract(id: string): OSIntegrationContract | undefined {
    const contract = this.contracts.get(id);
    return contract ? this.cloneContract(contract) : undefined;
  }

  getAll(): OSIntegrationContract[] {
    return Array.from(this.contracts.values()).map((c) => this.cloneContract(c));
  }

  getBySourceModule(module: OSIntegrationModule): OSIntegrationContract[] {
    const result: OSIntegrationContract[] = [];
  
    for (const contract of this.contracts.values()) {
      if (contract.sourceModule === module) {
        result.push(this.cloneContract(contract));
      }
    }
  
    return result;
  }
  
  getByTargetModule(module: OSIntegrationModule): OSIntegrationContract[] {
    const result: OSIntegrationContract[] = [];
  
    for (const contract of this.contracts.values()) {
      if (contract.targetModule === module) {
        result.push(this.cloneContract(contract));
      }
    }
  
    return result;
  }

  get size(): number {
    return this.contracts.size;
  }

  private validateContract(contract: Readonly<OSIntegrationContract>): void {
    if (!contract.id || contract.id.trim() === '') {
      throw new Error('[OSIntegrationContractStore] Contract id must be a non-empty string.');
    }

    if (!VALID_MODULES.has(contract.sourceModule)) {
      throw new Error(
        `[OSIntegrationContractStore] Invalid sourceModule "${contract.sourceModule}" for contract "${contract.id}".`
      );
    }

    if (!VALID_MODULES.has(contract.targetModule)) {
      throw new Error(
        `[OSIntegrationContractStore] Invalid targetModule "${contract.targetModule}" for contract "${contract.id}".`
      );
    }

    if (!contract.sourceRecordType || contract.sourceRecordType.trim() === '') {
      throw new Error(
        `[OSIntegrationContractStore] Contract "${contract.id}" sourceRecordType must be a non-empty string.`
      );
    }

    if (!contract.targetRecordType || contract.targetRecordType.trim() === '') {
      throw new Error(
        `[OSIntegrationContractStore] Contract "${contract.id}" targetRecordType must be a non-empty string.`
      );
    }

    if (!contract.purpose || contract.purpose.trim() === '') {
      throw new Error(
        `[OSIntegrationContractStore] Contract "${contract.id}" purpose must be a non-empty string.`
      );
    }

    if (
      !Array.isArray(contract.requiredReferences) ||
      contract.requiredReferences.some(
        (ref) => !ref || typeof ref !== 'string' || ref.trim() === ''
      )
    ) {
      throw new Error(
        `[OSIntegrationContractStore] Contract "${contract.id}" requiredReferences must be an array of non-empty strings.`
      );
    }

    if (!contract.crossModuleRefId || contract.crossModuleRefId.trim() === '') {
      throw new Error(
        `[OSIntegrationContractStore] Contract "${contract.id}" crossModuleRefId must be a non-empty string.`
      );
    }

    if (
      !contract.metadata ||
      Object.prototype.toString.call(contract.metadata) !== '[object Object]'
    ) {
      throw new Error(
        `[OSIntegrationContractStore] Contract "${contract.id}" metadata must be a plain object.`
      );
    }

    if (this.contracts.has(contract.id)) {
      throw new Error(
        `[OSIntegrationContractStore] Duplicate contract ID rejected: ${contract.id}`
      );
    }
  }

  private cloneContract(contract: OSIntegrationContract): OSIntegrationContract {
    return {
      ...contract,
      requiredReferences: [...contract.requiredReferences],
      metadata: contract.metadata ? structuredClone(contract.metadata) : {},
    };
  }
}

export const osIntegrationContractStore = new OSIntegrationContractStore();