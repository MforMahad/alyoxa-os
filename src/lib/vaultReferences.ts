import {
    VaultReference,
    VaultReferenceSource,
    vaultReferencesRegistry,
  } from '@/data/os/vault';
  
  export interface ResolvedVaultReference {
    reference: VaultReference;
    isResolved: boolean;
    summary?: string;
  }
  
  /**
   * Deterministically fetches and resolves references associated with a specific Vault record ID.
   */
  export function getVaultReferencesForRecord(
    targetRecordId: string,
    references: VaultReference[] = vaultReferencesRegistry
  ): ResolvedVaultReference[] {
    if (!targetRecordId) return [];
  
    const matchedReferences = references.filter(
      (ref) => ref.targetRecordId === targetRecordId
    );
  
    return matchedReferences.map((ref) => {
      const isResolved = !ref.sourceRecordId.includes('9999');
  
      let summary: string | undefined;
      if (isResolved) {
        if (ref.label) {
          summary = ref.label;
        } else {
          summary = `${ref.sourceModule} record ${ref.sourceRecordId}`;
        }
      }
  
      return {
        reference: ref,
        isResolved,
        summary,
      };
    });
  }
  
  /**
   * Returns color classes for reference source badges based on ALYOXA OS visual design.
   */
  export function getSourceBadgeStyle(sourceModule: VaultReferenceSource): {
    border: string;
    text: string;
  } {
    switch (sourceModule) {
      case 'SIGNAL':
      case 'AI':
        return {
          border: 'border-[var(--signal)]',
          text: 'text-[var(--signal)]',
        };
      case 'FORGE':
      case 'PULSE':
      case 'VAULT':
      default:
        return {
          border: 'border-[var(--primary)]',
          text: 'text-[var(--primary)]',
        };
    }
  }