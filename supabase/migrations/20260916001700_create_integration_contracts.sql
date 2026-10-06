-- ============================================================================
-- MIGRATION 017 — INTEGRATION CONTRACTS TABLE
-- ============================================================================

CREATE TABLE public.integration_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(64) NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_module VARCHAR(50) NOT NULL,
    target_module VARCHAR(50) NOT NULL,
    source_record_type VARCHAR(100) NOT NULL,
    target_record_type VARCHAR(100) NOT NULL,
    purpose TEXT NOT NULL,
    required_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_contract_modules CHECK (
        source_module IN ('SIGNAL', 'AI', 'FORGE', 'PULSE', 'VAULT', 'SYSTEM') AND
        target_module IN ('SIGNAL', 'AI', 'FORGE', 'PULSE', 'VAULT', 'SYSTEM')
    ),
    CONSTRAINT chk_contract_different_modules CHECK (source_module <> target_module),
    CONSTRAINT chk_contract_status CHECK (
        status IN ('active', 'disabled', 'deprecated')
    ),
    CONSTRAINT chk_contract_version CHECK (version >= 1),
    CONSTRAINT chk_contract_required_refs_is_array CHECK (jsonb_typeof(required_references) = 'array'),
    CONSTRAINT unq_integration_contract_version UNIQUE (workspace_id, source_module, target_module, source_record_type, target_record_type, version)
);

-- Indexes for efficient lookups and status filtering
-- (workspace_id index is covered by the leading column of the unique constraint)
CREATE INDEX idx_integration_contracts_source ON public.integration_contracts(source_module, source_record_type);
CREATE INDEX idx_integration_contracts_target ON public.integration_contracts(target_module, target_record_type);
CREATE INDEX idx_integration_contracts_status ON public.integration_contracts(status);

-- Row Level Security (Policies deferred until full authorization/RLS strategy is implemented)
ALTER TABLE public.integration_contracts ENABLE ROW LEVEL SECURITY;