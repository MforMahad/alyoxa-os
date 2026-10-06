import { OSEvent } from '../../data/os/events';

export type SharedContextModule =
  | 'SIGNAL'
  | 'AI'
  | 'FORGE'
  | 'PULSE'
  | 'VAULT'
  | 'SYSTEM';

export type SharedContextRecordType =
  | 'observation'
  | 'pattern'
  | 'insight'
  | 'decision'
  | 'run'
  | 'execution_task'
  | 'execution_record'
  | 'execution_node'
  | 'request'
  | 'thread'
  | 'approval'
  | 'activity'
  | 'asset'
  | 'knowledge'
  | 'folder'
  | 'system';

export interface SharedContextReference {
  module: SharedContextModule;
  recordId: string;
  recordType: SharedContextRecordType;
}

export interface SharedContextEntry {
  id: string;
  source: SharedContextReference;
  title: string;
  summary: string;
  timestamp: string;
  relevance: 'high' | 'medium' | 'low';
  references: SharedContextReference[];
  metadata: Record<string, unknown>;
}

const SHARED_CONTEXT_RECORD_TYPES: ReadonlySet<string> = new Set([
  'observation',
  'pattern',
  'insight',
  'decision',
  'run',
  'execution_task',
  'execution_record',
  'execution_node',
  'request',
  'thread',
  'approval',
  'activity',
  'asset',
  'knowledge',
  'folder',
  'system',
]);

function isSharedContextRecordType(
  recordType: string
): recordType is SharedContextRecordType {
  return SHARED_CONTEXT_RECORD_TYPES.has(recordType);
}

export class SharedContextStore {
  private entries: Map<string, SharedContextEntry> = new Map();

  /**
   * Registers or updates a lightweight contextual projection entry.
   */
  register(entry: Readonly<SharedContextEntry>): void {
    this.entries.set(entry.id, this.cloneEntry(entry));
  }

  /**
   * Retrieves a single context entry by ID.
   */
  get(id: string): SharedContextEntry | undefined {
    const entry = this.entries.get(id);
    return entry ? this.cloneEntry(entry) : undefined;
  }

  /**
   * Retrieves all entries belonging to a specific OS module.
   */
  getByModule(moduleName: SharedContextModule): SharedContextEntry[] {
    const result: SharedContextEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.source.module === moduleName) {
        result.push(this.cloneEntry(entry));
      }
    }
    return result;
  }

  /**
   * Finds context entries referencing a specific target record.
   */
  getByReference(targetRecordId: string): SharedContextEntry[] {
    const result: SharedContextEntry[] = [];
    for (const entry of this.entries.values()) {
      const matchesSource = entry.source.recordId === targetRecordId;
      const matchesRef = entry.references.some(
        (ref) => ref.recordId === targetRecordId
      );

      if (matchesSource || matchesRef) {
        result.push(this.cloneEntry(entry));
      }
    }
    return result;
  }

  /**
   * Projects an incoming OSEvent into a lightweight context entry.
   * Derives context references from event payload and metadata without coupling to module registries.
   */
  projectFromEvent(event: Readonly<OSEvent>): SharedContextEntry {
    const contextId = `CTX-${event.id}`;

    // Determine relevance based on metadata or action severity
    let relevance: 'high' | 'medium' | 'low' = 'medium';
    if (
      event.metadata?.severity === 'high' ||
      event.metadata?.urgency === 'critical'
    ) {
      relevance = 'high';
    } else if (event.action === 'archived' || event.action === 'resolved') {
      relevance = 'low';
    }

    // Extract references from metadata keys when present
    const references: SharedContextReference[] = [];

    if (typeof event.metadata?.sourceObservationId === 'string') {
      references.push({
        module: 'SIGNAL',
        recordId: event.metadata.sourceObservationId,
        recordType: 'observation',
      });
    }
    if (typeof event.metadata?.requestId === 'string') {
      references.push({
        module: 'PULSE',
        recordId: event.metadata.requestId,
        recordType: 'request',
      });
    }
    if (typeof event.metadata?.taskId === 'string') {
      references.push({
        module: 'FORGE',
        recordId: event.metadata.taskId,
        recordType: 'execution_task',
      });
    }
    if (typeof event.metadata?.decisionId === 'string') {
      references.push({
        module: 'AI',
        recordId: event.metadata.decisionId,
        recordType: 'decision',
      });
    }

    if (!isSharedContextRecordType(event.recordType)) {
      throw new Error(
        `[SharedContextStore] Invalid OSEvent.recordType "${event.recordType}" cannot be projected into SharedContextEntry.`
      );
    }

    const entry: SharedContextEntry = {
      id: contextId,
      source: {
        module: event.module,
        recordId: event.recordId,
        recordType: event.recordType,
      },
      title: `${event.module} Context Projection (${event.recordId})`,
      summary: event.summary,
      timestamp: event.timestamp,
      relevance,
      references,
      metadata: event.metadata ? structuredClone(event.metadata) : {},
    };

    this.register(entry);
    return this.cloneEntry(entry);
  }

  /**
   * Returns a clean array of all active context projections.
   */
  getAll(): SharedContextEntry[] {
    return Array.from(this.entries.values()).map((e) => this.cloneEntry(e));
  }

  /**
   * Returns total count of context projections.
   */
  get size(): number {
    return this.entries.size;
  }

  private cloneEntry(entry: SharedContextEntry): SharedContextEntry {
    return {
      ...entry,
      source: { ...entry.source },
      references: entry.references.map((r) => ({ ...r })),
      metadata: entry.metadata ? structuredClone(entry.metadata) : {},
    };
  }
}

/**
 * Singleton instance of the Shared OS Context Store.
 */
export const sharedContextStore = new SharedContextStore();