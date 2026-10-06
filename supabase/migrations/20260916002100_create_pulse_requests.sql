-- ============================================================================
-- MIGRATION 021 — PULSE REQUESTS TABLE
-- ============================================================================

CREATE TABLE public.pulse_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    requested_by_actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE RESTRICT,
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'received',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    decision_id UUID REFERENCES public.ai_decisions(id) ON DELETE RESTRICT,
    task_id UUID REFERENCES public.forge_execution_tasks(id) ON DELETE RESTRICT,
    title VARCHAR(250) NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_pulse_request_type CHECK (
        request_type IN ('human_review', 'system_review', 'approval')
    ),
    CONSTRAINT chk_pulse_request_status CHECK (
        status IN ('received', 'under_review', 'approved', 'rejected', 'completed', 'cancelled')
    ),
    CONSTRAINT chk_pulse_request_priority CHECK (
        priority IN ('low', 'medium', 'high', 'urgent')
    )
);

-- Indexes for efficient lookups, filtering, and workflow querying
CREATE INDEX idx_pulse_requests_workspace_id ON public.pulse_requests(workspace_id);
CREATE INDEX idx_pulse_requests_status ON public.pulse_requests(status);
CREATE INDEX idx_pulse_requests_priority ON public.pulse_requests(priority);
CREATE INDEX idx_pulse_requests_decision_id ON public.pulse_requests(decision_id) WHERE decision_id IS NOT NULL;
CREATE INDEX idx_pulse_requests_task_id ON public.pulse_requests(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_pulse_requests_actor_id ON public.pulse_requests(requested_by_actor_id);
CREATE INDEX idx_pulse_requests_due_at ON public.pulse_requests(due_at) WHERE due_at IS NOT NULL;

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.pulse_requests ENABLE ROW LEVEL SECURITY;