    -- ============================================================================
-- MIGRATION 032 — OUTBOX EVENTS TABLE
-- ============================================================================

CREATE TABLE public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_type VARCHAR(150) NOT NULL,
    aggregate_module VARCHAR(50),
    aggregate_type VARCHAR(100),
    aggregate_id UUID,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    processed_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_outbox_aggregate_module CHECK (
        aggregate_module IS NULL OR aggregate_module IN ('SIGNAL', 'AI', 'FORGE', 'PULSE', 'VAULT', 'SYSTEM')
    ),
    CONSTRAINT chk_outbox_status CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    CONSTRAINT chk_outbox_attempts CHECK (
        attempts >= 0
    ),
    CONSTRAINT chk_outbox_payload_is_object CHECK (
        jsonb_typeof(payload) = 'object'
    ),
    CONSTRAINT chk_outbox_processed_at_consistency CHECK (
        processed_at IS NULL OR status = 'completed'
    )
);

-- Indexes for dispatcher polling, tenant workspace isolation, aggregate tracking, and event type filtering
CREATE INDEX idx_outbox_events_workspace_id ON public.outbox_events(workspace_id);
CREATE INDEX idx_outbox_events_dispatcher_poll 
    ON public.outbox_events(status, available_at ASC) 
    WHERE status = 'pending';
CREATE INDEX idx_outbox_events_aggregate ON public.outbox_events(workspace_id, aggregate_module, aggregate_type, aggregate_id) WHERE aggregate_id IS NOT NULL;
CREATE INDEX idx_outbox_events_type ON public.outbox_events(event_type);
CREATE INDEX idx_outbox_events_created_at ON public.outbox_events(workspace_id, created_at DESC);

-- Row Level Security (Policies deferred)
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;