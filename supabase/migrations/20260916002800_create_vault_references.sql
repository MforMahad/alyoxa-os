-- ============================================================================
-- MIGRATION 028 — VAULT REFERENCES TABLE
-- ============================================================================

CREATE TABLE public.vault_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    vault_item_id UUID REFERENCES public.vault_items(id) ON DELETE CASCADE,
    vault_knowledge_entry_id UUID REFERENCES public.vault_knowledge_entries(id) ON DELETE CASCADE,
    source_module VARCHAR(50) NOT NULL,
    source_record_id UUID NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_vault_ref_target_exists CHECK (
        vault_item_id IS NOT NULL OR vault_knowledge_entry_id IS NOT NULL
    ),
    CONSTRAINT chk_vault_ref_source_module CHECK (
        source_module IN ('SIGNAL', 'AI', 'FORGE', 'PULSE', 'VAULT', 'SYSTEM')
    ),
    CONSTRAINT chk_vault_ref_type CHECK (
        reference_type IN ('source', 'related', 'derived_from', 'supports', 'context')
    ),
    CONSTRAINT chk_vault_ref_metadata_is_object CHECK (
        metadata IS NULL OR jsonb_typeof(metadata) = 'object'
    )
);

-- Unique index to prevent duplicate identical Vault references within a workspace.
-- Coalescing columns or using explicit NULL handling ensures uniqueness holds when one target is NULL.
CREATE UNIQUE INDEX idx_vault_references_unq 
    ON public.vault_references (
        workspace_id,
        COALESCE(vault_item_id, '00000000-0000-0000-0000-000000000000'::UUID),
        COALESCE(vault_knowledge_entry_id, '00000000-0000-0000-0000-000000000000'::UUID),
        source_module,
        source_record_id,
        reference_type
    );

-- Indexes for performance, workspace isolation, target lookups, and source tracking
CREATE INDEX idx_vault_references_workspace_id ON public.vault_references(workspace_id);
CREATE INDEX idx_vault_references_item_id ON public.vault_references(vault_item_id) WHERE vault_item_id IS NOT NULL;
CREATE INDEX idx_vault_references_knowledge_id ON public.vault_references(vault_knowledge_entry_id) WHERE vault_knowledge_entry_id IS NOT NULL;
CREATE INDEX idx_vault_references_source ON public.vault_references(source_module, source_record_id);
CREATE INDEX idx_vault_references_type ON public.vault_references(reference_type);

-- Row Level Security (Policies deferred)
ALTER TABLE public.vault_references ENABLE ROW LEVEL SECURITY;