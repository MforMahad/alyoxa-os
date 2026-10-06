-- ============================================================================
-- MIGRATION 030 — ENFORCE VAULT WORKSPACE ISOLATION VIA COMPOSITE FOREIGN KEYS
-- ============================================================================

-- 1. Create unique indexes on parent tables so composite foreign keys can reference them
CREATE UNIQUE INDEX idx_vault_folders_id_workspace_unq 
    ON public.vault_folders(id, workspace_id);

CREATE UNIQUE INDEX idx_vault_items_id_workspace_unq 
    ON public.vault_items(id, workspace_id);

CREATE UNIQUE INDEX idx_vault_knowledge_id_workspace_unq 
    ON public.vault_knowledge_entries(id, workspace_id);


-- 2. Drop existing single-column foreign keys and recreate them as composite foreign keys
--    including workspace_id to guarantee cross-tenant references are impossible at DB level.

-- vault_folders.parent_folder_id (CASCADE)
ALTER TABLE public.vault_folders
    DROP CONSTRAINT IF EXISTS vault_folders_parent_folder_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_vault_folders_parent_workspace;

ALTER TABLE public.vault_folders
    ADD CONSTRAINT fk_vault_folders_parent_workspace 
    FOREIGN KEY (parent_folder_id, workspace_id) 
    REFERENCES public.vault_folders(id, workspace_id) 
    ON DELETE CASCADE;


-- vault_items.folder_id (SET NULL on folder_id only, preserving NOT NULL workspace_id)
ALTER TABLE public.vault_items
    DROP CONSTRAINT IF EXISTS vault_items_folder_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_vault_items_folder_workspace;

ALTER TABLE public.vault_items
    ADD CONSTRAINT fk_vault_items_folder_workspace 
    FOREIGN KEY (folder_id, workspace_id) 
    REFERENCES public.vault_folders(id, workspace_id) 
    ON DELETE SET NULL (folder_id);


-- vault_knowledge_entries.item_id & supersedes_entry_id (SET NULL on respective columns only)
ALTER TABLE public.vault_knowledge_entries
    DROP CONSTRAINT IF EXISTS vault_knowledge_entries_item_id_fkey,
    DROP CONSTRAINT IF EXISTS vault_knowledge_entries_supersedes_entry_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_vault_knowledge_item_workspace,
    DROP CONSTRAINT IF EXISTS fk_vault_knowledge_supersedes_workspace;

ALTER TABLE public.vault_knowledge_entries
    ADD CONSTRAINT fk_vault_knowledge_item_workspace 
    FOREIGN KEY (item_id, workspace_id) 
    REFERENCES public.vault_items(id, workspace_id) 
    ON DELETE SET NULL (item_id),
    ADD CONSTRAINT fk_vault_knowledge_supersedes_workspace 
    FOREIGN KEY (supersedes_entry_id, workspace_id) 
    REFERENCES public.vault_knowledge_entries(id, workspace_id) 
    ON DELETE SET NULL (supersedes_entry_id);


-- vault_references.vault_item_id & vault_knowledge_entry_id (CASCADE)
ALTER TABLE public.vault_references
    DROP CONSTRAINT IF EXISTS vault_references_vault_item_id_fkey,
    DROP CONSTRAINT IF EXISTS vault_references_vault_knowledge_entry_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_vault_references_item_workspace,
    DROP CONSTRAINT IF EXISTS fk_vault_references_knowledge_workspace;

ALTER TABLE public.vault_references
    ADD CONSTRAINT fk_vault_references_item_workspace 
    FOREIGN KEY (vault_item_id, workspace_id) 
    REFERENCES public.vault_items(id, workspace_id) 
    ON DELETE CASCADE,
    ADD CONSTRAINT fk_vault_references_knowledge_workspace 
    FOREIGN KEY (vault_knowledge_entry_id, workspace_id) 
    REFERENCES public.vault_knowledge_entries(id, workspace_id) 
    ON DELETE CASCADE;