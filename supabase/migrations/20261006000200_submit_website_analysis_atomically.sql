-- Update the primary website and connect/reuse its scan in one transaction.
CREATE OR REPLACE FUNCTION public.submit_website_analysis(
    p_workspace_id UUID,
    p_website_url TEXT
)
RETURNS TABLE (
    source_id UUID,
    source_public_id VARCHAR(64),
    website_id UUID,
    website_public_id VARCHAR(64),
    scan_id UUID,
    scan_public_id VARCHAR(64),
    scan_status VARCHAR(50),
    scan_reused BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_rows_updated INTEGER;
    v_normalized_domain VARCHAR(255);
    v_scan_reused BOOLEAN;
BEGIN
    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Workspace identifier is required';
    END IF;

    IF p_website_url IS NULL
       OR length(trim(p_website_url)) > 2048
       OR trim(p_website_url) !~* '^https?://[^/?#[:space:]]+([/?#].*)?$' THEN
        RAISE EXCEPTION 'A valid HTTP or HTTPS website URL is required';
    END IF;

    UPDATE public.workspaces
    SET website_url = trim(p_website_url)
    WHERE id = p_workspace_id
      AND public.has_workspace_role(
          id,
          ARRAY['owner', 'admin']
      );

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated <> 1 THEN
        RAISE EXCEPTION 'Workspace not found or not authorized';
    END IF;

    v_normalized_domain := lower(
        split_part(
            regexp_replace(
                regexp_replace(trim(p_website_url), '^https?://', '', 'i'),
                '[/?#].*$',
                ''
            ),
            ':',
            1
        )
    );

    PERFORM pg_advisory_xact_lock(
        hashtextextended(p_workspace_id::text || ':' || v_normalized_domain, 0)
    );

    SELECT EXISTS (
        SELECT 1
        FROM public.websites AS website
        JOIN public.website_scans AS scan
          ON scan.website_id = website.id
        WHERE website.workspace_id = p_workspace_id
          AND website.normalized_domain = v_normalized_domain
          AND scan.status IN ('queued', 'processing')
    )
    INTO v_scan_reused;

    RETURN QUERY
    SELECT
        connection.source_id,
        connection.source_public_id,
        connection.website_id,
        connection.website_public_id,
        connection.scan_id,
        connection.scan_public_id,
        connection.scan_status,
        v_scan_reused
    FROM public.connect_website_signal_source(p_workspace_id) AS connection;
END;
$$;

REVOKE ALL
ON FUNCTION public.submit_website_analysis(UUID, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.submit_website_analysis(UUID, TEXT)
TO authenticated;