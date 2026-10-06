-- ============================================================================
-- MIGRATION 004 — WORKSPACES TABLE
-- ============================================================================

CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
    owner_user_id UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_workspace_exclusive_ownership CHECK (
        (organization_id IS NOT NULL AND owner_user_id IS NULL) OR 
        (organization_id IS NULL AND owner_user_id IS NOT NULL)
    )
);

-- Scoped slug uniqueness per tenant boundary (Org or Personal User)
CREATE UNIQUE INDEX idx_workspaces_org_slug_unq ON public.workspaces(organization_id, slug) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX idx_workspaces_user_slug_unq ON public.workspaces(owner_user_id, slug) WHERE owner_user_id IS NOT NULL;

-- Row Level Security (Policies deferred until WorkspaceMembership and authorization exist)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;