-- ============================================================================
-- MIGRATION 013 — SIGNAL INSIGHTS TABLE
-- ============================================================================

CREATE TABLE public.signal_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    confidence NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    recommended_action TEXT,
    metadata JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_signal_insights_confidence CHECK (confidence >= 0.00 AND confidence <= 1.00)
);

-- Indexes for efficient insight querying and filtering
CREATE INDEX idx_signal_insights_workspace_id ON public.signal_insights(workspace_id);
CREATE INDEX idx_signal_insights_status ON public.signal_insights(status);
CREATE INDEX idx_signal_insights_severity ON public.signal_insights(severity);
CREATE INDEX idx_signal_insights_detected_at ON public.signal_insights(detected_at DESC);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.signal_insights ENABLE ROW LEVEL SECURITY;