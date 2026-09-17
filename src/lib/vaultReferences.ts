import {
  VaultReference,
  VaultReferenceSource,
  vaultReferencesRegistry,
  vaultFoldersRegistry,
  vaultItemsRegistry,
  vaultKnowledgeRegistry,
} from '@/data/os/vault';
import {
  signalFeedSources,
  signalObservations,
  signalPatterns,
  signalInsights,
} from '@/data/os/signal';
import { aiDecisionsRegistry } from '@/data/os/ai/aiDecisions';
import {
  forgeNodesRegistry,
  forgeTasksRegistry,
  forgeRecordsRegistry,
} from '@/data/os/forge';
import {
  pulseRequestsRegistry,
  pulseThreadsRegistry,
  pulseApprovalsRegistry,
  pulseActivitiesRegistry,
} from '@/data/os/pulse';

export interface ResolvedVaultReference {
  reference: VaultReference;
  isResolved: boolean;
  summary?: string;
}

/**
 * Determines whether a source record explicitly exists in the known module fixture registries.
 */
function checkRecordExists(sourceModule: VaultReferenceSource, recordId: string): boolean {
  switch (sourceModule) {
    case 'SIGNAL':
      return [
        ...signalFeedSources,
        ...signalObservations,
        ...signalPatterns,
        ...signalInsights,
      ].some((item) => item.id === recordId);

    case 'AI':
      return aiDecisionsRegistry.some((item) => item.id === recordId);

    case 'FORGE':
      return [
        ...forgeNodesRegistry,
        ...forgeTasksRegistry,
        ...forgeRecordsRegistry,
      ].some((item) => item.id === recordId);

    case 'PULSE':
      return [
        ...pulseRequestsRegistry,
        ...pulseThreadsRegistry,
        ...pulseApprovalsRegistry,
        ...pulseActivitiesRegistry,
      ].some((item) => item.id === recordId);

    case 'VAULT':
      return [
        ...vaultFoldersRegistry,
        ...vaultItemsRegistry,
        ...vaultKnowledgeRegistry,
        ...vaultReferencesRegistry,
      ].some((item) => item.id === recordId);

    default:
      return false;
  }
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
    const isResolved = checkRecordExists(ref.sourceModule, ref.sourceRecordId);

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