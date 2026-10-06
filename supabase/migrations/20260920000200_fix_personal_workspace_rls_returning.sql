-- ============================================================================
-- MIGRATION 041 — FIX PERSONAL WORKSPACE CREATION RLS RETURNING
-- ============================================================================
-- The workspace INSERT itself is permitted by workspaces_insert_policy.
-- INSERT ... RETURNING additionally requires the inserted row to be visible
-- under SELECT RLS. During bootstrap, the owner membership does not exist yet.
--
-- Fix:
--   1. Generate the workspace UUID before INSERT.
--   2. INSERT the workspace without RETURNING.
--   3. Insert the owner membership.
--   4. SELECT the workspace after membership exists.
--
-- RLS policies remain unchanged.
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
    v_app_user_id := public.current_application_user_id();

    IF v_app_user_id IS NULL THEN
        RAISE EXCEPTION 'Application user not found';
    END IF;

    v_clean_name := trim(p_name);

    IF length(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Invalid workspace name';
    END IF;

    IF length(v_clean_name) > 200 THEN
        RAISE EXCEPTION 'Invalid workspace name';
    END IF;

    v_clean_slug := trim(
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

    -- Generate identifiers before insertion so INSERT does not need RETURNING.
    v_workspace_id := gen_random_uuid();

    v_workspace_public_id :=
        'ws_' || replace(gen_random_uuid()::text, '-', '');

    v_membership_public_id :=
        'wsm_' || replace(gen_random_uuid()::text, '-', '');

    -- Create the workspace without RETURNING.
    INSERT INTO public.workspaces (
        id,
        public_id,
        name,
        slug,
        organization_id,
        owner_user_id,
        status
    )
    VALUES (
        v_workspace_id,
        v_workspace_public_id,
        v_clean_name,
        v_clean_slug,
        NULL,
        v_app_user_id,
        'active'
    );

    -- Bootstrap the owner membership.
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

    -- Now the workspace is visible through the normal SELECT policy.
    RETURN QUERY
    SELECT
        w.id,
        w.public_id,
        w.name,
        w.slug,
        w.status,
        w.created_at
    FROM public.workspaces AS w
    WHERE w.id = v_workspace_id;
END;
$$;

REVOKE ALL
ON FUNCTION public.create_personal_workspace(TEXT, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.create_personal_workspace(TEXT, TEXT)
TO authenticated;