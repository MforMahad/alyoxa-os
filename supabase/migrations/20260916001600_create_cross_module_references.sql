-- ============================================================================
-- MIGRATION 016 — CROSS-MODULE REFERENCES TABLE
-- ============================================================================

CREATE TABLE public.cross_module_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_module VARCHAR(50) NOT NULL,
    source_record_id UUID NOT NULL,
    target_module VARCHAR(50) NOT NULL,
    target_record_id UUID NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_cmr_modules CHECK (
        source_module IN ('SIGNAL', 'AI', 'FORGE', 'PULSE', 'VAULT', 'SYSTEM') AND
        target_module IN ('SIGNAL', 'AI', 'FORGE', 'PULSE', 'VAULT', 'SYSTEM')
    ),
    CONSTRAINT chk_cmr_different_modules CHECK (source_module <> target_module),
    CONSTRAINT chk_cmr_reference_type CHECK (
        reference_type IN ('source', 'related', 'derived_from', 'supports', 'context')
    ),
    CONSTRAINT unq_cross_module_reference UNIQUE (workspace_id, source_module, source_record_id, target_module, target_record_id, reference_type)
);

-- Indexes for efficient traversal and filtering (workspace_id index omitted as it is covered by the leading column of the unique constraint)
CREATE INDEX idx_cross_module_references_source ON public.cross_module_references(source_module, source_record_id);
CREATE INDEX idx_cross_module_references_target ON public.cross_module_references(target_module, target_record_id);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.cross_module_references ENABLE ROW LEVEL SECURITY;