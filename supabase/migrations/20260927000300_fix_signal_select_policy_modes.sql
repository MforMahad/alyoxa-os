DROP POLICY IF EXISTS signal_feed_sources_select_policy
ON public.signal_feed_sources;

CREATE POLICY signal_feed_sources_select_policy
ON public.signal_feed_sources
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
    is_active_workspace_member(workspace_id)
);


DROP POLICY IF EXISTS websites_select_policy
ON public.websites;

CREATE POLICY websites_select_policy
ON public.websites
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
    is_active_workspace_member(workspace_id)
);


DROP POLICY IF EXISTS website_scans_select_policy
ON public.website_scans;

CREATE POLICY website_scans_select_policy
ON public.website_scans
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.websites w
        WHERE w.id = website_scans.website_id
          AND is_active_workspace_member(w.workspace_id)
    )
);