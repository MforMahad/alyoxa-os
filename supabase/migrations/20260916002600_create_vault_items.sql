-- ============================================================================
-- MIGRATION 026 — VAULT ITEMS TABLE
-- ============================================================================

CREATE TABLE public.vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.vault_folders(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL,
    name VARCHAR(250) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    visibility VARCHAR(50) NOT NULL DEFAULT 'private',
    storage_key TEXT,
    mime_type VARCHAR(150),
    file_size_bytes BIGINT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_vault_item_type CHECK (
        item_type IN ('file', 'document', 'brand_asset', 'project_resource', 'template')
    ),
    CONSTRAINT chk_vault_item_status CHECK (
        status IN ('active', 'archived')
    ),
    CONSTRAINT chk_vault_item_visibility CHECK (
        visibility IN ('private', 'workspace', 'shared')
    ),
    CONSTRAINT chk_vault_item_file_size CHECK (
        file_size_bytes IS NULL OR file_size_bytes >= 0
    ),
    CONSTRAINT chk_vault_item_metadata_is_object CHECK (
        metadata IS NULL OR jsonb_typeof(metadata) = 'object'
    )
);

-- Indexes for performance, workspace scoping, folder traversal, and filtering
CREATE INDEX idx_vault_items_workspace_id ON public.vault_items(workspace_id);
CREATE INDEX idx_vault_items_folder_id ON public.vault_items(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX idx_vault_items_type ON public.vault_items(item_type);
CREATE INDEX idx_vault_items_status ON public.vault_items(status);
CREATE INDEX idx_vault_items_visibility ON public.vault_items(visibility);
CREATE INDEX idx_vault_items_created_at ON public.vault_items(workspace_id, created_at DESC);

-- Row Level Security (Policies deferred)
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;