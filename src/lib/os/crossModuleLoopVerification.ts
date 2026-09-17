import { crossModuleReferenceStore, CrossModuleReference } from './crossModuleReferences';
import { osIntegrationContractStore, OSIntegrationContract } from './integrationContracts';
import { osScenarioManager } from './scenarioDefinition';

export type OSCrossModuleVerificationStatus = 'valid' | 'invalid';

export interface LinkVerificationDetail {
  linkId: string;
  contractId: string;
  sourceModule: string;
  sourceRecordId: string;
  sourceRecordType: string;
  targetModule: string;
  targetRecordId: string;
  targetRecordType: string;
  verified: boolean;
  errors: string[];
}

export interface OSCrossModuleVerificationResult {
  status: OSCrossModuleVerificationStatus;
  scenarioName: string;
  chain: string[];
  verifiedReferences: LinkVerificationDetail[];
  verifiedContracts: string[];
  errors: string[];
}

export interface VerificationRegistries {
  getReference: (id: string) => CrossModuleReference | undefined;
  getContract: (id: string) => OSIntegrationContract | undefined;
}

const defaultRegistries: VerificationRegistries = {
  getReference: (id) => crossModuleReferenceStore.getReference(id),
  getContract: (id) => osIntegrationContractStore.getContract(id),
};

interface CanonicalLinkSpec {
  linkId: string;
  contractId: string;
  expectedSourceModule: string;
  expectedSourceRecord: string;
  expectedSourceRecordType: string;
  expectedTargetModule: string;
  expectedTargetRecord: string;
  expectedTargetRecordType: string;
}

const CANONICAL_LINKS: CanonicalLinkSpec[] = [
  {
    linkId: 'CMR-001',
    contractId: 'CONTRACT-001',
    expectedSourceModule: 'SIGNAL',
    expectedSourceRecord: 'obs_89412a',
    expectedSourceRecordType: 'observation',
    expectedTargetModule: 'AI',
    expectedTargetRecord: 'DEC-001',
    expectedTargetRecordType: 'decision',
  },
  {
    linkId: 'CMR-002',
    contractId: 'CONTRACT-002',
    expectedSourceModule: 'AI',
    expectedSourceRecord: 'DEC-001',
    expectedSourceRecordType: 'decision',
    expectedTargetModule: 'FORGE',
    expectedTargetRecord: 'TASK-001',
    expectedTargetRecordType: 'execution_task',
  },
  {
    linkId: 'CMR-005',
    contractId: 'CONTRACT-003',
    expectedSourceModule: 'FORGE',
    expectedSourceRecord: 'TASK-001',
    expectedSourceRecordType: 'execution_task',
    expectedTargetModule: 'PULSE',
    expectedTargetRecord: 'REQ-001',
    expectedTargetRecordType: 'request',
  },
  {
    linkId: 'CMR-004',
    contractId: 'CONTRACT-004',
    expectedSourceModule: 'SIGNAL',
    expectedSourceRecord: 'ins_7721',
    expectedSourceRecordType: 'insight',
    expectedTargetModule: 'PULSE',
    expectedTargetRecord: 'REQ-001',
    expectedTargetRecordType: 'request',
  },
];

export function verifyCrossModuleLoop(customRegistries?: VerificationRegistries): OSCrossModuleVerificationResult {
  const regs = customRegistries || defaultRegistries;
  const errors: string[] = [];
  const verifiedReferences: LinkVerificationDetail[] = [];
  const verifiedContracts: string[] = [];

  const scenario = osScenarioManager.getCanonicalScenario();

  for (const spec of CANONICAL_LINKS) {
    const linkErrors: string[] = [];
    const ref = regs.getReference(spec.linkId);
    const contract = regs.getContract(spec.contractId);

    if (!ref) {
      linkErrors.push(`Missing cross-module reference: ${spec.linkId}`);
    }

    if (!contract) {
      linkErrors.push(`Missing integration contract: ${spec.contractId}`);
    }

    if (ref && contract) {
      if (contract.crossModuleRefId !== spec.linkId) {
        linkErrors.push(`Contract ${spec.contractId} references CMR ID ${contract.crossModuleRefId}, expected ${spec.linkId}`);
      }

      if (ref.sourceModule !== spec.expectedSourceModule) {
        linkErrors.push(`Reference ${spec.linkId} sourceModule "${ref.sourceModule}" does not match expected "${spec.expectedSourceModule}"`);
      }

      if (ref.targetModule !== spec.expectedTargetModule) {
        linkErrors.push(`Reference ${spec.linkId} targetModule "${ref.targetModule}" does not match expected "${spec.expectedTargetModule}"`);
      }

      if (contract.sourceModule !== spec.expectedSourceModule) {
        linkErrors.push(`Contract ${spec.contractId} sourceModule "${contract.sourceModule}" does not match expected "${spec.expectedSourceModule}"`);
      }

      if (contract.targetModule !== spec.expectedTargetModule) {
        linkErrors.push(`Contract ${spec.contractId} targetModule "${contract.targetModule}" does not match expected "${spec.expectedTargetModule}"`);
      }

      if (ref.sourceRecordId !== spec.expectedSourceRecord) {
        linkErrors.push(`Reference ${spec.linkId} sourceRecordId "${ref.sourceRecordId}" does not match expected "${spec.expectedSourceRecord}"`);
      }

      if (ref.targetRecordId !== spec.expectedTargetRecord) {
        linkErrors.push(`Reference ${spec.linkId} targetRecordId "${ref.targetRecordId}" does not match expected "${spec.expectedTargetRecord}"`);
      }

      if (contract.sourceRecordType !== spec.expectedSourceRecordType) {
        linkErrors.push(`Contract ${spec.contractId} sourceRecordType "${contract.sourceRecordType}" does not match expected "${spec.expectedSourceRecordType}"`);
      }

      if (contract.targetRecordType !== spec.expectedTargetRecordType) {
        linkErrors.push(`Contract ${spec.contractId} targetRecordType "${contract.targetRecordType}" does not match expected "${spec.expectedTargetRecordType}"`);
      }

      if (contract.requiredReferences && !contract.requiredReferences.includes(spec.expectedSourceRecord)) {
        linkErrors.push(`Contract ${spec.contractId} requiredReferences does not include expected source record "${spec.expectedSourceRecord}"`);
      }
    }

    const verified = linkErrors.length === 0;
    if (verified) {
      verifiedContracts.push(spec.contractId);
    } else {
      errors.push(...linkErrors);
    }

    verifiedReferences.push({
      linkId: spec.linkId,
      contractId: spec.contractId,
      sourceModule: spec.expectedSourceModule,
      sourceRecordId: spec.expectedSourceRecord,
      sourceRecordType: spec.expectedSourceRecordType,
      targetModule: spec.expectedTargetModule,
      targetRecordId: spec.expectedTargetRecord,
      targetRecordType: spec.expectedTargetRecordType,
      verified,
      errors: linkErrors,
    });
  }

  const status: OSCrossModuleVerificationStatus = errors.length === 0 ? 'valid' : 'invalid';
  const recs = scenario.records;
  const chain = [
    `${recs.signal.module} / ${recs.signal.recordId}`,
    `${recs.ai.module} / ${recs.ai.recordId}`,
    `${recs.forge.module} / ${recs.forge.recordId}`,
    `${recs.pulse.module} / ${recs.pulse.recordId}`,
  ];

  return {
    status,
    scenarioName: scenario.name,
    chain,
    verifiedReferences,
    verifiedContracts,
    errors,
  };
}