-- ============================================================================
-- MIGRATION 001 (STEP 1) — USERS TABLE (FINAL)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMPTZ,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    avatar_url TEXT,
    phone VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_select ON public.users
    FOR SELECT
    USING (auth_id = auth.uid());

CREATE POLICY users_self_insert ON public.users
    FOR INSERT
    WITH CHECK (auth_id = auth.uid());

CREATE POLICY users_self_update ON public.users
    FOR UPDATE
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());