-- ============================================================================
-- MIGRATION 024 — PULSE ACTIVITIES TABLE
-- ============================================================================

CREATE TABLE public.pulse_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.pulse_requests(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES public.pulse_threads(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.actors(id) ON DELETE RESTRICT,
    activity_type VARCHAR(100) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_pulse_activity_type CHECK (
        activity_type IN (
            'request_created',
            'request_review_started',
            'request_approved',
            'request_rejected',
            'request_completed',
            'request_cancelled',
            'thread_created',
            'thread_closed',
            'approval_requested',
            'approval_approved',
            'approval_rejected',
            'approval_expired',
            'approval_cancelled'
        )
    ),
    CONSTRAINT chk_pulse_activity_metadata_is_object CHECK (metadata IS NULL OR jsonb_typeof(metadata) = 'object')
);

-- Indexes for efficient timeline queries, request/thread history, and filtering
CREATE INDEX idx_pulse_activities_workspace_id ON public.pulse_activities(workspace_id);
CREATE INDEX idx_pulse_activities_request_id ON public.pulse_activities(request_id);
CREATE INDEX idx_pulse_activities_thread_id ON public.pulse_activities(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_pulse_activities_actor_id ON public.pulse_activities(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_pulse_activities_type ON public.pulse_activities(activity_type);
CREATE INDEX idx_pulse_activities_occurred_at ON public.pulse_activities(request_id, occurred_at DESC);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.pulse_activities ENABLE ROW LEVEL SECURITY;