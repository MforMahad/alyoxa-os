-- ============================================================================
-- MIGRATION 008 — ACTORS TABLE
-- ============================================================================

CREATE TABLE public.actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    actor_type VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_actor_user_type_consistency CHECK (
        (actor_type = 'user' AND user_id IS NOT NULL) OR 
        (actor_type <> 'user' AND user_id IS NULL)
    )
);

-- Indexes for efficient actor filtering and lookups
CREATE INDEX idx_actors_workspace_id ON public.actors(workspace_id);
CREATE INDEX idx_actors_actor_type ON public.actors(actor_type);

-- Partial unique index ensuring at most one user actor per user within a workspace
CREATE UNIQUE INDEX idx_actors_workspace_user_unq 
ON public.actors(workspace_id, user_id) 
WHERE user_id IS NOT NULL;

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;