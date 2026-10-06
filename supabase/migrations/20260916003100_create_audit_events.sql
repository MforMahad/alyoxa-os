-- ============================================================================
-- MIGRATION 031 — AUDIT EVENTS TABLE
-- ============================================================================

CREATE TABLE public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.actors(id) ON DELETE RESTRICT,
    action VARCHAR(100) NOT NULL,
    entity_module VARCHAR(50),
    entity_type VARCHAR(100),
    entity_id UUID,
    summary VARCHAR(500) NOT NULL,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_audit_event_module CHECK (
        entity_module IS NULL OR entity_module IN ('SIGNAL', 'AI', 'FORGE', 'PULSE', 'VAULT', 'SYSTEM')
    ),
    CONSTRAINT chk_audit_event_metadata_is_object CHECK (
        metadata IS NULL OR jsonb_typeof(metadata) = 'object'
    )
);

-- Indexes for efficient tenant scoping, actor tracking, entity lookup, and chronological history
CREATE INDEX idx_audit_events_workspace_id ON public.audit_events(workspace_id);
CREATE INDEX idx_audit_events_actor_id ON public.audit_events(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_events_entity ON public.audit_events(workspace_id, entity_module, entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_audit_events_action ON public.audit_events(action);
CREATE INDEX idx_audit_events_occurred_at ON public.audit_events(workspace_id, occurred_at DESC);

-- Row Level Security (Policies deferred)
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;