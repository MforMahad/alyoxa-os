-- ============================================================================
-- MIGRATION 010 — SIGNAL OBSERVATIONS TABLE
-- ============================================================================

CREATE TABLE public.signal_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    source_id UUID NOT NULL REFERENCES public.signal_feed_sources(id) ON DELETE RESTRICT,
    website_scan_id UUID REFERENCES public.website_scans(id) ON DELETE SET NULL,
    source_event_id VARCHAR(255),
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    category VARCHAR(100) NOT NULL,
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Indexes for efficient observation querying and timeline ordering
CREATE INDEX idx_signal_observations_source_id ON public.signal_observations(source_id);
CREATE INDEX idx_signal_observations_observed_at ON public.signal_observations(observed_at DESC);
CREATE INDEX idx_signal_observations_severity ON public.signal_observations(severity);

-- Partial unique index ensuring deduplication for sources providing stable event IDs
CREATE UNIQUE INDEX idx_signal_observations_source_event_unq 
ON public.signal_observations(source_id, source_event_id) 
WHERE source_event_id IS NOT NULL;

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.signal_observations ENABLE ROW LEVEL SECURITY;