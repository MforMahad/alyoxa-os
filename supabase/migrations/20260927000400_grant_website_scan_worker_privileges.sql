-- ============================================================================
-- MIGRATION 045 — WEBSITE SCAN WORKER TABLE PRIVILEGES
-- ============================================================================
-- Grants the service_role worker only the table privileges required to
-- process queued website scans and persist Signal observations.
-- RLS policies remain unchanged.
-- ============================================================================

GRANT SELECT
ON TABLE public.websites
TO service_role;

GRANT SELECT
ON TABLE public.signal_feed_sources
TO service_role;

GRANT SELECT, UPDATE
ON TABLE public.website_scans
TO service_role;

GRANT INSERT
ON TABLE public.signal_observations
TO service_role;
