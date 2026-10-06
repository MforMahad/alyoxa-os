BEGIN;

-- Canonical website identity contract:
--   * HTTP(S) only; scheme is not part of identity.
--   * ASCII DNS hostnames (the application converts IDNs to punycode).
--   * Lowercase host, remove one terminal root dot.
--   * Explicit default ports are accepted and omitted from canonical_url.
--   * Credentials, IP literals, non-default ports, local/reserved suffixes,
--     malformed labels, and single-label hosts are rejected.
--   * Path/query do not affect normalized_domain; fragments are discarded.
-- DNS resolution remains exclusively in the SSRF-safe scanner.

CREATE OR REPLACE FUNCTION public.canonicalize_website_url(p_url TEXT)
RETURNS TABLE (
    canonical_url TEXT,
    normalized_domain VARCHAR(255)
)
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_input TEXT;
    v_scheme TEXT;
    v_authority TEXT;
    v_host TEXT;
    v_port TEXT;
    v_port_number NUMERIC;
    v_labels TEXT[];
    v_label TEXT;
    v_tail TEXT;
BEGIN
    v_input := trim(p_url);
    IF v_input IS NULL OR v_input = '' OR char_length(v_input) > 2048 THEN
        RAISE EXCEPTION 'Website URL is empty or too long';
    END IF;

    v_scheme := lower(substring(v_input FROM '^([A-Za-z][A-Za-z0-9+.-]*)://'));
    IF v_scheme NOT IN ('http', 'https') THEN
        RAISE EXCEPTION 'Website URL must use HTTP or HTTPS';
    END IF;

    v_authority := substring(
        v_input FROM '^[A-Za-z][A-Za-z0-9+.-]*://([^/?#]*)'
    );
    IF v_authority IS NULL OR v_authority = '' THEN
        RAISE EXCEPTION 'Website URL has no hostname';
    END IF;
    IF strpos(v_authority, '@') > 0 OR v_authority ~ '[[:space:]]' THEN
        RAISE EXCEPTION 'Website URL credentials or whitespace are not allowed';
    END IF;
    IF left(v_authority, 1) = '[' THEN
        RAISE EXCEPTION 'Website IP literals are not supported';
    END IF;

    IF v_authority ~ '^[0-9.]+(:[0-9]+)?$' THEN
        RAISE EXCEPTION 'Website IP literals are not supported';
    END IF;

    IF strpos(v_authority, ':') > 0 THEN
        IF length(v_authority) - length(replace(v_authority, ':', '')) <> 1 THEN
            RAISE EXCEPTION 'IPv6 literals are not supported';
        END IF;
        v_host := split_part(v_authority, ':', 1);
        v_port := split_part(v_authority, ':', 2);
        IF v_port = '' OR v_port !~ '^[0-9]+$' THEN
            RAISE EXCEPTION 'Website URL port is invalid';
        END IF;
        v_port_number := v_port::NUMERIC;
        IF v_port_number < 1 OR v_port_number > 65535 THEN
            RAISE EXCEPTION 'Website URL port is invalid';
        END IF;
        IF (v_scheme = 'http' AND v_port_number <> 80)
           OR (v_scheme = 'https' AND v_port_number <> 443) THEN
            RAISE EXCEPTION 'Website URL uses a disallowed port';
        END IF;
    ELSE
        v_host := v_authority;
    END IF;

    v_host := lower(v_host);
    IF right(v_host, 1) = '.' THEN
        v_host := left(v_host, length(v_host) - 1);
    END IF;
    -- source_key is VARCHAR(100); the "website:" namespace uses 8 chars.
    IF v_host = '' OR right(v_host, 1) = '.' OR length(v_host) > 92 THEN
        RAISE EXCEPTION 'Website hostname is invalid';
    END IF;
    IF v_host !~ '^[a-z0-9.-]+$' THEN
        RAISE EXCEPTION 'Website hostname must be ASCII DNS or punycode';
    END IF;

    v_labels := string_to_array(v_host, '.');
    IF cardinality(v_labels) < 2 THEN
        RAISE EXCEPTION 'Single-label website hostnames are not supported';
    END IF;
    FOREACH v_label IN ARRAY v_labels LOOP
        IF length(v_label) < 1
           OR length(v_label) > 63
           OR v_label !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' THEN
            RAISE EXCEPTION 'Website hostname label is invalid';
        END IF;
    END LOOP;
    IF v_labels[cardinality(v_labels)] !~ '[a-z]' THEN
        RAISE EXCEPTION 'Website hostname must not end in a numeric label';
    END IF;

    IF v_host = 'localhost'
       OR v_host LIKE '%.localhost'
       OR v_host LIKE '%.local'
       OR v_host LIKE '%.internal'
       OR v_host LIKE '%.test'
       OR v_host LIKE '%.invalid'
       OR v_host LIKE '%.example' THEN
        RAISE EXCEPTION 'Local and reserved website destinations are not allowed';
    END IF;

    v_tail := substring(
        v_input FROM char_length(v_scheme) + 4 + char_length(v_authority)
    );
    IF v_tail = '' THEN
        v_tail := '/';
    ELSIF left(v_tail, 1) IN ('?', '#') THEN
        v_tail := '/' || v_tail;
    END IF;
    IF strpos(v_tail, '#') > 0 THEN
        v_tail := left(v_tail, strpos(v_tail, '#') - 1);
        IF v_tail = '' THEN
            v_tail := '/';
        END IF;
    END IF;

    canonical_url := v_scheme || '://' || v_host || v_tail;
    IF char_length(canonical_url) > 2048 THEN
        RAISE EXCEPTION 'Canonical website URL is too long';
    END IF;
    normalized_domain := v_host;
    RETURN NEXT;
