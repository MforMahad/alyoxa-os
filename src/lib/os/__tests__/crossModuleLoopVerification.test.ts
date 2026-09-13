/// <reference types="jest" />

import { verifyCrossModuleLoop, VerificationRegistries } from '../crossModuleLoopVerification';
import { CrossModuleReference } from '../crossModuleReferences';
import { OSIntegrationContract } from '../integrationContracts';

describe('Cross-Module Loop Verification (Phase 13.7.3)', () => {
  it('1. Canonical verification succeeds', () => {
    const result = verifyCrossModuleLoop();
    expect(result.status).toBe('valid');
    expect(result.errors).toHaveLength(0);
  });

  it('2. SIGNAL OBS-001 → AI DEC-001 is verified', () => {
    const result = verifyCrossModuleLoop();
    const link001 = result.verifiedReferences.find((r) => r.linkId === 'CMR-001');
    expect(link001).toBeDefined();
    expect(link001?.verified).toBe(true);
    expect(link001?.sourceModule).toBe('SIGNAL');
    expect(link001?.sourceRecordId).toBe('OBS-001');
    expect(link001?.targetModule).toBe('AI');
    expect(link001?.targetRecordId).toBe('DEC-001');
  });

  it('3. AI DEC-001 → FORGE TASK-001 is verified', () => {
    const result = verifyCrossModuleLoop();
    const link002 = result.verifiedReferences.find((r) => r.linkId === 'CMR-002');
    expect(link002).toBeDefined();
    expect(link002?.verified).toBe(true);
    expect(link002?.sourceModule).toBe('AI');
    expect(link002?.sourceRecordId).toBe('DEC-001');
    expect(link002?.targetModule).toBe('FORGE');
    expect(link002?.targetRecordId).toBe('TASK-001');
  });

  it('4. FORGE TASK-001 → PULSE REQ-001 is verified', () => {
    const result = verifyCrossModuleLoop();
    const link005 = result.verifiedReferences.find((r) => r.linkId === 'CMR-005');
    expect(link005).toBeDefined();
    expect(link005?.verified).toBe(true);
    expect(link005?.sourceModule).toBe('FORGE');
    expect(link005?.sourceRecordId).toBe('TASK-001');
    expect(link005?.targetModule).toBe('PULSE');
    expect(link005?.targetRecordId).toBe('REQ-001');
  });

  it('5. SIGNAL INS-001 → PULSE REQ-001 is verified', () => {
    const result = verifyCrossModuleLoop();
    const link004 = result.verifiedReferences.find((r) => r.linkId === 'CMR-004');
    expect(link004).toBeDefined();
    expect(link004?.verified).toBe(true);
    expect(link004?.sourceModule).toBe('SIGNAL');
    expect(link004?.sourceRecordId).toBe('INS-001');
    expect(link004?.targetModule).toBe('PULSE');
    expect(link004?.targetRecordId).toBe('REQ-001');
  });

  it('6. All expected CMR IDs are verified', () => {
    const result = verifyCrossModuleLoop();
    const linkIds = result.verifiedReferences.map((r) => r.linkId);
    expect(linkIds).toContain('CMR-001');
    expect(linkIds).toContain('CMR-002');
    expect(linkIds).toContain('CMR-004');
    expect(linkIds).toContain('CMR-005');
  });

  it('7. All expected contracts are verified', () => {
    const result = verifyCrossModuleLoop();
    expect(result.verifiedContracts).toContain('CONTRACT-001');
    expect(result.verifiedContracts).toContain('CONTRACT-002');
    expect(result.verifiedContracts).toContain('CONTRACT-003');
    expect(result.verifiedContracts).toContain('CONTRACT-004');
  });

  it('8. Invalid source record mismatch is detected', () => {
    const badRef: CrossModuleReference = {
      id: 'CMR-001',
      sourceModule: 'SIGNAL',
      sourceRecordId: 'OBS-WRONG',
      targetModule: 'AI',
      targetRecordId: 'DEC-001',
      type: 'led_to',
      createdAt: '2026-01-01T00:00:00Z',
      metadata: {},
    };
    const mockRegs: VerificationRegistries = {
      getReference: (id) => (id === 'CMR-001' ? badRef : undefined),
      getContract: (id) => ({
        id,
        sourceModule: 'SIGNAL',
        sourceRecordType: 'observation',
        targetModule: 'AI',
        targetRecordType: 'Decision',
        crossModuleRefId: 'CMR-001',
        requiredReferences: ['OBS-001'],
      } as unknown as OSIntegrationContract),
    };
    const result = verifyCrossModuleLoop(mockRegs);
    expect(result.status).toBe('invalid');
    expect(result.errors.some((e) => e.includes('sourceRecordId'))).toBe(true);
  });

  it('9. Deterministic repeated verification', () => {
    const res1 = verifyCrossModuleLoop();
    const res2 = verifyCrossModuleLoop();
    expect(res1).toEqual(res2);
  });

  it('10. Result isolation and immutability protection', () => {
    const res1 = verifyCrossModuleLoop();
    res1.chain.push('MUTATED_CHAIN');
    res1.verifiedReferences.pop();

    const res2 = verifyCrossModuleLoop();
    expect(res2.chain).not.toContain('MUTATED_CHAIN');
    expect(res2.verifiedReferences.length).toBe(4);
  });
});