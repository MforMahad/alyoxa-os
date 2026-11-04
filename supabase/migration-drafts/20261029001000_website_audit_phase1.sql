-- FINAL REVIEW CANDIDATE: additive schema, manual application only.
-- Outside migrations/ deliberately; never auto-apply. Supersedes the earlier Phase 1 draft.
-- Requires the existing workspace helpers, website canonicalizer and Signal schema.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- Fail closed: invoker views require PostgreSQL 15+. Pin the reviewed definer owner.
DO $$ BEGIN
  IF to_regclass('public.website_audit_runtime') IS NOT NULL OR to_regclass('public.website_quick_work') IS NOT NULL THEN
    RAISE EXCEPTION 'AUDIT_SCHEMA_ALREADY_EXISTS_REQUIRES_REVIEWED_UPGRADE';
  END IF;
  IF current_setting('server_version_num')::integer < 150000 THEN RAISE EXCEPTION 'AUDIT_REQUIRES_POSTGRES_15'; END IF;
  IF current_user <> 'postgres' OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'AUDIT_REQUIRES_POSTGRES_BYPASSRLS_OWNER';
  END IF;
  IF has_schema_privilege('anon','public','CREATE') OR has_schema_privilege('authenticated','public','CREATE') OR has_schema_privilege('service_role','public','CREATE') THEN
    RAISE EXCEPTION 'AUDIT_REQUIRES_TRUSTED_PUBLIC_SCHEMA';
  END IF;
  IF (NOT has_table_privilege(current_user,'public.signal_observations','SELECT') OR NOT has_table_privilege(current_user,'public.signal_observations','INSERT'))
     OR (NOT has_table_privilege(current_user,'public.websites','SELECT') OR NOT has_table_privilege(current_user,'public.websites','INSERT'))
     OR (NOT has_table_privilege(current_user,'public.signal_feed_sources','SELECT') OR NOT has_table_privilege(current_user,'public.signal_feed_sources','INSERT'))
     OR NOT has_table_privilege(current_user,'public.website_scans','SELECT')
     OR NOT has_table_privilege(current_user,'public.website_scans','UPDATE')
     OR NOT has_table_privilege(current_user,'public.website_scans','TRIGGER') THEN
    RAISE EXCEPTION 'AUDIT_OWNER_MISSING_TABLE_PRIVILEGES';
  END IF;
  -- Definer execution still needs helper EXECUTE; invoker-view RLS evaluates
  -- the membership helper as authenticated. Do not silently repair global grants.
  IF NOT has_function_privilege(current_user,'auth.uid()','EXECUTE')
     OR NOT has_function_privilege(current_user,'public.current_application_user_id()','EXECUTE')
     OR NOT has_function_privilege(current_user,'public.has_workspace_role(uuid,text[])','EXECUTE')
     OR NOT has_function_privilege(current_user,'public.canonicalize_website_url(text)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.is_active_workspace_member(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'AUDIT_DEPENDENCY_EXECUTE_MISSING';
  END IF;
END $$;

CREATE TABLE public.website_audit_runtime (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  creation_enabled BOOLEAN NOT NULL DEFAULT false,
  coordination_enabled BOOLEAN NOT NULL DEFAULT false,
  worker_enabled BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO public.website_audit_runtime DEFAULT VALUES;

-- Supporting composite FK keys. The id PKs make duplicates impossible, but
-- these ADD UNIQUE operations still build indexes under ACCESS EXCLUSIVE locks
-- held until COMMIT. Review live equivalent indexes/constraints before applying;
-- do not add redundant keys or assume a five-second total blocking limit.
ALTER TABLE public.websites ADD CONSTRAINT audit_websites_tenant_key UNIQUE (id, workspace_id);
ALTER TABLE public.signal_feed_sources ADD CONSTRAINT audit_sources_tenant_key UNIQUE (id, workspace_id);
ALTER TABLE public.signal_observations ADD CONSTRAINT audit_observations_source_key UNIQUE (id, source_id);

CREATE TABLE public.website_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT NOT NULL UNIQUE DEFAULT ('audit_' || replace(gen_random_uuid()::text, '-', '')),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  website_id UUID NOT NULL,
  source_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.users(id),
  idempotency_key UUID NOT NULL,
  start_url TEXT NOT NULL CHECK (length(start_url) <= 2048),
  target_origin TEXT NOT NULL,
  host_key TEXT NOT NULL,
  config JSONB NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  page_limit INTEGER NOT NULL DEFAULT 5 CHECK (page_limit BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','partial','failed','cancelled')),
  summary_observation_id UUID,
  discovery_truncated BOOLEAN NOT NULL DEFAULT false,
  last_serviced_at TIMESTAMPTZ,
  finalization_attempts INTEGER NOT NULL DEFAULT 0 CHECK (finalization_attempts BETWEEN 0 AND 1000000),
  next_finalize_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  last_finalize_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + interval '24 hours'),
  completed_at TIMESTAMPTZ,
  UNIQUE (workspace_id, idempotency_key),
  UNIQUE (id, workspace_id, source_id),
  FOREIGN KEY (website_id, workspace_id) REFERENCES public.websites(id, workspace_id),
  FOREIGN KEY (source_id, workspace_id) REFERENCES public.signal_feed_sources(id, workspace_id),
  FOREIGN KEY (summary_observation_id, source_id) REFERENCES public.signal_observations(id, source_id),
  CHECK (status NOT IN ('completed','partial','failed') OR (summary_observation_id IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE UNIQUE INDEX audit_one_active ON public.website_audits(workspace_id, website_id) WHERE status IN ('queued','running');
CREATE INDEX audit_workspace_history ON public.website_audits(workspace_id, created_at DESC);
CREATE INDEX audit_runnable ON public.website_audits(last_serviced_at NULLS FIRST, created_at) WHERE status IN ('queued','running');
CREATE INDEX audit_finalization_retry ON public.website_audits(next_finalize_at, created_at) WHERE status IN ('queued','running');

CREATE TABLE public.website_audit_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  source_id UUID NOT NULL,
  url TEXT NOT NULL CHECK (length(url) <= 2048),
  url_hash TEXT NOT NULL CHECK (url_hash = encode(sha256(convert_to(url, 'UTF8')), 'hex')),
  fetch_url TEXT NOT NULL CHECK (length(fetch_url) <= 2048),
  final_url TEXT,
  final_url_hash TEXT CHECK (final_url_hash = encode(sha256(convert_to(final_url, 'UTF8')), 'hex')),
  discovered_from UUID,
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 8),
  priority INTEGER NOT NULL DEFAULT 0,
  admitted BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered','queued','processing','completed','failed','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  redirect_count INTEGER NOT NULL DEFAULT 0 CHECK (redirect_count BETWEEN 0 AND 4),
  redirect_history JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(redirect_history)='array' AND jsonb_array_length(redirect_history)<=4),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  last_result_token UUID,
  observation_id UUID UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  completed_at TIMESTAMPTZ,
  UNIQUE (audit_id, url_hash),
  UNIQUE (id, audit_id),
  FOREIGN KEY (audit_id, workspace_id, source_id) REFERENCES public.website_audits(id, workspace_id, source_id),
  FOREIGN KEY (discovered_from, audit_id) REFERENCES public.website_audit_pages(id, audit_id),
  FOREIGN KEY (observation_id, source_id) REFERENCES public.signal_observations(id, source_id),
  CHECK ((status = 'processing' AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
      OR (status <> 'processing' AND lease_token IS NULL AND lease_until IS NULL)),
  CHECK (status <> 'completed' OR (observation_id IS NOT NULL AND completed_at IS NOT NULL AND final_url IS NOT NULL AND final_url_hash IS NOT NULL)),
  CHECK (status NOT IN ('queued','processing','completed','failed') OR admitted)
);
CREATE INDEX audit_page_queue ON public.website_audit_pages(audit_id, next_attempt_at, priority, created_at) WHERE status = 'queued';
CREATE INDEX audit_page_recovery ON public.website_audit_pages(lease_until) WHERE status = 'processing';
CREATE INDEX audit_page_status ON public.website_audit_pages(audit_id, status);
CREATE UNIQUE INDEX audit_final_page_identity ON public.website_audit_pages(audit_id, final_url_hash) WHERE status = 'completed';

CREATE TABLE public.website_crawl_hosts (
  host_key TEXT PRIMARY KEY,
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  next_allowed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  not_before TIMESTAMPTZ NOT NULL DEFAULT '-infinity',
  blocked BOOLEAN NOT NULL DEFAULT false,
  robots_origin TEXT,
  robots_body TEXT CHECK (octet_length(robots_body) <= 64000),
  robots_expires_at TIMESTAMPTZ,
  crawl_delay_ms INTEGER NOT NULL DEFAULT 2000 CHECK (crawl_delay_ms BETWEEN 2000 AND 86400000),
  CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);
ALTER TABLE public.website_audits ADD CONSTRAINT audit_host_fk FOREIGN KEY (host_key) REFERENCES public.website_crawl_hosts(host_key);

-- Operational continuation only; the existing Quick Scan table and public API
-- are preserved. No browser or service-role direct DML on this queue.
CREATE TABLE public.website_quick_work (
  scan_id UUID PRIMARY KEY REFERENCES public.website_scans(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK(length(url)<=2048),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
  redirect_count INTEGER NOT NULL DEFAULT 0 CHECK(redirect_count BETWEEN 0 AND 4),
  redirect_history JSONB NOT NULL DEFAULT '[]',
  robots_url TEXT CHECK(length(robots_url)<=2048), robots_redirects INTEGER NOT NULL DEFAULT 0 CHECK(robots_redirects BETWEEN 0 AND 4),
  robots_body TEXT CHECK(octet_length(robots_body)<=64000), robots_delay_ms INTEGER NOT NULL DEFAULT 2000 CHECK(robots_delay_ms BETWEEN 2000 AND 86400000),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()+interval '24 hours',
  lease_token UUID, lease_until TIMESTAMPTZ, host_key TEXT REFERENCES public.website_crawl_hosts(host_key),
  last_result_token UUID, observation_id UUID REFERENCES public.signal_observations(id),
  CHECK((status='processing' AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
    OR (status<>'processing' AND lease_token IS NULL AND lease_until IS NULL)),
  CHECK(jsonb_typeof(redirect_history)='array' AND jsonb_array_length(redirect_history)<=4),
  CHECK(status<>'completed' OR observation_id IS NOT NULL)
);
CREATE INDEX website_quick_work_due ON public.website_quick_work(next_attempt_at) WHERE status IN ('queued','processing');
ALTER TABLE public.website_quick_work ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.website_quick_work FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.keep_website_audit_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF ROW(NEW.id, NEW.created_at, NEW.workspace_id, NEW.website_id, NEW.source_id, NEW.requested_by, NEW.idempotency_key,
         NEW.start_url, NEW.target_origin, NEW.host_key, NEW.config, NEW.page_limit, NEW.expires_at)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.created_at, OLD.workspace_id, OLD.website_id, OLD.source_id, OLD.requested_by, OLD.idempotency_key,
         OLD.start_url, OLD.target_origin, OLD.host_key, OLD.config, OLD.page_limit, OLD.expires_at) THEN
    RAISE EXCEPTION 'AUDIT_IMMUTABLE_TARGET';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER audit_immutable_target BEFORE UPDATE ON public.website_audits
FOR EACH ROW EXECUTE FUNCTION public.keep_website_audit_identity();

ALTER TABLE public.website_audit_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_audit_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_crawl_hosts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.website_audit_runtime, public.website_audits, public.website_audit_pages, public.website_crawl_hosts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.website_audits, public.website_audit_pages TO authenticated;
CREATE POLICY audit_member_read ON public.website_audits FOR SELECT TO authenticated
USING (public.is_active_workspace_member(workspace_id));
CREATE POLICY audit_page_member_read ON public.website_audit_pages FOR SELECT TO authenticated
USING (public.is_active_workspace_member(workspace_id));

-- New creation contract: does not update the workspace URL or queue a Quick Scan.
CREATE FUNCTION public.create_website_audit(p_workspace_id UUID, p_start_url TEXT, p_idempotency_key UUID, p_page_limit INTEGER DEFAULT 5)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_url TEXT; v_domain TEXT; v_origin TEXT; v_source UUID; v_website UUID;
  v_audit public.website_audits%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_workspace_role(p_workspace_id, ARRAY['owner','admin']) THEN
    RAISE EXCEPTION 'AUDIT_NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF NOT coalesce((SELECT creation_enabled AND coordination_enabled FROM public.website_audit_runtime WHERE singleton),false) THEN
    RAISE EXCEPTION 'AUDIT_CREATION_DISABLED';
  END IF;
  IF p_page_limit IS NULL OR p_page_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'AUDIT_INVALID_PAGE_LIMIT'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'AUDIT_IDEMPOTENCY_REQUIRED'; END IF;
  SELECT c.canonical_url, c.normalized_domain INTO v_url, v_domain FROM public.canonicalize_website_url(p_start_url) AS c;
  v_origin := split_part(v_url, '://', 1) || '://' || v_domain;
  PERFORM pg_advisory_xact_lock(hashtextextended('audit:' || p_workspace_id::text, 0));
  SELECT a.* INTO v_audit FROM public.website_audits AS a WHERE a.workspace_id = p_workspace_id AND a.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_audit.start_url <> v_url OR v_audit.page_limit <> p_page_limit THEN RAISE EXCEPTION 'AUDIT_IDEMPOTENCY_MISMATCH'; END IF;
    RETURN jsonb_build_object('audit_id', v_audit.id, 'status', v_audit.status, 'reused', true);
  END IF;
  IF (SELECT count(*) FROM public.website_audits AS a WHERE a.workspace_id = p_workspace_id AND a.status IN ('queued','running')) >= 2 THEN
    RAISE EXCEPTION 'AUDIT_WORKSPACE_CAPACITY';
  END IF;
  INSERT INTO public.signal_feed_sources(public_id, workspace_id, source_type, name, source_key, status)
  VALUES ('src_' || replace(gen_random_uuid()::text,'-',''), p_workspace_id, 'website', v_domain, 'website:' || v_domain, 'active')
  ON CONFLICT (workspace_id, source_key) WHERE source_key IS NOT NULL DO NOTHING;
  SELECT s.id INTO v_source FROM public.signal_feed_sources AS s
  WHERE s.workspace_id = p_workspace_id AND s.source_type = 'website' AND s.source_key = 'website:' || v_domain;
  IF v_source IS NULL THEN RAISE EXCEPTION 'AUDIT_SOURCE_IDENTITY_CONFLICT'; END IF;
  INSERT INTO public.websites(public_id, workspace_id, name, entry_url, normalized_domain, status)
  VALUES ('web_' || replace(gen_random_uuid()::text,'-',''), p_workspace_id, v_domain, v_origin || '/', v_domain, 'active')
  ON CONFLICT (workspace_id, normalized_domain) DO NOTHING;
  SELECT w.id INTO v_website FROM public.websites AS w WHERE w.workspace_id = p_workspace_id AND w.normalized_domain = v_domain;
  IF EXISTS (SELECT 1 FROM public.website_audits AS a WHERE a.workspace_id = p_workspace_id AND a.website_id = v_website AND a.status IN ('queued','running')) THEN
    RAISE EXCEPTION 'AUDIT_ALREADY_ACTIVE';
  END IF;
  INSERT INTO public.website_crawl_hosts(host_key) VALUES (v_domain) ON CONFLICT DO NOTHING;
  INSERT INTO public.website_audits(workspace_id, website_id, source_id, requested_by, idempotency_key, start_url, target_origin, host_key, config, page_limit)
  VALUES (p_workspace_id, v_website, v_source, public.current_application_user_id(), p_idempotency_key, v_url, v_origin, v_domain,
          jsonb_build_object('version',2,'page_limit',p_page_limit,'frontier_limit',1000,'depth_limit',8,'discovery','navigation','ai',false),p_page_limit)
  RETURNING * INTO v_audit;
  INSERT INTO public.website_audit_pages(audit_id, workspace_id, source_id, url, url_hash, fetch_url, admitted, status)
  VALUES (v_audit.id, p_workspace_id, v_source, v_url, encode(sha256(convert_to(v_url,'UTF8')),'hex'), v_url, true, 'queued');
  RETURN jsonb_build_object('audit_id', v_audit.id, 'status', v_audit.status, 'reused', false);
END;
$$;

-- Atomically recover expired page leases, serialize host access, and claim one item.
CREATE FUNCTION public.claim_website_audit_page(p_audit_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE v_a public.website_audits%ROWTYPE; v_p public.website_audit_pages%ROWTYPE; v_h public.website_crawl_hosts%ROWTYPE; v_token UUID;
BEGIN
  IF NOT coalesce((SELECT worker_enabled AND coordination_enabled FROM public.website_audit_runtime WHERE singleton),false) THEN RETURN NULL; END IF;
  FOR v_a IN SELECT a.* FROM public.website_audits AS a
    WHERE a.status IN ('queued','running') AND a.page_limit <= 100 AND (p_audit_id IS NULL OR a.id = p_audit_id)
    ORDER BY a.last_serviced_at NULLS FIRST, a.created_at, a.id LIMIT 20 FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.website_audits SET last_serviced_at = clock_timestamp() WHERE id = v_a.id;
    IF v_a.expires_at <= clock_timestamp() THEN
      UPDATE public.website_audit_pages SET status = CASE WHEN admitted THEN 'failed' ELSE 'skipped' END,
        reason = 'audit_lifetime_exhausted', lease_token = NULL, lease_until = NULL, completed_at = clock_timestamp()
      WHERE audit_id = v_a.id AND status IN ('discovered','queued','processing');
      CONTINUE;
    END IF;
    UPDATE public.website_audit_pages SET status = CASE WHEN attempts < 3 THEN 'queued' ELSE 'failed' END,
      reason = 'lease_expired', lease_token = NULL, lease_until = NULL,
      completed_at = CASE WHEN attempts >= 3 THEN clock_timestamp() ELSE NULL END
    WHERE audit_id = v_a.id AND status = 'processing' AND lease_until <= clock_timestamp();
    -- Yield to an already-processing Quick Scan without changing its contracts.
    IF EXISTS(SELECT 1 FROM public.website_scans AS s JOIN public.websites AS w ON w.id=s.website_id
      WHERE s.status='processing' AND w.normalized_domain=v_a.host_key AND NOT EXISTS (SELECT 1 FROM public.website_quick_work q WHERE q.scan_id=s.id)) THEN CONTINUE; END IF;
    SELECT h.* INTO v_h FROM public.website_crawl_hosts AS h WHERE h.host_key = v_a.host_key
      AND (h.lease_until IS NULL OR h.lease_until <= clock_timestamp()) AND h.next_allowed_at <= clock_timestamp() AND h.not_before <= clock_timestamp() AND NOT h.blocked
      FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT p.* INTO v_p FROM public.website_audit_pages AS p
    WHERE p.audit_id = v_a.id AND p.status = 'queued' AND p.next_attempt_at <= clock_timestamp()
    ORDER BY p.priority, p.created_at, p.id LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN CONTINUE; END IF;
    v_token := gen_random_uuid();
    -- Reserve crash-safe spacing before I/O. If the worker disappears, lease
    -- expiry alone must not bypass a cached Crawl-delay longer than the lease.
    UPDATE public.website_crawl_hosts SET lease_token = v_token, lease_until = clock_timestamp() + interval '120 seconds',
      next_allowed_at = clock_timestamp() + interval '120 seconds' + crawl_delay_ms * interval '1 millisecond' WHERE host_key = v_a.host_key;
    UPDATE public.website_audit_pages SET status = 'processing', attempts = attempts + 1,
      lease_token = v_token, lease_until = clock_timestamp() + interval '120 seconds' WHERE id = v_p.id;
    UPDATE public.website_audits SET status = 'running', last_serviced_at = clock_timestamp() WHERE id = v_a.id;
    RETURN jsonb_build_object('audit_id', v_a.id, 'page_id', v_p.id, 'lease_token', v_token,
      'url', v_p.fetch_url, 'origin', v_a.target_origin, 'depth', v_p.depth, 'redirect_count', v_p.redirect_count,
      'robots_body', CASE WHEN v_h.robots_origin = v_a.target_origin AND v_h.robots_expires_at > clock_timestamp() THEN v_h.robots_body ELSE NULL END);
  END LOOP;
  RETURN NULL;
END;
$$;

-- Single transaction retains evidence, discovers pages, and changes operational state.
CREATE FUNCTION public.finish_website_audit_page(p_page_id UUID, p_lease_token UUID, p_result JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_a public.website_audits%ROWTYPE; v_p public.website_audit_pages%ROWTYPE;
  v_kind TEXT := p_result->>'kind'; v_observation UUID; v_item JSONB; v_url TEXT; v_domain TEXT;
  v_count INTEGER; v_admitted INTEGER; v_delay INTEGER := 2000; v_reason TEXT;
BEGIN
  IF p_lease_token IS NULL OR p_result IS NULL OR jsonb_typeof(p_result) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'AUDIT_INVALID_RESULT'; END IF;
  IF octet_length(p_result::text) > 131072 THEN RAISE EXCEPTION 'AUDIT_RESULT_TOO_LARGE'; END IF;
  SELECT a.* INTO v_a FROM public.website_audits AS a JOIN public.website_audit_pages AS p ON p.audit_id = a.id WHERE p.id = p_page_id FOR UPDATE OF a;
  IF NOT FOUND THEN RAISE EXCEPTION 'AUDIT_PAGE_NOT_FOUND'; END IF;
  SELECT p.* INTO v_p FROM public.website_audit_pages AS p WHERE p.id = p_page_id FOR UPDATE;
  IF v_p.last_result_token = p_lease_token THEN
    RETURN jsonb_build_object('status', v_p.status, 'observation_id', v_p.observation_id, 'replayed', true);
  END IF;
  IF v_a.status NOT IN ('queued','running') OR v_p.status <> 'processing' OR v_p.lease_token IS DISTINCT FROM p_lease_token OR v_p.lease_until <= clock_timestamp() THEN
    RAISE EXCEPTION 'AUDIT_STALE_LEASE';
  END IF;
  PERFORM 1 FROM public.website_crawl_hosts AS h WHERE h.host_key = v_a.host_key AND h.lease_token = p_lease_token AND h.lease_until > clock_timestamp() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AUDIT_STALE_HOST_LEASE'; END IF;
  v_reason := left(p_result->>'reason', 300);
  IF v_kind = 'policy' THEN
    IF octet_length(p_result->>'robots_body') > 64000 OR p_result->>'robots_body' IS NULL THEN RAISE EXCEPTION 'AUDIT_INVALID_POLICY'; END IF;
    v_delay := greatest(2000, least(86400000, coalesce((p_result->>'delay_ms')::integer, 2000)));
    UPDATE public.website_crawl_hosts SET robots_origin = v_a.target_origin, robots_body = p_result->>'robots_body',
      robots_expires_at = clock_timestamp() + interval '15 minutes' + v_delay * interval '1 millisecond', crawl_delay_ms = greatest(crawl_delay_ms,v_delay) WHERE host_key = v_a.host_key;
    UPDATE public.website_audit_pages SET status = 'queued', lease_token = NULL, lease_until = NULL, attempts = greatest(0, attempts - 1), next_attempt_at = clock_timestamp() + v_delay * interval '1 millisecond' WHERE id = v_p.id;
  ELSIF v_kind = 'redirect' THEN
    SELECT c.canonical_url, c.normalized_domain INTO v_url, v_domain FROM public.canonicalize_website_url(p_result->>'url') AS c;
    IF v_p.redirect_count >= 4 OR split_part(v_url, '://', 1) || '://' || v_domain <> v_a.target_origin THEN RAISE EXCEPTION 'AUDIT_INVALID_REDIRECT'; END IF;
    IF EXISTS (SELECT 1 FROM public.website_audit_pages AS p WHERE p.audit_id=v_a.id AND p.status='completed' AND p.final_url=v_url) THEN
      UPDATE public.website_audit_pages SET status='skipped', reason='redirect_alias', lease_token=NULL, lease_until=NULL, completed_at=clock_timestamp() WHERE id=v_p.id;
    ELSIF v_url = v_p.fetch_url OR v_p.redirect_history ? v_url THEN
      UPDATE public.website_audit_pages SET status='failed', reason='redirect_loop', lease_token=NULL, lease_until=NULL, completed_at=clock_timestamp() WHERE id=v_p.id;
    ELSE
      UPDATE public.website_audit_pages SET status = 'queued', lease_token = NULL, lease_until = NULL, attempts = greatest(0, attempts - 1), fetch_url = v_url,
        redirect_history = redirect_history || jsonb_build_array(fetch_url), redirect_count = redirect_count + 1 WHERE id = v_p.id;
    END IF;
  ELSIF v_kind = 'completed' THEN
    IF p_result->>'url' IS DISTINCT FROM v_p.fetch_url OR jsonb_typeof(p_result->'metadata') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'AUDIT_INVALID_PAGE_EVIDENCE'; END IF;
    IF EXISTS (SELECT 1 FROM public.website_audit_pages AS p WHERE p.audit_id = v_a.id AND p.status = 'completed' AND p.final_url = v_p.fetch_url) THEN
      UPDATE public.website_audit_pages SET status = 'skipped', lease_token = NULL, lease_until = NULL, reason = 'redirect_alias', completed_at = clock_timestamp(), last_result_token = p_lease_token WHERE id = v_p.id;
    ELSE
      INSERT INTO public.signal_observations(public_id, source_id, source_event_id, severity, category, title, description, metadata)
      VALUES ('obs_' || replace(gen_random_uuid()::text,'-',''), v_a.source_id, 'audit:' || v_a.id::text || ':page:' || v_p.id::text,
      'low', 'website_audit_page', left(coalesce(p_result->>'title','Website page'),250), left(coalesce(p_result->>'description','Measured HTML page'),5000),
        (p_result->'metadata') || jsonb_build_object('record_kind','audit_page','audit_id',v_a.id,'page_id',v_p.id,'ai',jsonb_build_object('status','unavailable','reason','Phase 1 does not generate recommendations.','recommendations','[]'::jsonb)))
      RETURNING id INTO v_observation;
      UPDATE public.website_audit_pages SET status = 'completed', lease_token = NULL, lease_until = NULL, observation_id = v_observation, final_url = v_p.fetch_url, final_url_hash = encode(sha256(convert_to(v_p.fetch_url,'UTF8')),'hex'), completed_at = clock_timestamp(), last_result_token = p_lease_token WHERE id = v_p.id;
    END IF;
    IF jsonb_typeof(p_result->'links') = 'array' THEN
      FOR v_item IN SELECT value FROM jsonb_array_elements(p_result->'links') LIMIT 200 LOOP
        BEGIN
          SELECT c.canonical_url, c.normalized_domain INTO v_url, v_domain FROM public.canonicalize_website_url(v_item->>'url') AS c;
        EXCEPTION WHEN OTHERS THEN CONTINUE;
        END;
        IF split_part(v_url, '://', 1) || '://' || v_domain <> v_a.target_origin THEN CONTINUE; END IF;
        IF EXISTS(SELECT 1 FROM public.website_audit_pages WHERE audit_id=v_a.id AND (url=v_url OR final_url=v_url)) THEN CONTINUE; END IF;
        IF v_p.depth >= 8 THEN UPDATE public.website_audits SET discovery_truncated=true WHERE id=v_a.id; CONTINUE; END IF;
        SELECT count(*) INTO v_count FROM public.website_audit_pages WHERE audit_id = v_a.id;
        IF v_count >= 1000 THEN UPDATE public.website_audits SET discovery_truncated = true WHERE id = v_a.id; EXIT; END IF;
        INSERT INTO public.website_audit_pages(audit_id,workspace_id,source_id,url,url_hash,fetch_url,discovered_from,depth,priority)
        VALUES(v_a.id,v_a.workspace_id,v_a.source_id,v_url,encode(sha256(convert_to(v_url,'UTF8')),'hex'),v_url,v_p.id,v_p.depth + 1,least(100,greatest(0,coalesce((v_item->>'priority')::integer,50))))
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
    IF coalesce((p_result->>'discovery_truncated')::boolean, false) THEN UPDATE public.website_audits SET discovery_truncated = true WHERE id = v_a.id; END IF;
  ELSIF v_kind IN ('retry','failed','skipped') THEN
    v_delay := greatest(2000, least(3600000, coalesce((p_result->>'delay_ms')::integer, 60000)));
    UPDATE public.website_audit_pages SET status = CASE WHEN v_kind = 'retry' AND attempts < 3 THEN 'queued' WHEN v_kind = 'retry' THEN 'failed' ELSE v_kind END,
      lease_token = NULL, lease_until = NULL, reason = coalesce(v_reason, v_kind), next_attempt_at = clock_timestamp() + v_delay * interval '1 millisecond',
      last_result_token = CASE WHEN v_kind <> 'retry' OR attempts >= 3 THEN p_lease_token ELSE NULL END,
      completed_at = CASE WHEN v_kind <> 'retry' OR attempts >= 3 THEN clock_timestamp() ELSE NULL END WHERE id = v_p.id;
  ELSE RAISE EXCEPTION 'AUDIT_INVALID_OUTCOME';
  END IF;
  -- Promote only within the immutable admission budget. Audit lock serializes decisions.
  SELECT count(*) INTO v_admitted FROM public.website_audit_pages WHERE audit_id = v_a.id AND admitted;
  UPDATE public.website_audit_pages SET status = 'queued', admitted = true WHERE id IN (
    SELECT p.id FROM public.website_audit_pages AS p WHERE p.audit_id = v_a.id AND p.status = 'discovered'
    ORDER BY p.priority, p.depth, p.url LIMIT greatest(0, v_a.page_limit - v_admitted)
  );
  IF (SELECT count(*) FROM public.website_audit_pages WHERE audit_id = v_a.id AND admitted) >= v_a.page_limit THEN
    UPDATE public.website_audit_pages SET status = 'skipped', reason = 'page_limit', completed_at = clock_timestamp() WHERE audit_id = v_a.id AND status = 'discovered';
  END IF;
  UPDATE public.website_audit_pages SET lease_token = NULL, lease_until = NULL, last_result_token = p_lease_token WHERE id = v_p.id;
  UPDATE public.website_crawl_hosts SET not_before=greatest(not_before,coalesce((p_result->>'not_before')::timestamptz,'-infinity'::timestamptz)),
    blocked=blocked OR coalesce((p_result->>'host_blocked')::boolean,false) WHERE host_key=v_a.host_key;
  IF EXISTS(SELECT 1 FROM public.website_crawl_hosts WHERE host_key=v_a.host_key AND (blocked OR not_before >= v_a.expires_at)) THEN
    UPDATE public.website_audit_pages SET status='skipped',reason='host_backoff_exceeds_audit_lifetime',completed_at=clock_timestamp(),lease_token=NULL,lease_until=NULL
      WHERE audit_id=v_a.id AND status IN ('discovered','queued');
  END IF;
  UPDATE public.website_crawl_hosts SET lease_token = NULL, lease_until = NULL,
    next_allowed_at = clock_timestamp() + greatest(crawl_delay_ms, CASE WHEN v_kind = 'retry' THEN v_delay ELSE 2000 END) * interval '1 millisecond'
    WHERE host_key = v_a.host_key AND lease_token = p_lease_token;
  RETURN jsonb_build_object('page_id',v_p.id,'status',(SELECT status FROM public.website_audit_pages WHERE id=v_p.id),'observation_id',v_observation);
END;
$$;

CREATE FUNCTION public.finalize_website_audit(p_audit_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE v_a public.website_audits%ROWTYPE; v_counts JSONB; v_observation UUID; v_status TEXT; v_count INTEGER; v_completed INTEGER; v_limited BOOLEAN; v_findings JSONB; v_refs JSONB;
BEGIN
  IF NOT coalesce((SELECT worker_enabled AND coordination_enabled FROM public.website_audit_runtime WHERE singleton),false) THEN RETURN NULL; END IF;
  SELECT a.* INTO v_a FROM public.website_audits AS a WHERE a.status IN ('queued','running')
    AND (p_audit_id IS NULL OR a.id = p_audit_id) AND a.next_finalize_at <= clock_timestamp()
    AND NOT EXISTS(SELECT 1 FROM public.website_audit_pages AS p WHERE p.audit_id=a.id AND p.status IN ('discovered','queued','processing'))
    ORDER BY a.next_finalize_at, a.created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF EXISTS(SELECT 1 FROM public.website_audit_pages WHERE audit_id=v_a.id AND status IN ('discovered','queued','processing')) THEN RETURN NULL; END IF;
  -- Include evidence reads in the retry boundary: a failed aggregation must
  -- not repeatedly select the same ready audit without recording backoff.
  BEGIN
  SELECT count(*),count(*) FILTER(WHERE status='completed'),bool_or(reason='page_limit') INTO v_count,v_completed,v_limited FROM public.website_audit_pages WHERE audit_id=v_a.id;
  SELECT jsonb_object_agg(s.status,s.n) INTO v_counts FROM (SELECT status,count(*) AS n FROM public.website_audit_pages WHERE audit_id=v_a.id GROUP BY status) AS s;
  SELECT jsonb_build_object('missing_titles',count(*) FILTER(WHERE o.metadata->'evidence' @> '[{"id":"title","value":""}]'::jsonb),
    'missing_descriptions',count(*) FILTER(WHERE o.metadata->'evidence' @> '[{"id":"description","value":""}]'::jsonb),
    'measured_titles',count(*) FILTER(WHERE o.metadata->'evidence' @> '[{"id":"title"}]'::jsonb),
    'measured_descriptions',count(*) FILTER(WHERE o.metadata->'evidence' @> '[{"id":"description"}]'::jsonb),
    'denominator_completed_pages',count(*)),
    coalesce(jsonb_agg(jsonb_build_object('page_id',p.id,'observation_id',p.observation_id) ORDER BY p.url),'[]'::jsonb)
  INTO v_findings,v_refs FROM public.website_audit_pages AS p JOIN public.signal_observations AS o ON o.id=p.observation_id
  WHERE p.audit_id=v_a.id AND p.status='completed';
  v_status := CASE WHEN v_completed=0 THEN 'failed' WHEN v_completed<v_count OR v_a.discovery_truncated THEN 'partial' ELSE 'completed' END;
  INSERT INTO public.signal_observations(public_id,source_id,source_event_id,severity,category,title,description,metadata)
  VALUES('obs_'||replace(gen_random_uuid()::text,'-',''),v_a.source_id,'audit:'||v_a.id::text||':summary:v1','low','website_audit_summary','Website audit summary',
    format('%s of %s discovered pages analyzed; processing cap %s. Navigation-only coverage, not a complete website census.',v_completed,v_count,v_a.page_limit),
    jsonb_build_object('record_kind','audit_summary','audit_id',v_a.id,'version',1,'target_url',v_a.start_url,'target_origin',v_a.target_origin,'coverage','partial',
      'counts',v_counts,'findings',v_findings,'page_references',v_refs,'page_limit',v_a.page_limit,'admission_budget_exhausted',(SELECT count(*) >= v_a.page_limit FROM public.website_audit_pages WHERE audit_id=v_a.id AND admitted),'page_limit_reached',coalesce(v_limited,false),'discovery_truncated',v_a.discovery_truncated,
      'admission_semantics','Budget counts unique admitted URLs, including failed, blocked and redirect-alias targets; no replacement slots.',
      'limitations',jsonb_build_array('Navigation-only discovery; no sitemaps or JavaScript rendering in Phase 1.','Exhausted discovered links do not prove the whole website was crawled.'),
      'evidence',jsonb_build_array(jsonb_build_object('id','completed_pages','label','Pages with retained evidence','value',v_completed),jsonb_build_object('id','discovered_pages','label','Unique candidate pages retained','value',v_count))))
  RETURNING id INTO v_observation;
  UPDATE public.website_audits SET status=v_status,summary_observation_id=v_observation,completed_at=clock_timestamp(),last_finalize_error_code=NULL WHERE id=v_a.id;
  EXCEPTION WHEN OTHERS THEN
    -- The nested transaction rolls back both the summary and terminal state.
    -- Backoff makes a broken audit visible without starving other ready jobs.
    UPDATE public.website_audits SET finalization_attempts=least(1000000,finalization_attempts+1),
      next_finalize_at=clock_timestamp()+least(3600,60*power(2,least(finalization_attempts,6))) * interval '1 second',
      last_finalize_error_code=SQLSTATE WHERE id=v_a.id;
    RETURN jsonb_build_object('audit_id',v_a.id,'status','finalization_retry','code',SQLSTATE);
  END;
  RETURN jsonb_build_object('audit_id',v_a.id,'status',v_status,'summary_observation_id',v_observation);
END;
$$;

-- Live counters are computed from page rows, never incremented by worker retries.
CREATE VIEW public.website_audit_progress WITH (security_invoker=true) AS
SELECT a.id,a.workspace_id,a.status,a.page_limit,a.summary_observation_id,a.discovery_truncated,
  a.finalization_attempts,a.next_finalize_at,a.last_finalize_error_code,
  count(p.id) AS discovered_total,count(p.id) FILTER(WHERE p.admitted) AS admitted,
  count(p.id) FILTER(WHERE p.status='discovered') AS discovered,
  count(p.id) FILTER(WHERE p.status='queued') AS queued,count(p.id) FILTER(WHERE p.status='processing') AS processing,
  count(p.id) FILTER(WHERE p.status='completed') AS completed,count(p.id) FILTER(WHERE p.status='failed') AS failed,
  count(p.id) FILTER(WHERE p.status='skipped') AS skipped
FROM public.website_audits AS a LEFT JOIN public.website_audit_pages AS p ON p.audit_id=a.id GROUP BY a.id;
REVOKE ALL ON public.website_audit_progress FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.website_audit_progress TO authenticated;

REVOKE ALL ON FUNCTION public.keep_website_audit_identity(),public.create_website_audit(UUID,TEXT,UUID,INTEGER),public.claim_website_audit_page(UUID),public.finish_website_audit_page(UUID,UUID,JSONB),public.finalize_website_audit(UUID) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_website_audit(UUID,TEXT,UUID,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_website_audit_page(UUID),public.finish_website_audit_page(UUID,UUID,JSONB),public.finalize_website_audit(UUID) TO service_role;

CREATE FUNCTION public.next_website_quick_scan() RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
  SELECT s.id FROM public.website_scans s LEFT JOIN public.website_quick_work q ON q.scan_id=s.id
  WHERE s.status IN ('queued','processing') AND
    ((q.scan_id IS NULL AND s.status='queued') OR
     (q.status='queued' AND q.next_attempt_at<=clock_timestamp()) OR
     (q.status='processing' AND q.lease_until<=clock_timestamp()) OR
     (q.status IN ('queued','processing') AND q.expires_at<=clock_timestamp()))
  ORDER BY coalesce(q.next_attempt_at,s.created_at),s.id LIMIT 1;
$$;

CREATE FUNCTION public.claim_website_quick_scan(p_scan_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_s public.website_scans%ROWTYPE; v_q public.website_quick_work%ROWTYPE;
  v_h public.website_crawl_hosts%ROWTYPE; v_url TEXT; v_domain TEXT; v_origin TEXT; v_token UUID; v_previous_token TEXT;
BEGIN
  IF NOT coalesce((SELECT coordination_enabled FROM public.website_audit_runtime WHERE singleton),false) THEN RAISE EXCEPTION 'CRAWL_COORDINATION_DISABLED'; END IF;
  SELECT s.* INTO v_s FROM public.website_scans s WHERE s.id=p_scan_id AND s.status IN ('queued','processing') FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_s.status='processing' AND NOT EXISTS(SELECT 1 FROM public.website_quick_work q WHERE q.scan_id=v_s.id) THEN RETURN NULL; END IF;
  INSERT INTO public.website_quick_work(scan_id,url) SELECT v_s.id,w.entry_url FROM public.websites w WHERE w.id=v_s.website_id ON CONFLICT DO NOTHING;
  SELECT q.* INTO v_q FROM public.website_quick_work q WHERE q.scan_id=v_s.id FOR UPDATE;
  IF v_q.status IN ('completed','failed') OR (v_q.status='processing' AND v_q.lease_until>clock_timestamp()) THEN RETURN NULL; END IF;
  IF v_q.expires_at<=clock_timestamp() OR v_q.attempts>=3 THEN
    UPDATE public.website_quick_work SET status='failed',lease_token=NULL,lease_until=NULL WHERE scan_id=v_s.id;
    UPDATE public.website_scans SET status='failed',completed_at=clock_timestamp(),error_message='Website processing lifetime or retry budget exhausted.' WHERE id=v_s.id;
    RETURN NULL;
  END IF;
  IF v_q.next_attempt_at>clock_timestamp() THEN RETURN NULL; END IF;
  SELECT c.canonical_url,c.normalized_domain INTO v_url,v_domain FROM public.canonicalize_website_url(v_q.url) c;
  v_origin:=split_part(v_url,'://',1)||'://'||v_domain;
  IF v_q.robots_body IS NULL AND v_q.robots_url IS NOT NULL THEN
    SELECT c.normalized_domain INTO v_domain FROM public.canonicalize_website_url(v_q.robots_url) c;
  END IF;
  INSERT INTO public.website_crawl_hosts(host_key) VALUES(v_domain) ON CONFLICT DO NOTHING;
  -- Never overlap an old uncoordinated Quick Scan during rollout.
  IF EXISTS(SELECT 1 FROM public.website_scans s JOIN public.websites w ON w.id=s.website_id WHERE s.status='processing' AND s.id<>v_s.id AND w.normalized_domain=v_domain AND NOT EXISTS(SELECT 1 FROM public.website_quick_work q WHERE q.scan_id=s.id)) THEN
    UPDATE public.website_quick_work SET next_attempt_at=clock_timestamp()+interval '30 seconds' WHERE scan_id=v_s.id;
    RETURN NULL;
  END IF;
  SELECT h.* INTO v_h FROM public.website_crawl_hosts h WHERE h.host_key=v_domain FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN
    UPDATE public.website_quick_work SET next_attempt_at=clock_timestamp()+interval '30 seconds' WHERE scan_id=v_s.id;
    RETURN NULL;
  END IF;
  IF v_h.blocked OR greatest(v_h.not_before,v_h.next_allowed_at,coalesce(v_h.lease_until,'-infinity'::timestamptz))>clock_timestamp() THEN
    UPDATE public.website_quick_work SET next_attempt_at=least(expires_at,greatest(clock_timestamp()+interval '30 seconds',v_h.not_before,v_h.next_allowed_at,coalesce(v_h.lease_until,'-infinity'::timestamptz))) WHERE scan_id=v_s.id;
    RETURN NULL;
  END IF;
  v_token:=gen_random_uuid();
  UPDATE public.website_crawl_hosts SET lease_token=v_token,lease_until=clock_timestamp()+interval '120 seconds',
    crawl_delay_ms=greatest(crawl_delay_ms,v_q.robots_delay_ms),
    next_allowed_at=clock_timestamp()+interval '120 seconds'+greatest(crawl_delay_ms,v_q.robots_delay_ms)*interval '1 millisecond' WHERE host_key=v_domain;
  UPDATE public.website_quick_work SET status='processing',attempts=attempts+1,lease_token=v_token,lease_until=clock_timestamp()+interval '120 seconds',host_key=v_domain WHERE scan_id=v_s.id;
  v_previous_token:=current_setting('alyoxa.quick_claim_token',true);
  PERFORM set_config('alyoxa.quick_claim_token',v_token::text,true);
  UPDATE public.website_scans SET status='processing',started_at=coalesce(started_at,clock_timestamp()),completed_at=NULL,error_message=NULL WHERE id=v_s.id;
  PERFORM set_config('alyoxa.quick_claim_token',coalesce(v_previous_token,''),true);
  RETURN jsonb_build_object('audit_id',v_s.id,'page_id',v_s.id,'lease_token',v_token,'url',v_url,'origin',v_origin,'depth',0,'redirect_count',v_q.redirect_count,
    'robots_url',v_q.robots_url,'robots_body',coalesce(v_q.robots_body,CASE WHEN v_q.robots_url IS NULL AND v_h.robots_origin=v_origin AND v_h.robots_expires_at>clock_timestamp() THEN v_h.robots_body ELSE NULL END));
END;
$$;

CREATE FUNCTION public.finish_website_quick_scan(p_scan_id UUID,p_lease_token UUID,p_result JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_s public.website_scans%ROWTYPE; v_q public.website_quick_work%ROWTYPE; v_kind TEXT:=p_result->>'kind';
  v_url TEXT; v_domain TEXT; v_source UUID; v_observation UUID; v_public TEXT; v_delay INTEGER:=2000; v_status TEXT; v_workspace UUID;
BEGIN
  IF p_lease_token IS NULL OR jsonb_typeof(p_result) IS DISTINCT FROM 'object' OR octet_length(p_result::text)>131072 THEN RAISE EXCEPTION 'QUICK_INVALID_RESULT'; END IF;
  SELECT s.* INTO v_s FROM public.website_scans s WHERE s.id=p_scan_id FOR UPDATE;
  SELECT q.* INTO v_q FROM public.website_quick_work q WHERE q.scan_id=p_scan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'QUICK_NOT_FOUND'; END IF;
  IF v_q.last_result_token=p_lease_token THEN RETURN jsonb_build_object('status',v_q.status,'replayed',true); END IF;
  IF v_s.status<>'processing' OR v_q.status<>'processing' OR v_q.lease_token IS DISTINCT FROM p_lease_token OR v_q.lease_until<=clock_timestamp() THEN RAISE EXCEPTION 'QUICK_STALE_LEASE'; END IF;
  PERFORM 1 FROM public.website_crawl_hosts h WHERE h.host_key=v_q.host_key AND h.lease_token=p_lease_token AND h.lease_until>clock_timestamp() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'QUICK_STALE_HOST_LEASE'; END IF;
  v_status:='queued';
  IF v_kind='policy' THEN
    IF p_result->>'robots_body' IS NULL OR octet_length(p_result->>'robots_body')>64000 THEN RAISE EXCEPTION 'QUICK_INVALID_POLICY'; END IF;
    v_delay:=greatest(2000,least(86400000,coalesce((p_result->>'delay_ms')::integer,2000)));
    UPDATE public.website_crawl_hosts SET robots_origin=split_part(v_q.url,'://',1)||'://'||host_key,robots_body=p_result->>'robots_body',
      robots_expires_at=clock_timestamp()+interval '15 minutes'+v_delay*interval '1 millisecond',crawl_delay_ms=greatest(crawl_delay_ms,v_delay) WHERE host_key=v_q.host_key AND v_q.robots_url IS NULL;
    UPDATE public.website_quick_work SET attempts=greatest(0,attempts-1),robots_body=p_result->>'robots_body',robots_url=NULL,robots_delay_ms=v_delay WHERE scan_id=p_scan_id;
  ELSIF v_kind='policy_redirect' THEN
    SELECT c.canonical_url INTO v_url FROM public.canonicalize_website_url(p_result->>'url') c;
    IF v_q.robots_redirects>=4 OR v_url IS NOT DISTINCT FROM v_q.robots_url THEN v_status:='failed';
    ELSE UPDATE public.website_quick_work SET robots_url=v_url,robots_redirects=robots_redirects+1,attempts=greatest(0,attempts-1) WHERE scan_id=p_scan_id; END IF;
  ELSIF v_kind='redirect' THEN
    SELECT c.canonical_url,c.normalized_domain INTO v_url,v_domain FROM public.canonicalize_website_url(p_result->>'url') c;
    IF v_q.redirect_count>=4 OR v_url=v_q.url OR v_q.redirect_history ? v_url THEN v_status:='failed';
    ELSE UPDATE public.website_quick_work SET url=v_url,redirect_history=redirect_history||jsonb_build_array(url),redirect_count=redirect_count+1,attempts=greatest(0,attempts-1),robots_url=NULL,robots_body=NULL,robots_redirects=0,robots_delay_ms=2000 WHERE scan_id=p_scan_id; END IF;
  ELSIF v_kind='completed' THEN
    IF p_result->>'url' IS DISTINCT FROM v_q.url OR jsonb_typeof(p_result->'metadata') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'QUICK_INVALID_EVIDENCE'; END IF;
    SELECT w.workspace_id,s.id INTO v_workspace,v_source FROM public.websites w JOIN public.signal_feed_sources s ON s.workspace_id=w.workspace_id AND s.source_key='website:'||w.normalized_domain AND s.source_type='website' WHERE w.id=v_s.website_id;
    IF v_source IS NULL THEN RAISE EXCEPTION 'QUICK_SOURCE_NOT_FOUND'; END IF;
    INSERT INTO public.signal_observations(public_id,source_id,website_scan_id,source_event_id,severity,category,title,description,metadata)
    VALUES('obs_'||replace(gen_random_uuid()::text,'-',''),v_source,v_s.id,'website_scan:'||v_s.public_id,'low','website_content',left(coalesce(p_result->>'title','Website page'),250),left(coalesce(p_result->>'description','Measured HTML page'),5000),p_result->'metadata')
    ON CONFLICT DO NOTHING RETURNING id,public_id INTO v_observation,v_public;
    IF v_observation IS NULL THEN
      SELECT o.id,o.public_id INTO v_observation,v_public FROM public.signal_observations o WHERE o.source_id=v_source AND o.source_event_id='website_scan:'||v_s.public_id AND o.website_scan_id=v_s.id;
    END IF;
    IF v_observation IS NULL THEN RAISE EXCEPTION 'QUICK_OBSERVATION_NOT_RETAINED'; END IF;
    v_status:='completed';
  ELSIF v_kind IN ('retry','failed','skipped') THEN
    v_delay:=greatest(2000,least(3600000,coalesce((p_result->>'delay_ms')::integer,60000)));
    IF v_kind<>'retry' OR v_q.attempts>=3 THEN v_status:='failed'; END IF;
  ELSE RAISE EXCEPTION 'QUICK_INVALID_OUTCOME'; END IF;
  UPDATE public.website_crawl_hosts SET not_before=greatest(not_before,coalesce((p_result->>'not_before')::timestamptz,'-infinity'::timestamptz)),
    blocked=blocked OR coalesce((p_result->>'host_blocked')::boolean,false),lease_token=NULL,lease_until=NULL,
    next_allowed_at=clock_timestamp()+greatest(crawl_delay_ms,v_delay)*interval '1 millisecond' WHERE host_key=v_q.host_key AND lease_token=p_lease_token;
  IF v_status='queued' AND EXISTS(SELECT 1 FROM public.website_crawl_hosts h WHERE h.host_key=v_q.host_key AND (h.blocked OR h.not_before>=v_q.expires_at)) THEN v_status:='failed'; END IF;
  UPDATE public.website_quick_work SET status=v_status,lease_token=NULL,lease_until=NULL,last_result_token=p_lease_token,
    observation_id=coalesce(v_observation,observation_id),next_attempt_at=greatest(clock_timestamp()+v_delay*interval '1 millisecond',coalesce((p_result->>'not_before')::timestamptz,'-infinity'::timestamptz)) WHERE scan_id=p_scan_id;
  UPDATE public.website_scans SET status=v_status,completed_at=CASE WHEN v_status IN ('completed','failed') THEN clock_timestamp() ELSE NULL END,
    error_message=CASE WHEN v_status='failed' THEN 'Website content could not be retained: '||left(coalesce(p_result->>'reason','redirect limit or host access restriction'),300) ELSE NULL END WHERE id=p_scan_id;
  RETURN jsonb_build_object('status',CASE WHEN v_status='queued' THEN 'deferred' ELSE v_status END,'scanId',p_scan_id,'observationPublicId',v_public);
END;
$$;
REVOKE ALL ON FUNCTION public.next_website_quick_scan(),public.claim_website_quick_scan(UUID),public.finish_website_quick_scan(UUID,UUID,JSONB) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.next_website_quick_scan(),public.claim_website_quick_scan(UUID),public.finish_website_quick_scan(UUID,UUID,JSONB) TO service_role;

-- Fail closed if an old/misconfigured worker bypasses the coordinated claim.
-- Disabled by default; already-processing legacy work may drain normally.
CREATE FUNCTION public.require_website_quick_host_lease() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  IF NEW.status<>'processing' THEN RETURN NEW; END IF;
  IF coalesce((SELECT coordination_enabled FROM public.website_audit_runtime WHERE singleton),false) AND NOT EXISTS(
    SELECT 1 FROM public.website_quick_work q JOIN public.website_crawl_hosts h ON h.host_key=q.host_key
    WHERE q.scan_id=NEW.id AND q.status='processing' AND q.lease_until>clock_timestamp()
      AND h.lease_until>clock_timestamp() AND h.lease_token=q.lease_token
      AND q.lease_token::text=current_setting('alyoxa.quick_claim_token',true)
  ) THEN RAISE EXCEPTION 'QUICK_COORDINATED_CLAIM_REQUIRED'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER website_quick_requires_host_lease BEFORE INSERT OR UPDATE ON public.website_scans
FOR EACH ROW EXECUTE FUNCTION public.require_website_quick_host_lease();
REVOKE ALL ON FUNCTION public.require_website_quick_host_lease() FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
