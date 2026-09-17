import { describe, it, expect } from '@jest/globals';
import {
  CrossModuleReference,
  CrossModuleReferenceStore,
  crossModuleReferenceStore,
  crossModuleReferencesRegistry,
} from '../crossModuleReferences';

const CANONICAL_IDS = ['CMR-001', 'CMR-002', 'CMR-003', 'CMR-004', 'CMR-005'] as const;

function cloneCanonical(id: string): CrossModuleReference {
  const found = crossModuleReferencesRegistry.find((ref) => ref.id === id);
  if (!found) {
    throw new Error(`Canonical reference ${id} missing from registry.`);
  }
  return {
    ...found,
    metadata: structuredClone(found.metadata),
  };
}

export function runCrossModuleReferencesVerification(): boolean {
  console.log('[CrossModuleReferences Verification] Starting checks...');
  let passed = true;

  // Test 1: Registry size check (strictly supported references)
  if (crossModuleReferencesRegistry.length === 0) {
    console.error('FAIL: Registry is empty.');
    passed = false;
  }

  // Test 2: Every fixture MUST be strict cross-module (sourceModule !== targetModule)
  for (const ref of crossModuleReferencesRegistry) {
    if (ref.sourceModule === ref.targetModule) {
      console.error(
        `FAIL: Reference ${ref.id} has identical source and target modules: ${ref.sourceModule}`
      );
      passed = false;
    }
  }

  // Test 3: Verify initial store synchronization with registry
  if (crossModuleReferenceStore.size !== crossModuleReferencesRegistry.length) {
    console.error('FAIL: Singleton store size does not match registry count.');
    passed = false;
  }

  // Test 4: Query Outgoing References (obs_89412a -> DEC-001)
  const outgoing = crossModuleReferenceStore.getOutgoingReferences('obs_89412a');
  if (outgoing.length !== 1 || outgoing[0].targetRecordId !== 'DEC-001') {
    console.error('FAIL: Outgoing reference lookup returned invalid result.');
    passed = false;
  }

  // Test 5: Query Incoming References (DEC-001 incoming from obs_89412a & REQ-001)
  const incoming = crossModuleReferenceStore.getIncomingReferences('DEC-001');
  if (incoming.length !== 2) {
    console.error(
      `FAIL: Incoming reference lookup for DEC-001 returned ${incoming.length}, expected 2.`
    );
    passed = false;
  }

  // Test 6: Connected References lookup without duplicates
  const connected = crossModuleReferenceStore.getConnectedReferences('DEC-001');
  if (connected.length !== 3) {
    console.error(
      `FAIL: Connected reference lookup returned ${connected.length}, expected 3.`
    );
    passed = false;
  }

  // Test 7: Unknown ID query returns empty array
  const unknownOutgoing = crossModuleReferenceStore.getOutgoingReferences('NON-EXISTENT-ID');
  const unknownIncoming = crossModuleReferenceStore.getIncomingReferences('NON-EXISTENT-ID');
  const unknownConnected = crossModuleReferenceStore.getConnectedReferences('NON-EXISTENT-ID');

  if (
    unknownOutgoing.length !== 0 ||
    unknownIncoming.length !== 0 ||
    unknownConnected.length !== 0
  ) {
    console.error('FAIL: Lookup for unknown ID did not return an empty array.');
    passed = false;
  }

  // Test 8: Immutability / Mutation Protection
  const refToMutate = crossModuleReferenceStore.getReference('CMR-001');
  if (refToMutate) {
    refToMutate.metadata.tampered = true;
    const reFetched = crossModuleReferenceStore.getReference('CMR-001');
    if (reFetched?.metadata.tampered === true) {
      console.error('FAIL: Internal store state was mutated via returned object.');
      passed = false;
    }
  }

  // Test 9: Registry Immutability check
  const originalMetadataKeyCount = Object.keys(
    crossModuleReferencesRegistry[0].metadata
  ).length;
  const storeRef = crossModuleReferenceStore.getReference('CMR-001');
  if (storeRef) {
    storeRef.metadata.newKey = 'test';
  }
  if (
    Object.keys(crossModuleReferencesRegistry[0].metadata).length !==
    originalMetadataKeyCount
  ) {
    console.error('FAIL: Modifying store references mutated the canonical registry.');
    passed = false;
  }

  console.log(
    `[CrossModuleReferences Verification] Checks complete. Result: ${
      passed ? 'PASSED' : 'FAILED'
    }`
  );
  return passed;
}

