-- ============================================================================
-- MIGRATION 042 — PRIMARY WORKSPACE WEBSITE URL
-- ============================================================================
-- Stores the primary website associated with a workspace.
-- Nullable because existing workspaces were created before onboarding exists.
-- ============================================================================

ALTER TABLE public.workspaces
ADD COLUMN website_url TEXT NULL;

ALTER TABLE public.workspaces
ADD CONSTRAINT chk_workspaces_website_url_length
CHECK (
    website_url IS NULL
    OR char_length(website_url) <= 2048
);