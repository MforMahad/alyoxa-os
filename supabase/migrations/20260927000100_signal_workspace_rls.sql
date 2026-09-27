-- ============================================================================
-- MIGRATION 043 — SIGNAL WORKSPACE RLS + MINIMUM PRIVILEGES
-- ============================================================================
-- Purpose:
--   Establish workspace-scoped access rules for:
--     public.signal_feed_sources
--     public.websites
--     public.website_scans
--
-- Authorization model:
--   - Active workspace members can read Signal data belonging to their
--     workspace.
--   - Owners/admins manage Signal sources and websites.
--   - Active workspace members can queue website scans.
--   - Scan mutations are not exposed to authenticated clients; future workers
--     can operate through service_role.
--
-- Tenant isolation remains database-enforced.
-- ============================================================================


-- ============================================================================
-- 1. MINIMUM TABLE PRIVILEGES
-- ============================================================================

REVOKE ALL
ON TABLE public.signal_feed_sources
FROM anon, authenticated;

REVOKE ALL
ON TABLE public.websites
FROM anon, authenticated;

REVOKE ALL
ON TABLE public.website_scans
FROM anon, authenticated;


GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.signal_feed_sources
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.websites
TO authenticated;

GRANT SELECT, INSERT
ON TABLE public.website_scans
TO authenticated;


-- ============================================================================
-- 2. SIGNAL FEED SOURCES
-- ============================================================================

CREATE POLICY signal_feed_sources_select_policy
ON public.signal_feed_sources
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
    public.is_active_workspace_member(workspace_id)
);


CREATE POLICY signal_feed_sources_insert_policy
ON public.signal_feed_sources
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_active_workspace_member(workspace_id)
    AND
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner'::text, 'admin'::text]
    )
);


CREATE POLICY signal_feed_sources_update_policy
ON public.signal_feed_sources
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner'::text, 'admin'::text]
    )
)
WITH CHECK (
    public.is_active_workspace_member(workspace_id)
    AND
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner'::text, 'admin'::text]
    )
);


CREATE POLICY signal_feed_sources_delete_policy
ON public.signal_feed_sources
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner'::text, 'admin'::text]
    )
);


-- ============================================================================
-- 3. WEBSITES
-- ============================================================================

CREATE POLICY websites_select_policy
ON public.websites
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
    public.is_active_workspace_member(workspace_id)
);


CREATE POLICY websites_insert_policy
ON public.websites
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_active_workspace_member(workspace_id)
    AND
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner'::text, 'admin'::text]
    )
);


CREATE POLICY websites_update_policy
ON public.websites
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner'::text, 'admin'::text]
    )
)
WITH CHECK (
    public.is_active_workspace_member(workspace_id)
    AND
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner'::text, 'admin'::text]
    )
);


CREATE POLICY websites_delete_policy
ON public.websites
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner'::text, 'admin'::text]
    )
);


-- ============================================================================
-- 4. WEBSITE SCANS
-- ============================================================================

CREATE POLICY website_scans_select_policy
ON public.website_scans
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.websites w
        WHERE w.id = website_scans.website_id
          AND public.is_active_workspace_member(w.workspace_id)
    )
);


CREATE POLICY website_scans_insert_policy
ON public.website_scans
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.websites w
        WHERE w.id = website_scans.website_id
          AND public.is_active_workspace_member(w.workspace_id)
    )
);


-- ============================================================================
-- 5. EXPLICITLY REMOVE CLIENT-SIDE SCAN UPDATE/DELETE
-- ============================================================================
-- No UPDATE or DELETE policy is created for authenticated users.
--
-- This means:
--   - authenticated clients can read scans
--   - authenticated clients can queue scans
--   - authenticated clients cannot rewrite scan status/results
--
-- A future ingestion worker can use service_role for operational scan updates.
-- ============================================================================


-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON POLICY signal_feed_sources_select_policy
ON public.signal_feed_sources
IS 'Active members can read Signal feed sources belonging to their workspace.';

COMMENT ON POLICY signal_feed_sources_insert_policy
ON public.signal_feed_sources
IS 'Owners and admins can create Signal feed sources for their workspace.';

COMMENT ON POLICY websites_select_policy
ON public.websites
IS 'Active members can read website records belonging to their workspace.';

COMMENT ON POLICY websites_insert_policy
ON public.websites
IS 'Owners and admins can create website records for their workspace.';

COMMENT ON POLICY website_scans_select_policy
ON public.website_scans
IS 'Active members can read scans whose website belongs to their workspace.';

COMMENT ON POLICY website_scans_insert_policy
ON public.website_scans
IS 'Active members can queue scans for websites in their workspace.';