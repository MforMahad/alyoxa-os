-- ============================================================================
-- MIGRATION 050 — FIX connect_website_signal_source: null scan_id empty-result
-- ============================================================================
-- Corrects the scan-create/reuse semantics of public.connect_website_signal_source.
--
-- Root cause in the preceding migration (20261006000300):
--   - The loop-generated scan INSERT used ON CONFLICT (website_id) WHERE
--     status IN ('queued','processing') DO NOTHING.
--   - If an active scan already existed for the website, the insert was a
--     no-op AND the pre-insert v_scan_id remained pointing at an empty row.
--   - The function then exited with v_scan_id NULL and the final
--     "JOIN website_scans AS scan ON scan.id = v_scan_id" returned zero rows,
--     so the RPC silently returned no rows instead of the existing queued
--     scan.
--
-- This migration re-creates the function so it:
--   1. Holds the existing advisory lock (pg_advisory_xact_lock) that serializes
--      same-workspace/domain connection calls within a transaction.
--   2. Upserts the signal_feed_sources row (workspace_id, source_key).
--   3. Upserts the websites row (workspace_id, normalized_domain).
--   4. Selects the highest-priority existing active scan.
--   5. If no active scan exists, inserts exactly one new 'queued' scan.
--      ON CONFLICT (website_id) DO NOTHING protects against the advisory-lock
--      window without ever updating a completed/failed scan.
--   6. RAISES EXCEPTION if no queueable scan can be resolved, so the RPC never
--      silently returns an empty result set.
--
-- Authorization, SECURITY INVOKER, RLS, tenant scoping, and idempotency are
-- preserved exactly as in the original function.
--
-- NOTE: This is a forward migration. It re-creates the function and does NOT
-- modify the already-applied 20261006000300_enforce_website_scan_integrity.sql.
-- ============================================================================

BEGIN;

-- 1. Remove the broken function definition before recreating it.
DROP FUNCTION IF EXISTS public.connect_website_signal_source(UUID);

-- 2. Re-create the function with the corrected scan-create/reuse logic.
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

    -- ------------------------------------------------------------------------
    -- Workspace access (RLS authorization via SECURITY INVOKER).
    -- ------------------------------------------------------------------------
    SELECT workspace.website_url
    INTO v_website_url
    FROM public.workspaces AS workspace
    WHERE workspace.id = p_workspace_id
      AND public.is_active_workspace_member(workspace.id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found or not accessible';
    END IF;

    -- Canonicalize the URL and derive the domain used for identity.
    SELECT normalized.canonical_url, normalized.normalized_domain
    INTO v_website_url, v_normalized_domain
    FROM public.canonicalize_website_url(v_website_url) AS normalized;

    -- Serialize same-workspace/domain connection calls within a transaction.
    PERFORM pg_advisory_xact_lock(
        hashtextextended(p_workspace_id::TEXT || ':' || v_normalized_domain, 0)
    );

    -- ------------------------------------------------------------------------
    -- Signal source (workspace_id, source_key) upsert.
    -- ------------------------------------------------------------------------
    v_source_public_id := 'src_' || replace(gen_random_uuid()::TEXT, '-', '');

    INSERT INTO public.signal_feed_sources (
        public_id, workspace_id, source_type, name, source_key, status, description

    -- ------------------------------------------------------------------------
    -- Website (workspace_id, normalized_domain) upsert.
    -- ------------------------------------------------------------------------
    v_website_public_id := 'web_' || replace(gen_random_uuid()::TEXT, '-', '');

    INSERT INTO public.websites (
        public_id, workspace_id, name, entry_url, normalized_domain, status
    ) VALUES (
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

    -- ------------------------------------------------------------------------
    -- Queue-or-reuse the active scan.
    --
    -- The advisory lock above serializes concurrent calls for the same
    -- workspace/domain within a transaction. The partial unique index on
    -- website_scans (website_id, WHERE status IN ('queued','processing'))
    -- is the second barrier that guarantees only one active scan can ever be
    -- created. A completed/failed row does NOT conflict with that index, so it
    -- never blocks a new insert; this code only ever inserts or reads
    -- status='queued'.
    -- ------------------------------------------------------------------------

    -- Select the highest-priority existing active scan first.
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

    IF NOT FOUND THEN
        v_scan_id := gen_random_uuid();
        v_scan_public_id := 'scan_' || replace(gen_random_uuid()::TEXT, '-', '');
        v_scan_status := 'queued';

        -- Insert the new queued scan only if no active scan exists.
        -- DO NOTHING guarantees that concurrent writers under the advisory lock
        -- keep the existing active scan; we never update completed/failed rows.
        INSERT INTO public.website_scans (
            id, public_id, website_id, scan_type, status
        ) VALUES (
            v_scan_id, v_scan_public_id, v_website_id, 'standard', 'queued'
        )
        ON CONFLICT (website_id)
        WHERE status IN ('queued', 'processing')
        DO NOTHING;

        -- Re-read the active scan: either our new 'queued' row (if it landed)
        -- or an existing one created by a concurrent writer.
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
    END IF;

    -- Defensive: if no queueable scan can be resolved, fail loudly instead of
    -- returning an empty result set (the original bug). This path should never
    -- be reachable after the re-read above, but it is a safety net.
    IF v_scan_id IS NULL THEN
        RAISE EXCEPTION 'No queueable scan for the target website';
    END IF;

    -- ------------------------------------------------------------------------
    -- Return the complete connection result.
    -- ------------------------------------------------------------------------
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

-- 3. Preserve the partial unique index (already exists in the applied schema;
--    this re-state ensures the migration is self-contained and runnable
--    independently if needed. It is idempotent here).
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_scans_one_active_per_website
ON public.website_scans (website_id)
WHERE status IN ('queued', 'processing');

-- 4. Keep identical grants: only authenticated can execute this RPC.
REVOKE ALL
ON FUNCTION public.connect_website_signal_source(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.connect_website_signal_source(UUID)
TO authenticated;

COMMIT;


