-- ============================================================================
-- MIGRATION 034 — ENFORCE OPERATIONAL WORKSPACE INTEGRITY (COMPOSITE FOREIGN KEYS)
-- ============================================================================

-- 1. Create supporting composite unique indexes on parent tables required for composite foreign keys
CREATE UNIQUE INDEX idx_actors_id_workspace_id ON public.actors (id, workspace_id);
CREATE UNIQUE INDEX idx_ai_decisions_id_workspace_id ON public.ai_decisions (id, workspace_id);
CREATE UNIQUE INDEX idx_forge_execution_nodes_id_workspace_id ON public.forge_execution_nodes (id, workspace_id);
CREATE UNIQUE INDEX idx_forge_execution_tasks_id_workspace_id ON public.forge_execution_tasks (id, workspace_id);
CREATE UNIQUE INDEX idx_pulse_requests_id_workspace_id ON public.pulse_requests (id, workspace_id);
CREATE UNIQUE INDEX idx_pulse_threads_id_workspace_id ON public.pulse_threads (id, workspace_id);


-- ============================================================================
-- 2. AI MODULE RELATIONSHIPS
-- ============================================================================

-- ai_decisions.actor_id → actors
ALTER TABLE public.ai_decisions
    DROP CONSTRAINT IF EXISTS ai_decisions_actor_id_fkey,
    ADD CONSTRAINT ai_decisions_actor_id_fkey
        FOREIGN KEY (actor_id, workspace_id)
        REFERENCES public.actors (id, workspace_id)
        ON DELETE RESTRICT;

-- ai_decisions.supersedes_decision_id → ai_decisions
ALTER TABLE public.ai_decisions
    DROP CONSTRAINT IF EXISTS ai_decisions_supersedes_decision_id_fkey,
    ADD CONSTRAINT ai_decisions_supersedes_decision_id_fkey
        FOREIGN KEY (supersedes_decision_id, workspace_id)
        REFERENCES public.ai_decisions (id, workspace_id)
        ON DELETE SET NULL (supersedes_decision_id);


-- ============================================================================
-- 3. FORGE MODULE RELATIONSHIPS
-- ============================================================================

-- forge_execution_tasks.node_id → forge_execution_nodes
ALTER TABLE public.forge_execution_tasks
    DROP CONSTRAINT IF EXISTS forge_execution_tasks_node_id_fkey,
    ADD CONSTRAINT forge_execution_tasks_node_id_fkey
        FOREIGN KEY (node_id, workspace_id)
        REFERENCES public.forge_execution_nodes (id, workspace_id)
        ON DELETE RESTRICT;

-- forge_execution_tasks.decision_id → ai_decisions
ALTER TABLE public.forge_execution_tasks
    DROP CONSTRAINT IF EXISTS forge_execution_tasks_decision_id_fkey,
    ADD CONSTRAINT forge_execution_tasks_decision_id_fkey
        FOREIGN KEY (decision_id, workspace_id)
        REFERENCES public.ai_decisions (id, workspace_id)
        ON DELETE RESTRICT;

-- forge_execution_tasks.requested_by_actor_id → actors
ALTER TABLE public.forge_execution_tasks
    DROP CONSTRAINT IF EXISTS forge_execution_tasks_requested_by_actor_id_fkey,
    ADD CONSTRAINT forge_execution_tasks_requested_by_actor_id_fkey
        FOREIGN KEY (requested_by_actor_id, workspace_id)
        REFERENCES public.actors (id, workspace_id)
        ON DELETE RESTRICT;

-- forge_execution_records.task_id → forge_execution_tasks
ALTER TABLE public.forge_execution_records
    DROP CONSTRAINT IF EXISTS forge_execution_records_task_id_fkey,
    ADD CONSTRAINT forge_execution_records_task_id_fkey
        FOREIGN KEY (task_id, workspace_id)
        REFERENCES public.forge_execution_tasks (id, workspace_id)
        ON DELETE CASCADE;

-- forge_execution_records.executor_actor_id → actors
ALTER TABLE public.forge_execution_records
    DROP CONSTRAINT IF EXISTS forge_execution_records_executor_actor_id_fkey,
    ADD CONSTRAINT forge_execution_records_executor_actor_id_fkey
        FOREIGN KEY (executor_actor_id, workspace_id)
        REFERENCES public.actors (id, workspace_id)
        ON DELETE RESTRICT;


-- ============================================================================
-- 4. PULSE MODULE RELATIONSHIPS
-- ============================================================================

-- pulse_requests.requested_by_actor_id → actors
ALTER TABLE public.pulse_requests
    DROP CONSTRAINT IF EXISTS pulse_requests_requested_by_actor_id_fkey,
    ADD CONSTRAINT pulse_requests_requested_by_actor_id_fkey
        FOREIGN KEY (requested_by_actor_id, workspace_id)
        REFERENCES public.actors (id, workspace_id)
        ON DELETE RESTRICT;

