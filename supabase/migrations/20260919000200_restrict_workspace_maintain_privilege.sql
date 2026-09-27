-- ============================================================================
-- MIGRATION 039 — RESTRICT WORKSPACE RUNTIME PRIVILEGES
-- ============================================================================
-- Removes unnecessary table privileges from runtime application roles.
--
-- Runtime access remains:
--   authenticated → SELECT, INSERT, UPDATE, DELETE
--   anon          → no table DML privileges
--
-- RLS remains the tenant authorization boundary.
-- ============================================================================

REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN
    ON TABLE public.workspaces
    FROM anon, authenticated;

REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN
    ON TABLE public.workspace_memberships
    FROM anon, authenticated;