-- ============================================================================
-- MIGRATION 019 — FORGE EXECUTION TASKS TABLE
-- ============================================================================

CREATE TABLE public.forge_execution_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES public.forge_execution_nodes(id) ON DELETE RESTRICT,
    decision_id UUID REFERENCES public.ai_decisions(id) ON DELETE RESTRICT,
    requested_by_actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'received',
    action_name VARCHAR(150) NOT NULL,
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(255) NOT NULL,
    max_attempts INTEGER NOT NULL DEFAULT 1,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_error TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_forge_task_status CHECK (
        status IN ('received', 'queued', 'ready', 'running', 'completed', 'failed')
    ),
    CONSTRAINT chk_forge_task_max_attempts CHECK (max_attempts >= 1),
    CONSTRAINT chk_forge_task_payload_is_object CHECK (jsonb_typeof(action_payload) = 'object'),
    CONSTRAINT unq_forge_task_workspace_idempotency UNIQUE (workspace_id, idempotency_key)
);

-- Indexes for efficient task lookup, queue filtering, and relationship traversal
-- (workspace_id lookup and workspace_id + idempotency_key are covered by the unique constraint)
CREATE INDEX idx_forge_execution_tasks_node_id ON public.forge_execution_tasks(node_id);
CREATE INDEX idx_forge_execution_tasks_decision_id ON public.forge_execution_tasks(decision_id);
CREATE INDEX idx_forge_execution_tasks_status ON public.forge_execution_tasks(status);
CREATE INDEX idx_forge_execution_tasks_scheduled_at ON public.forge_execution_tasks(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.forge_execution_tasks ENABLE ROW LEVEL SECURITY;