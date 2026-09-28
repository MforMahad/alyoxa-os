-- ============================================================================
-- MIGRATION 046 — AUTHENTICATED WORKSPACE SIGNAL OBSERVATION READS
-- ============================================================================

GRANT SELECT
ON TABLE public.signal_observations
TO authenticated;

CREATE POLICY signal_observations_select_workspace_policy
ON public.signal_observations
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.signal_feed_sources AS source
        WHERE source.id = signal_observations.source_id
          AND public.is_active_workspace_member(source.workspace_id)
    )
);