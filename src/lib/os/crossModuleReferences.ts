export type CrossModuleReferenceModule =
  | 'SIGNAL'
  | 'AI'
  | 'FORGE'
  | 'PULSE'
  | 'VAULT'
  | 'SYSTEM';

export type CrossModuleReferenceType =
  | 'triggered_by'
  | 'derived_from'
  | 'led_to'
  | 'created_for'
  | 'supports'
  | 'requires'
  | 'related_to'
  | 'context_for';

export interface CrossModuleReference {
  id: string;

  sourceModule: CrossModuleReferenceModule;
  sourceRecordId: string;

  targetModule: CrossModuleReferenceModule;
  targetRecordId: string;

  type: CrossModuleReferenceType;

  label?: string;

  createdAt: string;

  metadata: Record<string, unknown>;
}

/**
 * Deterministic Cross-Module Reference Registry.
 * Contains strictly verified relationship fixtures supported by existing locked records.
 */
export const crossModuleReferencesRegistry: CrossModuleReference[] = [
  {
    id: 'CMR-001',
    sourceModule: 'SIGNAL',
    sourceRecordId: 'OBS-001',
    targetModule: 'AI',
    targetRecordId: 'DEC-001',
    type: 'led_to',
    label: 'Telemetry latency observation led to rate limit threshold decision',
    createdAt: '2026-08-30T10:00:00Z',
    metadata: { observationDomain: 'telemetry' },
  },
  {
    id: 'CMR-002',
    sourceModule: 'AI',
    sourceRecordId: 'DEC-001',
    targetModule: 'FORGE',
    targetRecordId: 'TASK-001',
    type: 'led_to',
    label: 'Rate limit threshold decision led to rate limit adjustment task',
    createdAt: '2026-08-30T10:05:00Z',
    metadata: { decisionType: 'threshold' },
  },
  {
    id: 'CMR-003',
    sourceModule: 'PULSE',
    sourceRecordId: 'REQ-001',
    targetModule: 'AI',
    targetRecordId: 'DEC-001',
    type: 'requires',
    label: 'Pulse request requires decision evaluation context',
    createdAt: '2026-08-30T10:10:00Z',
    metadata: { requestType: 'status_check' },
  },
  {
    id: 'CMR-004',
    sourceModule: 'SIGNAL',
    sourceRecordId: 'INS-001',
    targetModule: 'PULSE',
    targetRecordId: 'REQ-001',
    type: 'context_for',
    label: 'Performance insight provides anomaly context for pulse request',
    createdAt: '2026-08-30T10:15:00Z',
    metadata: { insightType: 'anomaly' },
  },
  {
    id: 'CMR-005',
    sourceModule: 'FORGE',
    sourceRecordId: 'TASK-001',
    targetModule: 'PULSE',
    targetRecordId: 'REQ-001',
    type: 'supports',
    label: 'Execution task supports pulse request status resolution',
    createdAt: '2026-08-30T10:20:00Z',
    metadata: { executionState: 'in_progress' },
  },
];

const CANONICAL_MODULES: ReadonlySet<string> = new Set([
  'SIGNAL',
  'AI',
  'FORGE',
  'PULSE',
  'VAULT',
  'SYSTEM',
]);

const CANONICAL_REFERENCE_TYPES: ReadonlySet<string> = new Set([
  'triggered_by',
  'derived_from',
  'led_to',
  'created_for',
  'supports',
  'requires',
  'related_to',
  'context_for',
]);

export class CrossModuleReferenceStore {
  private references: Map<string, CrossModuleReference> = new Map();

  constructor(initialRegistry: CrossModuleReference[] = crossModuleReferencesRegistry) {
    for (const ref of initialRegistry) {
      this.addReference(ref);
    }
  }

