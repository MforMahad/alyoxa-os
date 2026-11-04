-- Fix PostgreSQL 42702: website_id is also a RETURNS TABLE output variable.
-- Preserve the latest tracked function definition from 20261006000300, changing
-- only the scan INSERT conflict clause. CREATE OR REPLACE retains existing grants.
-- No tables, indexes, policies, authorization rules, or historical migrations change.

BEGIN;

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
    v_scan_status VARCHAR(50);
BEGIN
    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Workspace identifier is required';
    END IF;

    SELECT workspace.website_url
    INTO v_website_url
    FROM public.workspaces AS workspace
    WHERE workspace.id = p_workspace_id
      AND public.is_active_workspace_member(workspace.id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found or not accessible';
    END IF;

    SELECT normalized.canonical_url, normalized.normalized_domain
    INTO v_website_url, v_normalized_domain
    FROM public.canonicalize_website_url(v_website_url) AS normalized;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(p_workspace_id::TEXT || ':' || v_normalized_domain, 0)
    );

    v_source_public_id := 'src_' || replace(gen_random_uuid()::TEXT, '-', '');
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
    DO UPDATE SET
        name = EXCLUDED.name,
        source_type = EXCLUDED.source_type,
        status = 'active',
        description = EXCLUDED.description,
        updated_at = clock_timestamp();

    SELECT source.id, source.public_id
    INTO v_source_id, v_source_public_id
    FROM public.signal_feed_sources AS source
    WHERE source.workspace_id = p_workspace_id
      AND source.source_type = 'website'
      AND source.source_key = 'website:' || v_normalized_domain;

    IF v_source_id IS NULL THEN
        RAISE EXCEPTION 'Unable to create or resolve Signal source';
    END IF;

    v_website_public_id := 'web_' || replace(gen_random_uuid()::TEXT, '-', '');
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
    DO UPDATE SET
        name = EXCLUDED.name,
        entry_url = EXCLUDED.entry_url,
        status = 'active',
        updated_at = clock_timestamp();

    SELECT website.id, website.public_id
    INTO v_website_id, v_website_public_id
    FROM public.websites AS website
    WHERE website.workspace_id = p_workspace_id
      AND website.normalized_domain = v_normalized_domain;

    IF v_website_id IS NULL THEN
        RAISE EXCEPTION 'Unable to create or resolve website record';
    END IF;

    LOOP
        SELECT scan.id, scan.public_id, scan.status
        INTO v_scan_id, v_scan_public_id, v_scan_status
        FROM public.website_scans AS scan
        WHERE scan.website_id = v_website_id
          AND scan.status IN ('queued', 'processing')
        ORDER BY
            CASE WHEN scan.status = 'processing' THEN 0 ELSE 1 END,
            scan.created_at DESC,
            scan.id
        LIMIT 1;

        IF FOUND THEN
            EXIT;
        END IF;

        v_scan_id := gen_random_uuid();
        v_scan_public_id := 'scan_' || replace(gen_random_uuid()::TEXT, '-', '');
        v_scan_status := 'queued';

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
        )
        ON CONFLICT DO NOTHING;

        IF FOUND THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN QUERY
    SELECT
        source.id,
        source.public_id,
        website.id,
        website.public_id,
        scan.id,
        scan.public_id,
        scan.status
    FROM public.signal_feed_sources AS source
    JOIN public.websites AS website
      ON website.workspace_id = source.workspace_id
     AND website.normalized_domain = v_normalized_domain
    JOIN public.website_scans AS scan
      ON scan.id = v_scan_id
    WHERE source.id = v_source_id
      AND source.workspace_id = p_workspace_id;
END;
$$;

COMMIT;
