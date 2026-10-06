-- Migration 035: Before User Created Auth Hook for ALYOXA OS
-- Description: Implements domain validation for Supabase Auth Before User Created hook
-- with precise RLS and least-privilege permissions.
--
-- IMPORTANT:
-- This hook does NOT provision public.users, workspaces, memberships,
-- permissions, or dashboard access. Email verification remains the
-- proof of mailbox control.

-- 1. Create blocked email domains configuration table
CREATE TABLE IF NOT EXISTS public.blocked_email_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on the configuration table
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- Remove any previous version of the policy
DROP POLICY IF EXISTS "Allow read access on blocked domains for auth"
    ON public.blocked_email_domains;

-- Only the Supabase Auth service role used by the hook may read this table
CREATE POLICY "Allow read access on blocked domains for auth"
    ON public.blocked_email_domains
    FOR SELECT
    TO supabase_auth_admin
    USING (true);

-- Prevent API roles from reading the internal policy table
REVOKE ALL ON public.blocked_email_domains
    FROM anon, authenticated, public;

-- Seed initial disposable domain entry safely
INSERT INTO public.blocked_email_domains (domain, reason)
VALUES ('mailinator.com', 'Disposable email provider')
ON CONFLICT (domain) DO NOTHING;

-- 2. Grant only the permissions required by the Auth hook
GRANT USAGE ON SCHEMA public
    TO supabase_auth_admin;

GRANT SELECT ON public.blocked_email_domains
    TO supabase_auth_admin;

-- 3. Create the Before User Created Auth Hook function
CREATE OR REPLACE FUNCTION public.handle_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_email TEXT;
    v_domain TEXT;
    v_is_blocked BOOLEAN;
BEGIN
    -- Extract email from the Supabase Auth hook payload
    v_email := event #>> '{user, email}';

    -- Basic email structure validation.
    -- This validates syntax only; it does NOT prove mailbox existence.
    IF v_email IS NULL
       OR v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object(
                'http_code', 400,
                'message', 'Unable to process registration with this email address.'
            )
        );
    END IF;

    -- Normalize the domain
    v_domain := lower(trim(split_part(v_email, '@', 2)));

    -- Check against the maintainable blocked/disposable domain table
    SELECT EXISTS (
        SELECT 1
        FROM public.blocked_email_domains
        WHERE domain = v_domain
    )
    INTO v_is_blocked;

    IF v_is_blocked THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object(
                'http_code', 400,
                'message', 'Unable to process registration with this email address.'
            )
        );
    END IF;

    -- Supabase Before User Created success contract
    RETURN '{}'::jsonb;
END;
$$;

-- 4. Function execution permissions
REVOKE EXECUTE
    ON FUNCTION public.handle_before_user_created(jsonb)
    FROM PUBLIC;

GRANT EXECUTE
    ON FUNCTION public.handle_before_user_created(jsonb)
    TO supabase_auth_admin;
