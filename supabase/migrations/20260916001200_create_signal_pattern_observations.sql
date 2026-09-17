-- ============================================================================
-- MIGRATION 012 — SIGNAL PATTERN OBSERVATIONS JOIN TABLE
-- ============================================================================

CREATE TABLE public.signal_pattern_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES public.signal_patterns(id) ON DELETE CASCADE,
    observation_id UUID NOT NULL REFERENCES public.signal_observations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unq_signal_pattern_observation UNIQUE (pattern_id, observation_id)
);

-- Index for efficient reverse traversal from observation to patterns
CREATE INDEX idx_signal_pattern_observations_observation_id ON public.signal_pattern_observations(observation_id);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.signal_pattern_observations ENABLE ROW LEVEL SECURITY;