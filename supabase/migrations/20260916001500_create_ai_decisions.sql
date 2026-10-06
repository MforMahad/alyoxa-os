-- ============================================================================
-- MIGRATION 015 — AI DECISIONS TABLE
-- ============================================================================

CREATE TABLE public.ai_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE RESTRICT,
    supersedes_decision_id UUID REFERENCES public.ai_decisions(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    attention_state VARCHAR(50) NOT NULL DEFAULT 'human_review_required',
    confidence NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    summary VARCHAR(500) NOT NULL,
    recommended_action TEXT NOT NULL,
    action_name VARCHAR(150) NOT NULL,
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_provider VARCHAR(100),
    model_name VARCHAR(150),
    model_version VARCHAR(150),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_ai_decisions_confidence CHECK (confidence >= 0.00 AND confidence <= 1.00)
);

-- Indexes for efficient decision filtering, queuing, and lineage traversal
CREATE INDEX idx_ai_decisions_workspace_id ON public.ai_decisions(workspace_id);
CREATE INDEX idx_ai_decisions_actor_id ON public.ai_decisions(actor_id);
CREATE INDEX idx_ai_decisions_status ON public.ai_decisions(status);
CREATE INDEX idx_ai_decisions_attention_state ON public.ai_decisions(attention_state);
CREATE INDEX idx_ai_decisions_created_at ON public.ai_decisions(created_at DESC);
CREATE INDEX idx_ai_decisions_supersedes ON public.ai_decisions(supersedes_decision_id);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;