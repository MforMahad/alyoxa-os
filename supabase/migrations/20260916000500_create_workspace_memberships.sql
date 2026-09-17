-- ============================================================================
-- MIGRATION 005 — WORKSPACE MEMBERSHIPS TABLE
-- ============================================================================

CREATE TABLE public.workspace_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unq_workspace_user_membership UNIQUE (workspace_id, user_id)
);

-- Index for efficient lookup of all workspaces belonging to a specific user
CREATE INDEX idx_workspace_memberships_user_id ON public.workspace_memberships(user_id);

-- Row Level Security (Policies deferred to avoid recursive self-referencing issues during authorization setup)
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;