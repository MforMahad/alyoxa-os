-- ============================================================================
-- MIGRATION 014 — SIGNAL PATTERN INSIGHTS JOIN TABLE
-- ============================================================================

CREATE TABLE public.signal_pattern_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES public.signal_patterns(id) ON DELETE CASCADE,
    insight_id UUID NOT NULL REFERENCES public.signal_insights(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unq_signal_pattern_insight UNIQUE (pattern_id, insight_id)
);

-- Index for efficient reverse traversal from insight to patterns
CREATE INDEX idx_signal_pattern_insights_insight_id ON public.signal_pattern_insights(insight_id);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.signal_pattern_insights ENABLE ROW LEVEL SECURITY;