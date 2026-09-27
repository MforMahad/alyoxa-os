-- ============================================================================
-- MIGRATION 044 — ATOMIC WEBSITE → SIGNAL SOURCE CONNECTION
-- ============================================================================
-- Creates/reuses the workspace website Signal source and queues a scan
-- atomically.
--
-- Flow:
--   workspace.website_url
--        ↓
--   signal_feed_sources
--        ↓
--   websites
--        ↓
--   website_scans
--
-- RLS remains authoritative through SECURITY INVOKER execution.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.connect_website_signal_source(
    p_workspace_id UUID
)
RETURNS TABLE (
    source_id UUID,
    source_public_id VARCHAR(64),
    website_id UUID,
    website_public_id VARCHAR(64),
    scan_id UUID,
    scan_public_id VARCHAR(64),
    scan_status VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_website_url TEXT;
    v_normalized_domain VARCHAR(255);

    v_source_id UUID;
    v_source_public_id VARCHAR(64);

    v_website_id UUID;
    v_website_public_id VARCHAR(64);

    v_scan_id UUID;
    v_scan_public_id VARCHAR(64);
BEGIN
    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Workspace identifier is required';
    END IF;

    -- ------------------------------------------------------------------------
    -- Workspace access
    -- ------------------------------------------------------------------------

    SELECT w.website_url
    INTO v_website_url
    FROM public.workspaces AS w
    WHERE w.id = p_workspace_id
      AND public.is_active_workspace_member(w.id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found or not accessible';
    END IF;

    IF v_website_url IS NULL OR trim(v_website_url) = '' THEN
        RAISE EXCEPTION 'Workspace website URL is not configured';
    END IF;

    v_website_url := trim(v_website_url);

    -- ------------------------------------------------------------------------
    -- Normalize hostname
    --
    -- The application layer performs full URL validation.
    -- This database layer derives the domain used for uniqueness.
    -- ------------------------------------------------------------------------

    v_normalized_domain := lower(
        split_part(
            regexp_replace(
                regexp_replace(
                    v_website_url,
                    '^https?://',
                    '',
                    'i'
                ),
                '[/?#].*$',
                ''
            ),
            ':',
            1
        )
    );

    IF v_normalized_domain IS NULL
       OR trim(v_normalized_domain) = '' THEN
        RAISE EXCEPTION 'Unable to determine website domain';
    END IF;

    -- ------------------------------------------------------------------------
    -- Signal source
    -- ------------------------------------------------------------------------

    v_source_public_id :=
        'src_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.signal_feed_sources (
        public_id,
        workspace_id,
        source_type,
        name,
        source_key,
        status,
        description
    )
    VALUES (
        v_source_public_id,
        p_workspace_id,
        'website',
        v_normalized_domain,
        'website:' || v_normalized_domain,
        'active',
        'Primary workspace website source'
    )
    ON CONFLICT (workspace_id, source_key)
    WHERE source_key IS NOT NULL
    DO UPDATE
    SET
        name = EXCLUDED.name,
        source_type = EXCLUDED.source_type,
        status = 'active',
        description = EXCLUDED.description,
        updated_at = clock_timestamp();

    SELECT
        s.id,
        s.public_id
    INTO
        v_source_id,
        v_source_public_id
    FROM public.signal_feed_sources AS s
    WHERE s.workspace_id = p_workspace_id
      AND s.source_key = 'website:' || v_normalized_domain;

    IF v_source_id IS NULL THEN
        RAISE EXCEPTION 'Unable to create or resolve Signal source';
    END IF;

    -- ------------------------------------------------------------------------
    -- Website
    -- ------------------------------------------------------------------------

    v_website_public_id :=
        'web_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.websites (
        public_id,
        workspace_id,
        name,
        entry_url,
        normalized_domain,
        status
    )
    VALUES (
        v_website_public_id,
        p_workspace_id,
        v_normalized_domain,
        v_website_url,
        v_normalized_domain,
        'active'
    )
    ON CONFLICT (workspace_id, normalized_domain)
    DO UPDATE
    SET
        name = EXCLUDED.name,
        entry_url = EXCLUDED.entry_url,
        status = 'active',
        updated_at = clock_timestamp();

    SELECT
        w.id,
        w.public_id
    INTO
        v_website_id,
        v_website_public_id
    FROM public.websites AS w
    WHERE w.workspace_id = p_workspace_id
      AND w.normalized_domain = v_normalized_domain;

    IF v_website_id IS NULL THEN
        RAISE EXCEPTION 'Unable to create or resolve website record';
    END IF;

    -- ------------------------------------------------------------------------
    -- Queue scan
    -- ------------------------------------------------------------------------

    v_scan_id := gen_random_uuid();

    v_scan_public_id :=
        'scan_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.website_scans (
        id,
        public_id,
        website_id,
        scan_type,
        status
    )
    VALUES (
        v_scan_id,
        v_scan_public_id,
        v_website_id,
        'standard',
        'queued'
    );

    -- ------------------------------------------------------------------------
    -- Return complete connection result
    -- ------------------------------------------------------------------------

    RETURN QUERY
    SELECT
        s.id,
        s.public_id,
        w.id,
        w.public_id,
        ws.id,
        ws.public_id,
        ws.status
    FROM public.signal_feed_sources AS s
    JOIN public.websites AS w
        ON w.workspace_id = s.workspace_id
       AND w.normalized_domain = v_normalized_domain
    JOIN public.website_scans AS ws
        ON ws.id = v_scan_id
    WHERE s.id = v_source_id
      AND s.workspace_id = p_workspace_id;

END;
$$;


REVOKE ALL
ON FUNCTION public.connect_website_signal_source(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.connect_website_signal_source(UUID)
TO authenticated;