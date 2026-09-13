// ==================================================
// VAULT CORE TYPES
// ==================================================

export type VaultItemType =
  | 'file'
  | 'document'
  | 'brand_asset'
  | 'project_resource'
  | 'template';

export type VaultItemStatus = 'active' | 'archived';

export type VaultVisibility = 'private' | 'workspace' | 'shared';

export type KnowledgeEntryStatus = 'active' | 'archived';

export type KnowledgeEntryType =
  | 'client_context'
  | 'project_knowledge'
  | 'decision_record'
  | 'operational_note'
  | 'internal_knowledge';

// ==================================================
// VAULT FOLDER INTERFACE
// ==================================================

export interface VaultFolder {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================================================
// VAULT ITEM INTERFACE
// ==================================================

export interface VaultItem {
  id: string;
  name: string;
  type: VaultItemType;
  status: VaultItemStatus;
  visibility: VaultVisibility;
  folderId?: string;
  mimeType?: string;
  sizeBytes?: number;
  description?: string;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata: Record<string, unknown>;
}

// ==================================================
// KNOWLEDGE ENTRY INTERFACE
// ==================================================

export interface VaultKnowledgeEntry {
  id: string;
  type: KnowledgeEntryType;
  status: KnowledgeEntryStatus;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  sourceItemId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata: Record<string, unknown>;
}

// ==================================================
// FIXTURE REGISTRIES
// ==================================================

export const vaultFoldersRegistry: VaultFolder[] = [
  {
    id: 'FOLDER-CLIENTS',
    name: 'Client Assets',
    description: 'Storage for client specifications, agreements, and brand assets.',
    createdAt: '2026-08-30T08:00:00Z',
    updatedAt: '2026-08-30T08:00:00Z',
  },
  {
    id: 'FOLDER-PROJECTS',
    name: 'Internal Projects',
    description: 'Resources, blueprints, and reusable templates for ALYOXA OS execution.',
    createdAt: '2026-08-30T08:05:00Z',
    updatedAt: '2026-08-30T08:05:00Z',
  },
];

export const vaultItemsRegistry: VaultItem[] = [
  {
    id: 'ITEM-001',
    name: 'client_onboarding_spec_v1.pdf',
    type: 'document',
    status: 'active',
    visibility: 'workspace',
    folderId: 'FOLDER-CLIENTS',
    mimeType: 'application/pdf',
    sizeBytes: 1048576,
    description: 'Standard onboarding requirements and scope definitions for new projects.',
    tags: ['client', 'onboarding', 'spec'],
    version: 1,
    createdAt: '2026-08-30T08:10:00Z',
    updatedAt: '2026-08-30T08:10:00Z',
    createdBy: 'SYS-ORCHESTRATOR',
    metadata: {
      reviewCycle: 'quarterly',
      department: 'operations',
    },
  },
  {
    id: 'ITEM-002',
    name: 'alyoxa_brand_guidelines_2026.pdf',
    type: 'brand_asset',
    status: 'active',
    visibility: 'shared',
    folderId: 'FOLDER-PROJECTS',
    mimeType: 'application/pdf',
    sizeBytes: 4194304,
    description: 'Core brand guidelines including color tokens, typography, and logo usage.',
    tags: ['brand', 'design', 'tokens'],
    version: 2,
    createdAt: '2026-08-30T08:15:00Z',
    updatedAt: '2026-08-30T08:15:00Z',
    createdBy: 'SYS-ORCHESTRATOR',
    metadata: {
      designSystemVersion: '3.2.0',
    },
  },
  {
    id: 'ITEM-003',
    name: 'telemetry_ingestion_architecture.png',
    type: 'project_resource',
    status: 'active',
    visibility: 'workspace',
    folderId: 'FOLDER-PROJECTS',
    mimeType: 'image/png',
    sizeBytes: 2097152,
    description: 'System architecture diagram for real-time telemetry ingestion pipelines.',
    tags: ['architecture', 'telemetry', 'diagram'],
    version: 1,
    createdAt: '2026-08-30T08:20:00Z',
    updatedAt: '2026-08-30T08:20:00Z',
    createdBy: 'SYS-ORCHESTRATOR',
    metadata: {
      targetModule: 'ALYOXA Signal',
    },
  },
  {
    id: 'ITEM-004',
    name: 'agency_proposal_template.docx',
    type: 'template',
    status: 'active',
    visibility: 'workspace',
    folderId: 'FOLDER-PROJECTS',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 524288,
    description: 'Standard proposal structure for agency service agreements.',
    tags: ['template', 'proposal', 'sales'],
    version: 1,
    createdAt: '2026-08-30T08:25:00Z',
    updatedAt: '2026-08-30T08:25:00Z',
    createdBy: 'SYS-ORCHESTRATOR',
    metadata: {
      isReusable: true,
    },
  },
];

export const vaultKnowledgeRegistry: VaultKnowledgeEntry[] = [
  {
    id: 'KNOW-001',
    type: 'client_context',
    status: 'active',
    title: 'Client Onboarding Scope Requirements',
    summary: 'Standard requirements and technical intake process for client onboarding.',
    content: 'Client project intake requires technical specification validation prior to initiating task execution within Forge. All project scope additions must be documented in Vault.',
    tags: ['client', 'onboarding', 'spec'],
    sourceItemId: 'ITEM-001',
    createdAt: '2026-08-30T08:30:00Z',
    updatedAt: '2026-08-30T08:30:00Z',
    createdBy: 'SYS-ORCHESTRATOR',
    metadata: {
      verified: true,
      domain: 'operations',
    },
  },
  {
    id: 'KNOW-002',
    type: 'project_knowledge',
    status: 'active',
    title: 'ALYOXA OS Visual System Standards',
    summary: 'Design primitives and theme tokens strictly permitted across runtime workspaces.',
    content: 'All runtime workspaces must enforce dark surface palettes, hairline borders, Satoshi typography, and monospace metadata. Primary orange is reserved strictly for active selection and key operational emphasis.',
    tags: ['design-system', 'ui-rules', 'tokens'],
    sourceItemId: 'ITEM-002',
    createdAt: '2026-08-30T08:35:00Z',
    updatedAt: '2026-08-30T08:35:00Z',
    createdBy: 'SYS-ORCHESTRATOR',
    metadata: {
      strictMode: true,
    },
  },
  {
    id: 'KNOW-003',
    type: 'decision_record',
    status: 'active',
    title: 'Signal Telemetry Architecture Decision',
    summary: 'Architectural record for real-time signal ingestion pipeline design.',
    content: 'Telemetry ingestion events are processed via structured pipeline schemas to maintain event isolation between Signal, Pulse, and AI Core runtime contexts.',
    tags: ['architecture', 'telemetry', 'signal'],
    sourceItemId: 'ITEM-003',
    createdAt: '2026-08-30T08:40:00Z',
    updatedAt: '2026-08-30T08:40:00Z',
    createdBy: 'SYS-ORCHESTRATOR',
    metadata: {
      decisionStatus: 'accepted',
    },
  },
];

// ==================================================
// PHASE 11.6: VAULT CONTEXT & REFERENCES DATA MODEL
// ==================================================

export type VaultReferenceSource =
  | 'SIGNAL'
  | 'AI'
  | 'FORGE'
  | 'PULSE'
  | 'VAULT';

export type VaultReferenceType =
  | 'source'
  | 'related'
  | 'derived_from'
  | 'supports'
  | 'context';

export interface VaultReference {
  id: string;
  sourceModule: VaultReferenceSource;
  sourceRecordId: string;
  targetModule: 'VAULT';
  targetRecordId: string;
  type: VaultReferenceType;
  label?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export const vaultReferencesRegistry: VaultReference[] = [
  {
    id: 'REF-001',
    sourceModule: 'SIGNAL',
    sourceRecordId: 'INS-001',
    targetModule: 'VAULT',
    targetRecordId: 'KNOW-001',
    type: 'derived_from',
    label: 'Telemetry Anomaly Insight Context',
    createdAt: '2026-08-30T10:00:00Z',
    metadata: {},
  },
  {
    id: 'REF-002',
    sourceModule: 'AI',
    sourceRecordId: 'DEC-001',
    targetModule: 'VAULT',
    targetRecordId: 'KNOW-001',
    type: 'supports',
    label: 'Autonomous Optimization Decision',
    createdAt: '2026-08-30T11:15:00Z',
    metadata: {},
  },
  {
    id: 'REF-003',
    sourceModule: 'FORGE',
    sourceRecordId: 'TASK-001',
    targetModule: 'VAULT',
    targetRecordId: 'ITEM-001',
    type: 'supports',
    label: 'Execution Task Artifact',
    createdAt: '2026-08-29T14:30:00Z',
    metadata: {},
  },
  {
    id: 'REF-004',
    sourceModule: 'PULSE',
    sourceRecordId: 'REQ-001',
    targetModule: 'VAULT',
    targetRecordId: 'KNOW-002',
    type: 'context',
    label: 'Pulse Request Authorization',
    createdAt: '2026-08-28T09:20:00Z',
    metadata: {},
  },
  {
    id: 'REF-005',
    sourceModule: 'FORGE',
    sourceRecordId: 'TASK-002',
    targetModule: 'VAULT',
    targetRecordId: 'ITEM-002',
    type: 'related',
    label: 'Pipeline Build Linkage',
    createdAt: '2026-08-27T16:45:00Z',
    metadata: {},
  },
  {
    id: 'REF-006',
    sourceModule: 'FORGE',
    sourceRecordId: 'TASK-MISSING-99',
    targetModule: 'VAULT',
    targetRecordId: 'ITEM-001',
    type: 'supports',
    label: 'Unresolved Reference Grounding Test',
    createdAt: '2026-08-26T08:00:00Z',
    metadata: {},
  },
];  