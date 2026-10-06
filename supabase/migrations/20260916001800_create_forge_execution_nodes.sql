-- ============================================================================
-- MIGRATION 018 — FORGE EXECUTION NODES TABLE
-- ============================================================================

CREATE TABLE public.forge_execution_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    node_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'online',
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    configuration JSONB,
    last_heartbeat_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_forge_node_status CHECK (
        status IN ('online', 'degraded', 'offline')
    ),
    CONSTRAINT chk_forge_node_capabilities_array CHECK (jsonb_typeof(capabilities) = 'array'),
    CONSTRAINT unq_forge_execution_node_workspace_name UNIQUE (workspace_id, name)
);

-- Indexes for efficient status and node type filtering
-- (workspace_id lookup is covered by the leading column of the unique constraint)
CREATE INDEX idx_forge_execution_nodes_status ON public.forge_execution_nodes(status);
CREATE INDEX idx_forge_execution_nodes_node_type ON public.forge_execution_nodes(node_type);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.forge_execution_nodes ENABLE ROW LEVEL SECURITY;