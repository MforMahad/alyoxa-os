-- ============================================================================
-- MIGRATION 038 — RESTRICT WORKSPACE RUNTIME PRIVILEGES
-- ============================================================================
-- Removes unnecessary table privileges from runtime roles.
-- RLS remains the tenant authorization boundary.
-- ============================================================================

REVOKE REFERENCES, TRIGGER, TRUNCATE
    ON TABLE public.workspaces
    FROM anon, authenticated;

REVOKE REFERENCES, TRIGGER, TRUNCATE
    ON TABLE public.workspace_memberships
    FROM anon, authenticated;