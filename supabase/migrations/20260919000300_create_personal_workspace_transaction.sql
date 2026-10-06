-- ============================================================================
-- MIGRATION 040 — ATOMIC PERSONAL WORKSPACE CREATION
-- ============================================================================
-- Creates a transactional RPC for:
--
--   personal workspace
--       +
--   first OWNER membership
--
-- The function executes as the authenticated caller.
-- Existing RLS policies from Migration 037 remain active and enforce
-- authorization.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_personal_workspace(
    p_name TEXT,
    p_slug TEXT
)
RETURNS TABLE (
    id UUID,
    public_id VARCHAR(64),
    name VARCHAR(200),
    slug VARCHAR(200),
    status VARCHAR(50),
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_app_user_id UUID;
    v_workspace_id UUID;
    v_workspace_public_id VARCHAR(64);
    v_membership_public_id VARCHAR(64);
    v_clean_name TEXT;
    v_clean_slug TEXT;
BEGIN

    -- ========================================================================
    -- 1. Resolve ALYOXA application user
    -- ========================================================================

    v_app_user_id := public.current_application_user_id();

    IF v_app_user_id IS NULL THEN
        RAISE EXCEPTION 'Application user not found';
    END IF;


    -- ========================================================================
    -- 2. Validate workspace name
    -- ========================================================================

    v_clean_name := trim(p_name);

    IF length(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Invalid workspace name';
    END IF;

    IF length(v_clean_name) > 200 THEN
        RAISE EXCEPTION 'Invalid workspace name';
    END IF;


    -- ========================================================================
    -- 3. Normalize and validate slug
    -- ========================================================================
    -- Keep normalization deterministic because this function is also callable
    -- directly through Supabase RPC.

    v_clean_slug :=
        trim(
            BOTH '-'
            FROM regexp_replace(
                lower(trim(p_slug)),
                '[^a-z0-9]+',
                '-',
                'g'
            )
        );

    IF length(v_clean_slug) < 2 THEN
        RAISE EXCEPTION 'Invalid workspace slug';
    END IF;

    IF length(v_clean_slug) > 200 THEN
        RAISE EXCEPTION 'Invalid workspace slug';
    END IF;


    -- ========================================================================
    -- 4. Generate ALYOXA public IDs
    -- ========================================================================

    v_workspace_public_id :=
        'ws_' || replace(gen_random_uuid()::text, '-', '');

    v_membership_public_id :=
        'wsm_' || replace(gen_random_uuid()::text, '-', '');


    -- ========================================================================
    -- 5. Create personal workspace
    -- ========================================================================
    -- RLS from Migration 037 verifies:
    --
    -- organization_id IS NULL
    -- owner_user_id = current application user
    -- status = active

    INSERT INTO public.workspaces (
        public_id,
        name,
        slug,
        organization_id,
        owner_user_id,
        status
    )
    VALUES (
        v_workspace_public_id,
        v_clean_name,
        v_clean_slug,
        NULL,
        v_app_user_id,
        'active'
    )
    RETURNING
        public.workspaces.id
    INTO
        v_workspace_id;


    -- ========================================================================
    -- 6. Create first OWNER membership
    -- ========================================================================
    -- Existing Migration 037 bootstrap RLS requires:
    --
    -- current application user
    -- role = owner
    -- status = active
    -- personal workspace
    -- zero existing memberships
    --
    -- This is the first and only bootstrap membership.

    INSERT INTO public.workspace_memberships (
        public_id,
        workspace_id,
        user_id,
        role,
        status
    )
    VALUES (
        v_membership_public_id,
        v_workspace_id,
        v_app_user_id,
        'owner',
        'active'
    );


    -- ========================================================================
    -- 7. Return workspace
    -- ========================================================================

    RETURN QUERY
    SELECT
        w.id,
        w.public_id,
        w.name,
        w.slug,
        w.status,
        w.created_at
    FROM public.workspaces w
    WHERE w.id = v_workspace_id;

END;
$$;


-- ============================================================================
-- 8. FUNCTION PRIVILEGES
-- ============================================================================

REVOKE ALL
    ON FUNCTION public.create_personal_workspace(TEXT, TEXT)
    FROM PUBLIC;

GRANT EXECUTE
    ON FUNCTION public.create_personal_workspace(TEXT, TEXT)
    TO authenticated;