-- pulse_requests.decision_id → ai_decisions
ALTER TABLE public.pulse_requests
    DROP CONSTRAINT IF EXISTS pulse_requests_decision_id_fkey,
    ADD CONSTRAINT pulse_requests_decision_id_fkey
        FOREIGN KEY (decision_id, workspace_id)
        REFERENCES public.ai_decisions (id, workspace_id)
        ON DELETE RESTRICT;

-- pulse_requests.task_id → forge_execution_tasks
ALTER TABLE public.pulse_requests
    DROP CONSTRAINT IF EXISTS pulse_requests_task_id_fkey,
    ADD CONSTRAINT pulse_requests_task_id_fkey
        FOREIGN KEY (task_id, workspace_id)
        REFERENCES public.forge_execution_tasks (id, workspace_id)
        ON DELETE RESTRICT;

-- pulse_threads.request_id → pulse_requests
ALTER TABLE public.pulse_threads
    DROP CONSTRAINT IF EXISTS pulse_threads_request_id_fkey,
    ADD CONSTRAINT pulse_threads_request_id_fkey
        FOREIGN KEY (request_id, workspace_id)
        REFERENCES public.pulse_requests (id, workspace_id)
        ON DELETE CASCADE;

-- pulse_approvals.request_id → pulse_requests
ALTER TABLE public.pulse_approvals
    DROP CONSTRAINT IF EXISTS pulse_approvals_request_id_fkey,
    ADD CONSTRAINT pulse_approvals_request_id_fkey
        FOREIGN KEY (request_id, workspace_id)
        REFERENCES public.pulse_requests (id, workspace_id)
        ON DELETE CASCADE;

-- pulse_approvals.decision_id → ai_decisions
ALTER TABLE public.pulse_approvals
    DROP CONSTRAINT IF EXISTS pulse_approvals_decision_id_fkey,
    ADD CONSTRAINT pulse_approvals_decision_id_fkey
        FOREIGN KEY (decision_id, workspace_id)
        REFERENCES public.ai_decisions (id, workspace_id)
        ON DELETE RESTRICT;

-- pulse_approvals.task_id → forge_execution_tasks
ALTER TABLE public.pulse_approvals
    DROP CONSTRAINT IF EXISTS pulse_approvals_task_id_fkey,
    ADD CONSTRAINT pulse_approvals_task_id_fkey
        FOREIGN KEY (task_id, workspace_id)
        REFERENCES public.forge_execution_tasks (id, workspace_id)
        ON DELETE RESTRICT;

-- pulse_approvals.requested_from_actor_id → actors
ALTER TABLE public.pulse_approvals
    DROP CONSTRAINT IF EXISTS pulse_approvals_requested_from_actor_id_fkey,
    ADD CONSTRAINT pulse_approvals_requested_from_actor_id_fkey
        FOREIGN KEY (requested_from_actor_id, workspace_id)
        REFERENCES public.actors (id, workspace_id)
        ON DELETE RESTRICT;

-- pulse_activities.request_id → pulse_requests
ALTER TABLE public.pulse_activities
    DROP CONSTRAINT IF EXISTS pulse_activities_request_id_fkey,
    ADD CONSTRAINT pulse_activities_request_id_fkey
        FOREIGN KEY (request_id, workspace_id)
        REFERENCES public.pulse_requests (id, workspace_id)
        ON DELETE CASCADE;

-- pulse_activities.thread_id → pulse_threads
ALTER TABLE public.pulse_activities
    DROP CONSTRAINT IF EXISTS pulse_activities_thread_id_fkey,
    ADD CONSTRAINT pulse_activities_thread_id_fkey
        FOREIGN KEY (thread_id, workspace_id)
        REFERENCES public.pulse_threads (id, workspace_id)
        ON DELETE SET NULL (thread_id);

-- pulse_activities.actor_id → actors
ALTER TABLE public.pulse_activities
    DROP CONSTRAINT IF EXISTS pulse_activities_actor_id_fkey,
    ADD CONSTRAINT pulse_activities_actor_id_fkey
        FOREIGN KEY (actor_id, workspace_id)
        REFERENCES public.actors (id, workspace_id)
        ON DELETE RESTRICT;


-- ============================================================================
-- 5. AUDIT MODULE RELATIONSHIPS
-- ============================================================================

-- audit_events.actor_id → actors
ALTER TABLE public.audit_events
    DROP CONSTRAINT IF EXISTS audit_events_actor_id_fkey,
    ADD CONSTRAINT audit_events_actor_id_fkey
        FOREIGN KEY (actor_id, workspace_id)
        REFERENCES public.actors (id, workspace_id)
        ON DELETE RESTRICT;