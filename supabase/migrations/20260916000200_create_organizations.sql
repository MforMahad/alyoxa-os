-- ============================================================================
-- MIGRATION 001 (STEP 2) — ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Row Level Security (Policies deferred until organization_memberships is created)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;