-- ============================================================================
-- MIGRATION 011 — SIGNAL PATTERNS TABLE
-- ============================================================================

CREATE TABLE public.signal_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    confidence NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    metadata JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_signal_patterns_confidence
        CHECK (confidence >= 0.00 AND confidence <= 1.00)
);

CREATE INDEX idx_signal_patterns_workspace_id
    ON public.signal_patterns(workspace_id);

CREATE INDEX idx_signal_patterns_status
    ON public.signal_patterns(status);

CREATE INDEX idx_signal_patterns_detected_at
    ON public.signal_patterns(detected_at DESC);

ALTER TABLE public.signal_patterns ENABLE ROW LEVEL SECURITY;