-- ============================================================================
-- MIGRATION 027 — VAULT KNOWLEDGE ENTRIES TABLE
-- ============================================================================

CREATE TABLE public.vault_knowledge_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.vault_items(id) ON DELETE SET NULL,
    entry_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    title VARCHAR(250) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_vault_knowledge_entry_type CHECK (
        entry_type IN ('client_context', 'project_knowledge', 'decision_record', 'operational_note', 'internal_knowledge')
    ),
    CONSTRAINT chk_vault_knowledge_entry_status CHECK (
        status IN ('active', 'archived')
    ),
    CONSTRAINT chk_vault_knowledge_entry_metadata_is_object CHECK (
        metadata IS NULL OR jsonb_typeof(metadata) = 'object'
    )
);

-- Indexes for performance, workspace scoping, item linkage, and filtering
CREATE INDEX idx_vault_knowledge_workspace_id ON public.vault_knowledge_entries(workspace_id);
CREATE INDEX idx_vault_knowledge_item_id ON public.vault_knowledge_entries(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX idx_vault_knowledge_type ON public.vault_knowledge_entries(entry_type);
CREATE INDEX idx_vault_knowledge_status ON public.vault_knowledge_entries(status);
CREATE INDEX idx_vault_knowledge_created_at ON public.vault_knowledge_entries(workspace_id, created_at DESC);

-- Row Level Security (Policies deferred)
ALTER TABLE public.vault_knowledge_entries ENABLE ROW LEVEL SECURITY;