END;
$$;

REVOKE ALL
ON FUNCTION public.canonicalize_website_url(TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.canonicalize_website_url(TEXT)
TO authenticated;

-- Prevent concurrent writes while identities and active rows are reconciled.
LOCK TABLE public.websites, public.signal_feed_sources, public.website_scans
IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
    v_row RECORD;
BEGIN
    FOR v_row IN SELECT id, entry_url FROM public.websites LOOP
        BEGIN
            PERFORM public.canonicalize_website_url(v_row.entry_url);
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Cannot canonicalize website % (entry_url=%): %',
                v_row.id, v_row.entry_url, SQLERRM;
        END;
    END LOOP;

    FOR v_row IN
        SELECT id, source_key
        FROM public.signal_feed_sources
        WHERE source_type = 'website'
          AND source_key IS NOT NULL
    LOOP
        BEGIN
            IF left(v_row.source_key, 8) <> 'website:'
               OR v_row.source_key ~ '[/#?]' THEN
                RAISE EXCEPTION 'Website source key is not website:<hostname>';
            END IF;
            PERFORM public.canonicalize_website_url(
                'https://' || substring(v_row.source_key FROM 9)
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Cannot canonicalize website source % (source_key=%): %',
                v_row.id, v_row.source_key, SQLERRM;
        END;
    END LOOP;
END;
$$;

CREATE TEMP TABLE _website_identity_canonicalization ON COMMIT DROP AS
WITH canonical AS (
    SELECT
        website.id,
        website.workspace_id,
        website.created_at,
        website.updated_at,
        normalized.canonical_url,
        normalized.normalized_domain
    FROM public.websites AS website
    CROSS JOIN LATERAL public.canonicalize_website_url(website.entry_url) AS normalized
), ranked AS (
    SELECT
        canonical.*,
        first_value(id) OVER (
            PARTITION BY workspace_id, normalized_domain
            ORDER BY updated_at DESC, created_at ASC, id ASC
        ) AS keeper_id,
        first_value(canonical_url) OVER (
            PARTITION BY workspace_id, normalized_domain
            ORDER BY updated_at DESC, created_at ASC, id ASC
        ) AS keeper_url
    FROM canonical
)
SELECT * FROM ranked;

DO $$
DECLARE
    v_duplicate RECORD;
BEGIN
    FOR v_duplicate IN
        SELECT workspace_id, normalized_domain, array_agg(id ORDER BY id) AS website_ids
        FROM _website_identity_canonicalization
        GROUP BY workspace_id, normalized_domain
        HAVING count(*) > 1
    LOOP
        RAISE WARNING
            'Merging canonical website aliases: workspace %, domain %, website IDs %; scans will be reassigned and retained',
            v_duplicate.workspace_id,
            v_duplicate.normalized_domain,
            v_duplicate.website_ids;
    END LOOP;
END;
$$;

UPDATE public.website_scans AS scan
SET website_id = website_map.keeper_id
FROM _website_identity_canonicalization AS website_map
WHERE scan.website_id = website_map.id
  AND website_map.id <> website_map.keeper_id;

DELETE FROM public.websites AS website
USING _website_identity_canonicalization AS website_map
WHERE website.id = website_map.id
  AND website_map.id <> website_map.keeper_id;

UPDATE public.websites AS website
SET
    normalized_domain = website_map.normalized_domain,
    entry_url = website_map.keeper_url,
    updated_at = clock_timestamp()
FROM _website_identity_canonicalization AS website_map
WHERE website.id = website_map.keeper_id
  AND (
      website.normalized_domain IS DISTINCT FROM website_map.normalized_domain
      OR website.entry_url IS DISTINCT FROM website_map.keeper_url
  );

CREATE TEMP TABLE _website_source_canonicalization ON COMMIT DROP AS
WITH canonical AS (
    SELECT
        source.id,
        source.workspace_id,
        source.source_key,
        source.created_at,
        normalized.normalized_domain
    FROM public.signal_feed_sources AS source
    CROSS JOIN LATERAL public.canonicalize_website_url(
        'https://' || substring(source.source_key FROM 9)
    ) AS normalized
    WHERE source.source_type = 'website'
      AND source.source_key IS NOT NULL
), ranked AS (
    SELECT
        canonical.*,
        first_value(id) OVER (
            PARTITION BY workspace_id, normalized_domain
            ORDER BY created_at ASC, id ASC
        ) AS keeper_id
    FROM canonical
)
SELECT * FROM ranked;

DO $$
DECLARE
    v_duplicate RECORD;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM _website_source_canonicalization AS website_source
        JOIN public.signal_feed_sources AS other_source
          ON other_source.workspace_id = website_source.workspace_id
         AND other_source.source_key = 'website:' || website_source.normalized_domain
         AND other_source.source_type <> 'website'
    ) THEN
        RAISE EXCEPTION
            'A non-website Signal source already owns a canonical website source key; resolve that collision before migration';
    END IF;

    FOR v_duplicate IN
        SELECT workspace_id, normalized_domain, array_agg(id ORDER BY id) AS source_ids
        FROM _website_source_canonicalization
        GROUP BY workspace_id, normalized_domain
        HAVING count(*) > 1
    LOOP
        RAISE WARNING
            'Canonical website source aliases: workspace %, domain %, source IDs %; non-winning source rows and observations will be retained with NULL source_key',
            v_duplicate.workspace_id,
            v_duplicate.normalized_domain,
            v_duplicate.source_ids;
    END LOOP;
END;
$$;

UPDATE public.signal_feed_sources AS source
SET source_key = NULL
FROM _website_source_canonicalization AS source_map
WHERE source.id = source_map.id
  AND source_map.id <> source_map.keeper_id;

UPDATE public.signal_feed_sources AS source
SET
    source_key = 'website:' || source_map.normalized_domain,
    name = source_map.normalized_domain,
    updated_at = clock_timestamp()
FROM _website_source_canonicalization AS source_map
WHERE source.id = source_map.keeper_id;

-- Report and preserve duplicate active scans by deterministically keeping one
-- processing scan (or oldest queued scan) and marking the rest failed.
CREATE TEMP TABLE _active_website_scan_reconciliation ON COMMIT DROP AS
SELECT
    scan.id,
    scan.website_id,
    scan.status,
    first_value(scan.id) OVER (
        PARTITION BY scan.website_id
        ORDER BY
            CASE WHEN scan.status = 'processing' THEN 0 ELSE 1 END,
            scan.started_at ASC NULLS LAST,
            scan.created_at ASC,
            scan.id ASC
    ) AS keeper_id,
    row_number() OVER (
        PARTITION BY scan.website_id
        ORDER BY
            CASE WHEN scan.status = 'processing' THEN 0 ELSE 1 END,
            scan.started_at ASC NULLS LAST,
            scan.created_at ASC,
            scan.id ASC
    ) AS active_rank
FROM public.website_scans AS scan
WHERE scan.status IN ('queued', 'processing');

DO $$
DECLARE
    v_duplicate RECORD;
BEGIN
    FOR v_duplicate IN
        SELECT
            website_id,
            min(keeper_id::TEXT)::UUID AS keeper_id,
            array_agg(id::TEXT || ':' || status ORDER BY active_rank) AS duplicate_scans
        FROM _active_website_scan_reconciliation
        GROUP BY website_id
        HAVING count(*) > 1
    LOOP
        RAISE WARNING
            'Reconciling active scans for website %: keeping %, marking other rows failed: %',
            v_duplicate.website_id,
            v_duplicate.keeper_id,
            v_duplicate.duplicate_scans;
    END LOOP;
END;
$$;

UPDATE public.website_scans AS scan
SET
    status = 'failed',
    completed_at = COALESCE(scan.completed_at, clock_timestamp()),
    error_message = concat_ws(
        E'\n',
        NULLIF(scan.error_message, ''),
        'Marked failed by website scan integrity migration; active scan '
            || reconciliation.keeper_id::TEXT || ' was retained.'
    )
FROM _active_website_scan_reconciliation AS reconciliation
WHERE scan.id = reconciliation.id
  AND reconciliation.active_rank > 1;

CREATE UNIQUE INDEX idx_website_scans_one_active_per_website
ON public.website_scans (website_id)
WHERE status IN ('queued', 'processing');

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
        ON CONFLICT (website_id)
        WHERE status IN ('queued', 'processing')
        DO NOTHING;

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

CREATE OR REPLACE FUNCTION public.get_latest_website_scan_status(
    p_workspace_id UUID,
    p_normalized_domain VARCHAR(255)
)
RETURNS TABLE (
    id UUID,
    website_domain VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_normalized_domain VARCHAR(255);
BEGIN
    SELECT normalized.normalized_domain
    INTO v_normalized_domain
    FROM public.canonicalize_website_url('https://' || p_normalized_domain) AS normalized;

    RETURN QUERY
    SELECT
        scan.id,
        website.normalized_domain,
        scan.status,
        scan.created_at,
        scan.started_at,
        scan.completed_at,
        scan.error_message
    FROM public.websites AS website
    CROSS JOIN LATERAL (
        SELECT
            candidate.id,
            candidate.status,
            candidate.created_at,
            candidate.started_at,
            candidate.completed_at,
            candidate.error_message
        FROM public.website_scans AS candidate
        WHERE candidate.website_id = website.id
          AND candidate.status IN ('queued', 'processing', 'completed', 'failed')
        ORDER BY
            CASE
                WHEN candidate.status IN ('queued', 'processing') THEN 0
                ELSE 1
            END,
            candidate.created_at DESC,
            candidate.id
        LIMIT 1
    ) AS scan
    WHERE website.workspace_id = p_workspace_id
      AND website.normalized_domain = v_normalized_domain
      AND public.is_active_workspace_member(website.workspace_id);
END;
$$;

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
    v_canonical_url TEXT;
    v_normalized_domain VARCHAR(255);
    v_scan_reused BOOLEAN;
BEGIN
    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Workspace identifier is required';
    END IF;

    SELECT normalized.canonical_url, normalized.normalized_domain
    INTO v_canonical_url, v_normalized_domain
    FROM public.canonicalize_website_url(p_website_url) AS normalized;

    UPDATE public.workspaces
    SET website_url = v_canonical_url
    WHERE id = p_workspace_id
      AND public.has_workspace_role(id, ARRAY['owner', 'admin']);

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated <> 1 THEN
        RAISE EXCEPTION 'Workspace not found or not authorized';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(p_workspace_id::TEXT || ':' || v_normalized_domain, 0)
    );

    SELECT EXISTS (
        SELECT 1
        FROM public.websites AS website
        JOIN public.website_scans AS scan ON scan.website_id = website.id
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
ON FUNCTION public.get_latest_website_scan_status(UUID, VARCHAR)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_latest_website_scan_status(UUID, VARCHAR)
TO authenticated;

COMMIT;