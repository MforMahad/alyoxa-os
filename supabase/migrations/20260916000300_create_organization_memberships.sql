-- ============================================================================
-- MIGRATION 003 — ORGANIZATION MEMBERSHIPS TABLE
-- ============================================================================

CREATE TABLE public.organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unq_org_user_membership UNIQUE (organization_id, user_id)
);

-- Row Level Security (Policies deferred to avoid recursive evaluation)
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;