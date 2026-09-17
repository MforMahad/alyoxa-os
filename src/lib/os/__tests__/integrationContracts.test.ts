import { describe, it, expect } from '@jest/globals';
import {
  OSIntegrationContractStore,
  osIntegrationContractStore,
  osIntegrationContractsRegistry,
  OSIntegrationContract,
} from '../integrationContracts';
import { crossModuleReferencesRegistry } from '../crossModuleReferences';

describe('OS Integration Contracts (Phase 12.7 Hardened)', () => {
  it('loads canonical contracts and validates successfully', () => {
    expect(osIntegrationContractsRegistry.length).toBe(4);
    expect(osIntegrationContractStore.size).toBe(4);

    const c1 = osIntegrationContractStore.getContract('CONTRACT-001');
    expect(c1).toBeDefined();
    expect(c1?.sourceModule).toBe('SIGNAL');
    expect(c1?.targetModule).toBe('AI');
    expect(c1?.crossModuleRefId).toBe('CMR-001');
    expect(c1?.requiredReferences).toEqual(['obs_89412a']);
  });

  it('rejects duplicate contract IDs on addContract', () => {
    const store = new OSIntegrationContractStore();
    const duplicate: OSIntegrationContract = {
      id: 'CONTRACT-001',
      sourceModule: 'SIGNAL',
      targetModule: 'AI',
      sourceRecordType: 'observation',
      targetRecordType: 'decision',
      purpose: 'Duplicate test',
      requiredReferences: ['obs_89412a'],
      crossModuleRefId: 'CMR-001',
      createdAt: '2026-08-30T13:00:00Z',
      metadata: {},
    };
    expect(() => store.addContract(duplicate)).toThrow();
  });

  it('rejects invalid fields and structures during addContract', () => {
    const store = new OSIntegrationContractStore();

    // Invalid sourceModule
    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'INVALID' as any,
        targetModule: 'AI',
        sourceRecordType: 'observation',
        targetRecordType: 'decision',
        purpose: 'Invalid module',
        requiredReferences: ['obs_89412a'],
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: {},
      })
    ).toThrow();

    // Invalid targetModule
    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'SIGNAL',
        targetModule: 'INVALID' as any,
        sourceRecordType: 'observation',
        targetRecordType: 'decision',
        purpose: 'Invalid module',
        requiredReferences: ['obs_89412a'],
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: {},
      })
    ).toThrow();

    // Empty ID
    expect(() =>
      store.addContract({
        id: '',
        sourceModule: 'SIGNAL',
        targetModule: 'AI',
        sourceRecordType: 'observation',
        targetRecordType: 'decision',
        purpose: 'Empty ID',
        requiredReferences: ['obs_89412a'],
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: {},
      })
    ).toThrow();

    // Empty sourceRecordType
    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'SIGNAL',
        targetModule: 'AI',
        sourceRecordType: '',
        targetRecordType: 'decision',
        purpose: 'Empty sourceRecordType',
        requiredReferences: ['obs_89412a'],
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: {},
      })
    ).toThrow();

    // Empty targetRecordType
    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'SIGNAL',
        targetModule: 'AI',
        sourceRecordType: 'observation',
        targetRecordType: '',
        purpose: 'Empty targetRecordType',
        requiredReferences: ['obs_89412a'],
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: {},
      })
    ).toThrow();

    // Empty purpose
    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'SIGNAL',
        targetModule: 'AI',
        sourceRecordType: 'observation',
        targetRecordType: 'decision',
        purpose: '',
        requiredReferences: ['obs_89412a'],
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: {},
      })
    ).toThrow();

    // Non-array requiredReferences
    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'SIGNAL',
        targetModule: 'AI',
        sourceRecordType: 'observation',
        targetRecordType: 'decision',
        purpose: 'Invalid requiredReferences',
        requiredReferences: 'obs_89412a' as any,
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: {},
      })
    ).toThrow();

    // Invalid entry in requiredReferences
    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'SIGNAL',
        targetModule: 'AI',
        sourceRecordType: 'observation',
        targetRecordType: 'decision',
        purpose: 'Invalid requiredReferences entry',
        requiredReferences: [''],
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: {},
      })
    ).toThrow();

    // Invalid crossModuleRefId
    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'SIGNAL',
        targetModule: 'AI',
        sourceRecordType: 'observation',
        targetRecordType: 'decision',
        purpose: 'Invalid crossModuleRefId',
        crossModuleRefId: '',
        requiredReferences: ['obs_89412a'],
        createdAt: '2026-08-30T13:00:00Z',
        metadata: {},
      })
    ).toThrow();

    // Invalid metadata (not plain object)
    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'SIGNAL',
        targetModule: 'AI',
        sourceRecordType: 'observation',
        targetRecordType: 'decision',
        purpose: 'Invalid metadata',
        requiredReferences: ['obs_89412a'],
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: null as any,
      })
    ).toThrow();

    expect(() =>
      store.addContract({
        id: 'CONTRACT-999',
        sourceModule: 'SIGNAL',
        targetModule: 'AI',
        sourceRecordType: 'observation',
        targetRecordType: 'decision',
        purpose: 'Invalid metadata array',
        requiredReferences: ['obs_89412a'],
        crossModuleRefId: 'CMR-TEST',
        createdAt: '2026-08-30T13:00:00Z',
        metadata: [] as any,
      })
    ).toThrow();
  });

  it('ensures getContract and getAll immutability', () => {
    const fetched = osIntegrationContractStore.getContract('CONTRACT-001');
    expect(fetched).toBeDefined();
    if (fetched) {
      fetched.requiredReferences.push('TAMPERED');
      fetched.metadata.hacked = true;
    }

    const fetchedAgain = osIntegrationContractStore.getContract('CONTRACT-001');
    expect(fetchedAgain?.requiredReferences).toEqual(['obs_89412a']);
    expect(fetchedAgain?.metadata.hacked).toBeUndefined();

    const all = osIntegrationContractStore.getAll();
    all[0].requiredReferences.push('TAMPERED');
    const allAgain = osIntegrationContractStore.getAll();
    expect(allAgain[0].requiredReferences).toEqual(['obs_89412a']);
  });

  it('supports source and target module queries correctly', () => {
    const signalSources = osIntegrationContractStore.getBySourceModule('SIGNAL');
    expect(signalSources.length).toBe(2);

    const pulseTargets = osIntegrationContractStore.getByTargetModule('PULSE');
    expect(pulseTargets.length).toBe(2);
  });

  it('supports custom store isolation and canonical registry isolation', () => {
    const customStore = new OSIntegrationContractStore([]);
    expect(customStore.size).toBe(0);

    customStore.addContract({
      id: 'CONTRACT-CUSTOM',
      sourceModule: 'SYSTEM',
      targetModule: 'SYSTEM',
      sourceRecordType: 'sys_event',
      targetRecordType: 'sys_ack',
      purpose: 'Custom test',
      requiredReferences: ['SYS-001'],
      crossModuleRefId: 'CMR-TEST',
      createdAt: '2026-08-30T13:00:00Z',
      metadata: {},
    });

    expect(customStore.size).toBe(1);
    expect(osIntegrationContractStore.size).toBe(4);
  });

  it('validates against canonical 12.4 cross-module references externally in verification', () => {
    const refMap = new Map(crossModuleReferencesRegistry.map((r) => [r.id, r]));
    const contracts = osIntegrationContractStore.getAll();

    for (const contract of contracts) {
      if (contract.crossModuleRefId) {
        const ref = refMap.get(contract.crossModuleRefId);
        expect(ref).toBeDefined();
        if (ref) {
          expect(contract.sourceModule).toBe(ref.sourceModule);
          expect(contract.targetModule).toBe(ref.targetModule);
          expect(contract.requiredReferences).toContain(ref.sourceRecordId);
        }
      }
    }
  });
});