describe('Cross-Module References', () => {
  it('passes canonical 12.4 reference registry and store verification', () => {
    expect(runCrossModuleReferencesVerification()).toBe(true);
  });

  it('canonical registry is non-empty and contains exactly the five fixture IDs', () => {
    expect(crossModuleReferencesRegistry.length).toBeGreaterThan(0);
    expect(crossModuleReferencesRegistry.map((ref) => ref.id)).toEqual([...CANONICAL_IDS]);
  });

  it('canonical store count matches registry', () => {
    expect(crossModuleReferenceStore.size).toBe(crossModuleReferencesRegistry.length);
    expect(crossModuleReferenceStore.size).toBe(5);
  });

  it('all existing canonical relationships still work', () => {
    expect(crossModuleReferenceStore.getReference('CMR-001')).toMatchObject({
      sourceModule: 'SIGNAL',
      sourceRecordId: 'obs_89412a',
      targetModule: 'AI',
      targetRecordId: 'DEC-001',
      type: 'led_to',
    });
    expect(crossModuleReferenceStore.getReference('CMR-002')).toMatchObject({
      sourceModule: 'AI',
      sourceRecordId: 'DEC-001',
      targetModule: 'FORGE',
      targetRecordId: 'TASK-001',
      type: 'led_to',
    });
    expect(crossModuleReferenceStore.getReference('CMR-004')).toMatchObject({
      sourceModule: 'SIGNAL',
      sourceRecordId: 'ins_7721',
      targetModule: 'PULSE',
      targetRecordId: 'REQ-001',
      type: 'context_for',
    });
    expect(crossModuleReferenceStore.getReference('CMR-005')).toMatchObject({
      sourceModule: 'FORGE',
      sourceRecordId: 'TASK-001',
      targetModule: 'PULSE',
      targetRecordId: 'REQ-001',
      type: 'supports',
    });
  });

  it('CMR-003 remains present as PULSE REQ-001 requires AI DEC-001', () => {
    const cmr003 = crossModuleReferenceStore.getReference('CMR-003');
    expect(cmr003).toBeDefined();
    expect(cmr003).toMatchObject({
      id: 'CMR-003',
      sourceModule: 'PULSE',
      sourceRecordId: 'REQ-001',
      targetModule: 'AI',
      targetRecordId: 'DEC-001',
      type: 'requires',
    });
  });

  it('outgoing, incoming, and connected lookups match canonical relationships', () => {
    const outgoing = crossModuleReferenceStore.getOutgoingReferences('obs_89412a');
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0].id).toBe('CMR-001');
    expect(outgoing[0].targetRecordId).toBe('DEC-001');

    const incoming = crossModuleReferenceStore.getIncomingReferences('DEC-001');
    expect(incoming.map((ref) => ref.id).sort()).toEqual(['CMR-001', 'CMR-003']);

    const connected = crossModuleReferenceStore.getConnectedReferences('DEC-001');
    expect(connected.map((ref) => ref.id).sort()).toEqual(['CMR-001', 'CMR-002', 'CMR-003']);
  });

  it('unknown IDs return empty arrays and undefined reference', () => {
    expect(crossModuleReferenceStore.getOutgoingReferences('NON-EXISTENT-ID')).toEqual([]);
    expect(crossModuleReferenceStore.getIncomingReferences('NON-EXISTENT-ID')).toEqual([]);
    expect(crossModuleReferenceStore.getConnectedReferences('NON-EXISTENT-ID')).toEqual([]);
    expect(crossModuleReferenceStore.getReference('NON-EXISTENT-ID')).toBeUndefined();
  });

  it('duplicate IDs are rejected instead of silently overwriting', () => {
    const isolated = new CrossModuleReferenceStore([]);
    const first = cloneCanonical('CMR-001');
    isolated.addReference(first);
    expect(isolated.size).toBe(1);

    expect(() => isolated.addReference(cloneCanonical('CMR-001'))).toThrow(
      '[CrossModuleReferenceStore] Duplicate reference ID rejected: CMR-001'
    );
    expect(isolated.size).toBe(1);
    expect(isolated.getReference('CMR-001')?.sourceRecordId).toBe('obs_89412a');

    expect(
      () =>
        new CrossModuleReferenceStore([cloneCanonical('CMR-002'), cloneCanonical('CMR-002')])
    ).toThrow('[CrossModuleReferenceStore] Duplicate reference ID rejected: CMR-002');
  });

  it('rejects empty reference identity at the store boundary', () => {
    const isolated = new CrossModuleReferenceStore([]);
    const base = cloneCanonical('CMR-001');

    expect(() => isolated.addReference({ ...base, id: '' })).toThrow(
      '[CrossModuleReferenceStore] Reference id must be a non-empty string.'
    );
    expect(() => isolated.addReference({ ...base, id: 'CMR-EMPTY-SRC', sourceRecordId: '' })).toThrow(
      '[CrossModuleReferenceStore] Reference "CMR-EMPTY-SRC" sourceRecordId must be a non-empty string.'
    );
    expect(() => isolated.addReference({ ...base, id: 'CMR-EMPTY-TGT', targetRecordId: '' })).toThrow(
      '[CrossModuleReferenceStore] Reference "CMR-EMPTY-TGT" targetRecordId must be a non-empty string.'
    );
    expect(isolated.size).toBe(0);
  });

  it('rejects invalid enum-like module and type values at the store boundary', () => {
    const isolated = new CrossModuleReferenceStore([]);
    const invalidModule = cloneCanonical('CMR-001');
    Reflect.set(invalidModule, 'sourceModule', 'INVALID_MODULE');
    expect(() => isolated.addReference(invalidModule)).toThrow(
      '[CrossModuleReferenceStore] Invalid sourceModule "INVALID_MODULE" for reference "CMR-001".'
    );

    const invalidType = cloneCanonical('CMR-004');
    invalidType.id = 'CMR-INVALID-TYPE';
    Reflect.set(invalidType, 'type', 'not_a_reference_type');
    expect(() => isolated.addReference(invalidType)).toThrow(
      '[CrossModuleReferenceStore] Invalid type "not_a_reference_type" for reference "CMR-INVALID-TYPE".'
    );
    expect(isolated.size).toBe(0);
  });

  it('returned objects cannot mutate internal state', () => {
    const fetched = crossModuleReferenceStore.getReference('CMR-001');
    expect(fetched).toBeDefined();
    if (!fetched) {
      throw new Error('CMR-001 missing from canonical store.');
    }
    fetched.metadata.tampered = true;
    fetched.sourceRecordId = 'obs_MUTATED';
    fetched.label = 'mutated';

    const reFetched = crossModuleReferenceStore.getReference('CMR-001');
    expect(reFetched?.metadata.tampered).toBeUndefined();
    expect(reFetched?.sourceRecordId).toBe('obs_89412a');
    expect(reFetched?.label).toBe(
      'Payment failure observation led to billing recovery decision'
    );
  });

  it('getAll() results cannot mutate internal state', () => {
    const all = crossModuleReferenceStore.getAll();
    expect(all).toHaveLength(5);
    all[0].metadata.tampered = true;
    all[0].id = 'CMR-MUTATED';
    all.pop();

    expect(crossModuleReferenceStore.size).toBe(5);
    expect(crossModuleReferenceStore.getAll().map((ref) => ref.id)).toEqual([...CANONICAL_IDS]);
    expect(crossModuleReferenceStore.getReference('CMR-001')?.metadata.tampered).toBeUndefined();
  });

  it('custom store initialization is isolated from the canonical singleton', () => {
    const custom: CrossModuleReference = {
      ...cloneCanonical('CMR-005'),
      id: 'CMR-CUSTOM-001',
    };
    const isolated = new CrossModuleReferenceStore([custom]);

    expect(isolated.size).toBe(1);
    expect(isolated.getReference('CMR-CUSTOM-001')?.sourceRecordId).toBe('TASK-001');
    expect(isolated.getReference('CMR-001')).toBeUndefined();
    expect(crossModuleReferenceStore.size).toBe(5);
    expect(crossModuleReferenceStore.getReference('CMR-CUSTOM-001')).toBeUndefined();
    expect(crossModuleReferenceStore.getReference('CMR-005')?.id).toBe('CMR-005');
  });

  it('no canonical fixture is mutated by store operations', () => {
    const snapshot = JSON.stringify(crossModuleReferencesRegistry);
    const fetched = crossModuleReferenceStore.getReference('CMR-003');
    if (fetched) {
      fetched.metadata.tampered = true;
      fetched.targetRecordId = 'DEC-MUTATED';
    }
    const all = crossModuleReferenceStore.getAll();
    all.forEach((ref) => {
      ref.metadata.mutated = true;
    });

    expect(JSON.stringify(crossModuleReferencesRegistry)).toBe(snapshot);
    expect(crossModuleReferencesRegistry.map((ref) => ref.id)).toEqual([...CANONICAL_IDS]);
    expect(crossModuleReferencesRegistry[2].id).toBe('CMR-003');
    expect(crossModuleReferencesRegistry[2].targetRecordId).toBe('DEC-001');
  });
});