  /**
   * Registers a cross-module relationship reference into the store.
   * Duplicate IDs are rejected; existing references are never silently overwritten.
   */
  addReference(reference: Readonly<CrossModuleReference>): void {
    this.validateReference(reference);
    this.references.set(reference.id, this.cloneReference(reference));
  }

  /**
   * Retrieves a single cross-module reference by ID.
   */
  getReference(id: string): CrossModuleReference | undefined {
    const ref = this.references.get(id);
    return ref ? this.cloneReference(ref) : undefined;
  }

  /**
   * Finds all references where the given record ID is the source.
   */
  getOutgoingReferences(sourceRecordId: string): CrossModuleReference[] {
    const result: CrossModuleReference[] = [];
    for (const ref of this.references.values()) {
      if (ref.sourceRecordId === sourceRecordId) {
        result.push(this.cloneReference(ref));
      }
    }
    return result;
  }

  /**
   * Finds all references where the given record ID is the target.
   */
  getIncomingReferences(targetRecordId: string): CrossModuleReference[] {
    const result: CrossModuleReference[] = [];
    for (const ref of this.references.values()) {
      if (ref.targetRecordId === targetRecordId) {
        result.push(this.cloneReference(ref));
      }
    }
    return result;
  }

  /**
   * Finds all unique references (both incoming and outgoing) connected to a record ID.
   */
  getConnectedReferences(recordId: string): CrossModuleReference[] {
    const matchedMap = new Map<string, CrossModuleReference>();
    for (const ref of this.references.values()) {
      if (ref.sourceRecordId === recordId || ref.targetRecordId === recordId) {
        if (!matchedMap.has(ref.id)) {
          matchedMap.set(ref.id, this.cloneReference(ref));
        }
      }
    }
    return Array.from(matchedMap.values());
  }

  /**
   * Returns deep-cloned copies of all registered cross-module references.
   */
  getAll(): CrossModuleReference[] {
    return Array.from(this.references.values()).map((r) => this.cloneReference(r));
  }

  /**
   * Returns total count of active references.
   */
  get size(): number {
    return this.references.size;
  }

  private validateReference(reference: Readonly<CrossModuleReference>): void {
    if (!reference.id || reference.id.trim() === '') {
      throw new Error('[CrossModuleReferenceStore] Reference id must be a non-empty string.');
    }

    if (!reference.sourceRecordId || reference.sourceRecordId.trim() === '') {
      throw new Error(
        `[CrossModuleReferenceStore] Reference "${reference.id}" sourceRecordId must be a non-empty string.`
      );
    }

    if (!reference.targetRecordId || reference.targetRecordId.trim() === '') {
      throw new Error(
        `[CrossModuleReferenceStore] Reference "${reference.id}" targetRecordId must be a non-empty string.`
      );
    }

    if (!CANONICAL_MODULES.has(reference.sourceModule)) {
      throw new Error(
        `[CrossModuleReferenceStore] Invalid sourceModule "${reference.sourceModule}" for reference "${reference.id}".`
      );
    }

    if (!CANONICAL_MODULES.has(reference.targetModule)) {
      throw new Error(
        `[CrossModuleReferenceStore] Invalid targetModule "${reference.targetModule}" for reference "${reference.id}".`
      );
    }

    if (!CANONICAL_REFERENCE_TYPES.has(reference.type)) {
      throw new Error(
        `[CrossModuleReferenceStore] Invalid type "${reference.type}" for reference "${reference.id}".`
      );
    }

    if (this.references.has(reference.id)) {
      throw new Error(
        `[CrossModuleReferenceStore] Duplicate reference ID rejected: ${reference.id}`
      );
    }
  }

  private cloneReference(ref: CrossModuleReference): CrossModuleReference {
    return {
      ...ref,
      metadata: ref.metadata ? structuredClone(ref.metadata) : {},
    };
  }
}

/**
 * Default singleton instance initialized with canonical crossModuleReferencesRegistry.
 */
export const crossModuleReferenceStore = new CrossModuleReferenceStore();