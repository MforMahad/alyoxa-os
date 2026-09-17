-- ============================================================================
-- MIGRATION 007 — WEBSITE SCANS TABLE
-- ============================================================================

CREATE TABLE public.website_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    scan_type VARCHAR(50) NOT NULL DEFAULT 'standard',
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Index for retrieving website scan history ordered chronologically
CREATE INDEX idx_website_scans_website_id_created ON public.website_scans(website_id, created_at DESC);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.website_scans ENABLE ROW LEVEL SECURITY;