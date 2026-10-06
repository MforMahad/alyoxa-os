import {
  getVaultReferencesForRecord,
  ResolvedVaultReference,
} from '@/lib/vaultReferences';
import {
  vaultItemsRegistry,
  vaultKnowledgeRegistry,
} from '@/data/os/vault';

export interface VaultContextProjection {
  recordId: string;
  recordType: 'asset' | 'knowledge' | 'unknown';
  title: string;
  summary: string;
  isAvailable: boolean;
  references: ResolvedVaultReference[];
}

/**
 * Deterministically resolves a Vault Asset or Knowledge record into a 
 * read-only contextual projection available to ALYOXA OS / AI layers.
 */
export function getVaultContextForRecord(recordId: string): VaultContextProjection | null {
  if (!recordId) return null;

  // 1. Check Vault Items Registry (Asset)
  const asset = vaultItemsRegistry.find((item) => item.id === recordId);
  if (asset) {
    const references = getVaultReferencesForRecord(asset.id);
    return {
      recordId: asset.id,
      recordType: 'asset',
      title: asset.name,
      summary: asset.description ?? 'No description specified.',
      isAvailable: true,
      references,
    };
  }

  // 2. Check Vault Knowledge Registry
  const knowledge = vaultKnowledgeRegistry.find((entry) => entry.id === recordId);
  if (knowledge) {
    const references = getVaultReferencesForRecord(knowledge.id);
    return {
      recordId: knowledge.id,
      recordType: 'knowledge',
      title: knowledge.title,
      summary: knowledge.summary,
      isAvailable: true,
      references,
    };
  }

  // 3. Unresolved Record
  return {
    recordId,
    recordType: 'unknown',
    title: 'UNRESOLVED RECORD',
    summary: `Vault record ${recordId} was not found in registry.`,
    isAvailable: false,
    references: [],
  };
}