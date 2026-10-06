-- ============================================================================
-- MIGRATION 009 — SIGNAL FEED SOURCES TABLE
-- ============================================================================

CREATE TABLE public.signal_feed_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    source_key VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Indexes for efficient feed source querying
CREATE INDEX idx_signal_feed_sources_workspace_id ON public.signal_feed_sources(workspace_id);
CREATE INDEX idx_signal_feed_sources_source_type ON public.signal_feed_sources(source_type);
CREATE INDEX idx_signal_feed_sources_status ON public.signal_feed_sources(status);

-- Partial unique index ensuring workspace-scoped uniqueness for optional source keys
CREATE UNIQUE INDEX idx_signal_feed_sources_workspace_key_unq 
ON public.signal_feed_sources(workspace_id, source_key) 
WHERE source_key IS NOT NULL;

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.signal_feed_sources ENABLE ROW LEVEL SECURITY;