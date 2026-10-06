-- ============================================================================
-- MIGRATION 023 — PULSE APPROVALS TABLE
-- ============================================================================

CREATE TABLE public.pulse_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.pulse_requests(id) ON DELETE CASCADE,
    decision_id UUID REFERENCES public.ai_decisions(id) ON DELETE RESTRICT,
    task_id UUID REFERENCES public.forge_execution_tasks(id) ON DELETE RESTRICT,
    requested_from_actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE RESTRICT,
    decision VARCHAR(50) NOT NULL DEFAULT 'pending',
    approval_scope VARCHAR(100) NOT NULL,
    decision_note TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    decided_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_pulse_approval_decision CHECK (
        decision IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')
    ),
    CONSTRAINT chk_pulse_approval_metadata_is_object CHECK (metadata IS NULL OR jsonb_typeof(metadata) = 'object')
);

-- Indexes for efficient lookups, pending approval filters, and relationship traversal
CREATE INDEX idx_pulse_approvals_workspace_id ON public.pulse_approvals(workspace_id);
CREATE INDEX idx_pulse_approvals_request_id ON public.pulse_approvals(request_id);
CREATE INDEX idx_pulse_approvals_decision ON public.pulse_approvals(decision);
CREATE INDEX idx_pulse_approvals_requested_from ON public.pulse_approvals(requested_from_actor_id);
CREATE INDEX idx_pulse_approvals_decision_id ON public.pulse_approvals(decision_id) WHERE decision_id IS NOT NULL;
CREATE INDEX idx_pulse_approvals_task_id ON public.pulse_approvals(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_pulse_approvals_pending ON public.pulse_approvals(workspace_id, decision) WHERE decision = 'pending';
CREATE INDEX idx_pulse_approvals_expires_at ON public.pulse_approvals(expires_at) WHERE expires_at IS NOT NULL;

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.pulse_approvals ENABLE ROW LEVEL SECURITY;