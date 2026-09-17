-- ============================================================================
-- MIGRATION 020 — FORGE EXECUTION RECORDS TABLE
-- ============================================================================

CREATE TABLE public.forge_execution_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.forge_execution_tasks(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    executor_actor_id UUID REFERENCES public.actors(id) ON DELETE RESTRICT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ,
    result JSONB,
    error_code VARCHAR(100),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_forge_record_attempt_number CHECK (attempt_number >= 1),
    CONSTRAINT chk_forge_record_status CHECK (
        status IN ('running', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT chk_forge_record_result_is_object CHECK (result IS NULL OR jsonb_typeof(result) = 'object'),
    CONSTRAINT unq_forge_execution_task_attempt UNIQUE (task_id, attempt_number)
);

-- Indexes for efficient execution history and status queries
-- (task_id and task_id + attempt_number are covered by the unique constraint)
CREATE INDEX idx_forge_execution_records_workspace_id ON public.forge_execution_records(workspace_id);
CREATE INDEX idx_forge_execution_records_status ON public.forge_execution_records(status);
CREATE INDEX idx_forge_execution_records_executor ON public.forge_execution_records(executor_actor_id) WHERE executor_actor_id IS NOT NULL;
CREATE INDEX idx_forge_execution_records_started_at ON public.forge_execution_records(started_at DESC);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.forge_execution_records ENABLE ROW LEVEL SECURITY;