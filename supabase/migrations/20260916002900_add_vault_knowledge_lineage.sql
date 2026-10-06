-- ============================================================================
-- MIGRATION 029 — ADD KNOWLEDGE SUPERSEDED LINEAGE TO VAULT KNOWLEDGE ENTRIES
-- ============================================================================

ALTER TABLE public.vault_knowledge_entries
    ADD COLUMN supersedes_entry_id UUID NULL 
        REFERENCES public.vault_knowledge_entries(id) 
        ON DELETE SET NULL,
    ADD CONSTRAINT chk_vault_knowledge_no_self_supersession 
        CHECK (supersedes_entry_id IS NULL OR supersedes_entry_id <> id);

-- Index for efficient lineage traversal and ancestor/descendant tracking
CREATE INDEX idx_vault_knowledge_supersedes_id 
    ON public.vault_knowledge_entries(supersedes_entry_id) 
    WHERE supersedes_entry_id IS NOT NULL;