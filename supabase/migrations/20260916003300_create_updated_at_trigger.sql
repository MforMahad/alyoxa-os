-- ============================================================================
-- MIGRATION 033 — REUSABLE UPDATED_AT TRIGGER FUNCTION AND ATTACHMENTS
-- ============================================================================

-- 1. Create the shared reusable BEFORE UPDATE trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 2. Attach the trigger to the 26 mutable operational tables using `trg_<table_name>_updated_at`

-- users
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- organizations
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- organization_memberships
CREATE TRIGGER trg_organization_memberships_updated_at
    BEFORE UPDATE ON public.organization_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- workspaces
CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- workspace_memberships
CREATE TRIGGER trg_workspace_memberships_updated_at
    BEFORE UPDATE ON public.workspace_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- websites
CREATE TRIGGER trg_websites_updated_at
    BEFORE UPDATE ON public.websites
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- website_scans
CREATE TRIGGER trg_website_scans_updated_at
    BEFORE UPDATE ON public.website_scans
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- actors
CREATE TRIGGER trg_actors_updated_at
    BEFORE UPDATE ON public.actors
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- signal_feed_sources
CREATE TRIGGER trg_signal_feed_sources_updated_at
    BEFORE UPDATE ON public.signal_feed_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- signal_patterns
CREATE TRIGGER trg_signal_patterns_updated_at
    BEFORE UPDATE ON public.signal_patterns
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- signal_insights
CREATE TRIGGER trg_signal_insights_updated_at
    BEFORE UPDATE ON public.signal_insights
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ai_decisions
CREATE TRIGGER trg_ai_decisions_updated_at
    BEFORE UPDATE ON public.ai_decisions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- cross_module_references
CREATE TRIGGER trg_cross_module_references_updated_at
    BEFORE UPDATE ON public.cross_module_references
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- integration_contracts
CREATE TRIGGER trg_integration_contracts_updated_at
    BEFORE UPDATE ON public.integration_contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- forge_execution_nodes
CREATE TRIGGER trg_forge_execution_nodes_updated_at
    BEFORE UPDATE ON public.forge_execution_nodes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- forge_execution_tasks
CREATE TRIGGER trg_forge_execution_tasks_updated_at
    BEFORE UPDATE ON public.forge_execution_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- forge_execution_records
CREATE TRIGGER trg_forge_execution_records_updated_at
    BEFORE UPDATE ON public.forge_execution_records
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- pulse_requests
CREATE TRIGGER trg_pulse_requests_updated_at
    BEFORE UPDATE ON public.pulse_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- pulse_threads
CREATE TRIGGER trg_pulse_threads_updated_at
    BEFORE UPDATE ON public.pulse_threads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- pulse_approvals
CREATE TRIGGER trg_pulse_approvals_updated_at
    BEFORE UPDATE ON public.pulse_approvals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- pulse_activities
CREATE TRIGGER trg_pulse_activities_updated_at
    BEFORE UPDATE ON public.pulse_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- vault_folders
CREATE TRIGGER trg_vault_folders_updated_at
    BEFORE UPDATE ON public.vault_folders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- vault_items
CREATE TRIGGER trg_vault_items_updated_at
    BEFORE UPDATE ON public.vault_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- vault_knowledge_entries
CREATE TRIGGER trg_vault_knowledge_entries_updated_at
    BEFORE UPDATE ON public.vault_knowledge_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- vault_references
CREATE TRIGGER trg_vault_references_updated_at
    BEFORE UPDATE ON public.vault_references
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- outbox_events
CREATE TRIGGER trg_outbox_events_updated_at
    BEFORE UPDATE ON public.outbox_events
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();