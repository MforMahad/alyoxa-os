-- ============================================================================
-- MIGRATION 025 — VAULT FOLDERS TABLE
-- ============================================================================

CREATE TABLE public.vault_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    parent_folder_id UUID NULL REFERENCES public.vault_folders(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_vault_folder_status CHECK (
        status IN ('active', 'archived')
    ),
    CONSTRAINT chk_vault_folder_metadata_is_object CHECK (
        metadata IS NULL OR jsonb_typeof(metadata) = 'object'
    )
);

-- Partial unique indexes to prevent duplicate folder names within the same workspace,
-- handling root folders (parent IS NULL) and child folders (parent IS NOT NULL) separately.
CREATE UNIQUE INDEX idx_vault_folders_root_name_unq 
    ON public.vault_folders (workspace_id, name) 
    WHERE parent_folder_id IS NULL;

CREATE UNIQUE INDEX idx_vault_folders_child_name_unq 
    ON public.vault_folders (workspace_id, parent_folder_id, name) 
    WHERE parent_folder_id IS NOT NULL;

-- Indexes for efficient workspace scoping, hierarchy traversal, and status filtering
CREATE INDEX idx_vault_folders_workspace_id ON public.vault_folders(workspace_id);
CREATE INDEX idx_vault_folders_parent_id ON public.vault_folders(parent_folder_id) WHERE parent_folder_id IS NOT NULL;
CREATE INDEX idx_vault_folders_status ON public.vault_folders(status);

-- Row Level Security (Policies deferred)
ALTER TABLE public.vault_folders ENABLE ROW LEVEL SECURITY;