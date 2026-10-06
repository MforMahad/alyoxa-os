-- ============================================================================
-- MIGRATION 006 — WEBSITES TABLE
-- ============================================================================

CREATE TABLE public.websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    entry_url TEXT,
    normalized_domain VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unq_workspace_normalized_domain UNIQUE (workspace_id, normalized_domain)
);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;