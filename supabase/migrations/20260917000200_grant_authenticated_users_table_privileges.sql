-- ============================================================================
-- MIGRATION 036 — MINIMUM TABLE PRIVILEGES FOR public.users
-- ============================================================================
-- RLS policies on public.users remain unchanged.
-- Table privileges allow authenticated users to use these commands;
-- RLS continues to restrict access to their own row.

GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;