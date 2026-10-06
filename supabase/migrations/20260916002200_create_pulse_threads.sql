-- ============================================================================
-- MIGRATION 022 — PULSE THREADS TABLE
-- ============================================================================

CREATE TABLE public.pulse_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.pulse_requests(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    title VARCHAR(250) NOT NULL,
    subject TEXT,
    last_activity_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_pulse_thread_status CHECK (
        status IN ('open', 'closed', 'archived')
    )
);

-- Indexes for efficient lookups, request relationship traversal, and activity sorting
CREATE INDEX idx_pulse_threads_workspace_id ON public.pulse_threads(workspace_id);
CREATE INDEX idx_pulse_threads_request_id ON public.pulse_threads(request_id);
CREATE INDEX idx_pulse_threads_status ON public.pulse_threads(status);
CREATE INDEX idx_pulse_threads_last_activity ON public.pulse_threads(last_activity_at DESC) WHERE last_activity_at IS NOT NULL;

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.pulse_threads ENABLE ROW LEVEL SECURITY;