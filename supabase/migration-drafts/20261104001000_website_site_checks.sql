-- REVIEW DRAFT: manual additive upgrade after 20261029001000. Do not auto-apply.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
DO $$ BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'SITE_CHECKS_REQUIRES_POSTGRES_OWNER';
  END IF;
  IF has_schema_privilege('anon','public','CREATE') OR has_schema_privilege('authenticated','public','CREATE') OR has_schema_privilege('service_role','public','CREATE') THEN
    RAISE EXCEPTION 'SITE_CHECKS_REQUIRES_TRUSTED_SCHEMA';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN ('claim_website_audit_page','finish_website_audit_page','claim_website_quick_scan','finish_website_quick_scan')
      AND p.prosecdef AND p.proowner='postgres'::regrole)<>4 THEN
    RAISE EXCEPTION 'SITE_CHECKS_REQUIRES_REVIEWED_PHASE1_FUNCTIONS';
  END IF;
END $$;
ALTER TABLE public.website_audit_runtime ADD COLUMN site_checks_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.website_crawl_hosts ADD COLUMN site_checks JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(site_checks)='object' AND octet_length(site_checks::text)<=262144);
ALTER TABLE public.website_audits ADD COLUMN site_checks JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(site_checks)='object' AND octet_length(site_checks::text)<=131072);
ALTER TABLE public.website_quick_work ADD COLUMN site_checks JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(site_checks)='object' AND octet_length(site_checks::text)<=262144);

-- Private helpers execute inside the existing fenced RPC transactions. No new
-- table grants, RLS policies, service-role DML, or browser API are introduced.
CREATE FUNCTION public.prepare_website_site_checks(p_claim JSONB, p_quick BOOLEAN) RETURNS JSONB
LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE
  v_state JSONB; v_cached JSONB; v_checks JSONB; v_check JSONB; v_pending JSONB;
  v_origin TEXT:=p_claim->>'origin'; v_root TEXT:=v_origin||'/sitemap.xml';
  v_robots TEXT:=v_origin||'/robots.txt'; v_url TEXT; v_candidate TEXT; v_domain TEXT;
  v_refs JSONB; v_key TEXT; v_id UUID:=(p_claim->>'audit_id')::uuid;
BEGIN
  IF p_claim IS NULL OR NOT (SELECT site_checks_enabled FROM public.website_audit_runtime WHERE singleton) THEN RETURN p_claim; END IF;
  IF p_quick THEN SELECT q.site_checks INTO v_state FROM public.website_quick_work q WHERE q.scan_id=v_id;
  ELSE SELECT a.site_checks INTO v_state FROM public.website_audits a WHERE a.id=v_id; END IF;
  SELECT h.site_checks INTO v_cached FROM public.website_crawl_hosts h WHERE h.lease_token=(p_claim->>'lease_token')::uuid;
  -- Snapshots last for the job; shared results expire after 24 hours. Only the
  -- current origin is imported. Pending redirects never enter the shared cache.
  FOR v_key,v_check IN SELECT key,value FROM jsonb_each(coalesce(v_cached,'{}')) LOOP
    IF v_key IN (v_robots,v_root) AND NOT v_state ? v_key
       AND (v_check->>'expires_at')::timestamptz>clock_timestamp() THEN
      v_state:=jsonb_set(v_state,ARRAY[v_key],v_check);
    END IF;
  END LOOP;
  IF p_claim->>'robots_body' IS NOT NULL AND NOT v_state ? v_robots THEN
    -- A pre-upgrade body has no measured HTTP status: label it honestly rather
    -- than fetching robots again or claiming an inferred 200.
    SELECT coalesce(jsonb_agg(ref ORDER BY n),'[]') INTO v_refs FROM (
      SELECT m[1] AS ref,n,sum(octet_length(m[1])) OVER (ORDER BY n) AS bytes
      FROM regexp_matches(p_claim->>'robots_body','(?im)^[ \t]*Sitemap:[ \t]*(https?://[^[:space:]]+)[ \t]*$', 'g') WITH ORDINALITY AS refs(m,n)
      WHERE char_length(m[1])<=2048
      LIMIT 10
    ) refs WHERE bytes<=8000;
    v_state:=jsonb_set(v_state,ARRAY[v_robots],jsonb_build_object('kind','robots','url',v_robots,'final_url',NULL,'http_status',NULL,'status','unverified_cache','sitemap_refs',v_refs));
  END IF;
  v_pending:=v_state->'_pending';
  IF p_claim->>'robots_body' IS NOT NULL THEN
    IF v_pending IS NULL OR left(v_pending->>'url',length(v_origin)+1)<>v_origin||'/' THEN
      v_url:=CASE WHEN NOT v_state ? v_root THEN v_root ELSE NULL END;
      IF v_url IS NULL AND NOT EXISTS (SELECT 1 FROM jsonb_each(v_state) e WHERE e.value->>'kind'='sitemap'
        AND e.key<>v_root AND left(e.key,length(v_origin)+1)=v_origin||'/') THEN
        FOR v_candidate IN SELECT jsonb_array_elements_text(coalesce(v_state->v_robots->'sitemap_refs','[]')) LIMIT 10 LOOP
          BEGIN
            SELECT c.canonical_url,c.normalized_domain INTO v_candidate,v_domain FROM public.canonicalize_website_url(v_candidate) c;
          EXCEPTION WHEN OTHERS THEN CONTINUE; END;
          IF split_part(v_candidate,'://',1)||'://'||v_domain=v_origin AND v_candidate<>v_root THEN
            IF NOT v_state ? v_candidate AND (v_cached->v_candidate->>'expires_at')::timestamptz>clock_timestamp() THEN
              v_state:=jsonb_set(v_state,ARRAY[v_candidate],v_cached->v_candidate);
            END IF;
            IF NOT v_state ? v_candidate AND v_state->v_root->>'final_url'=v_candidate THEN
              v_state:=jsonb_set(v_state,ARRAY[v_candidate],(v_state->v_root)||jsonb_build_object('url',v_candidate,'reused_from',v_root));
            END IF;
            IF NOT v_state ? v_candidate THEN v_url:=v_candidate; END IF;
            EXIT; -- At most one same-origin declaration, regardless of outcome.
          END IF;
        END LOOP;
      END IF;
      v_pending:=CASE WHEN v_url IS NULL THEN NULL ELSE jsonb_build_object('url',v_url,'fetch_url',v_url,'redirect_count',0,'visited','[]'::jsonb) END;
    END IF;
  ELSE v_pending:=NULL; END IF;
  v_state:=v_state-'_pending';
  IF v_pending IS NOT NULL THEN v_state:=jsonb_set(v_state,ARRAY['_pending'],v_pending); END IF;
  IF p_quick THEN UPDATE public.website_quick_work SET site_checks=v_state WHERE scan_id=v_id;
  ELSE UPDATE public.website_audits SET site_checks=v_state WHERE id=v_id; END IF;
  SELECT coalesce(jsonb_agg(value ORDER BY key),'[]') INTO v_checks FROM jsonb_each(v_state) WHERE key<>'_pending' AND left(key,length(v_origin)+1)=v_origin||'/';
  RETURN p_claim||jsonb_build_object('site_checks',v_checks)||CASE WHEN v_pending IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('site_resource',v_pending) END;
END;
$$;

CREATE FUNCTION public.record_website_site_check(p_id UUID,p_token UUID,p_result JSONB,p_quick BOOLEAN) RETURNS JSONB
LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_state JSONB; v_pending JSONB; v_check JSONB; v_key TEXT; v_url TEXT; v_domain TEXT; v_host TEXT; v_origin TEXT;
BEGIN
  IF NOT (SELECT site_checks_enabled FROM public.website_audit_runtime WHERE singleton) THEN RETURN p_result; END IF;
  IF p_quick THEN SELECT q.site_checks,split_part(q.url,'://',1)||'://'||c.normalized_domain INTO v_state,v_origin FROM public.website_quick_work q CROSS JOIN LATERAL public.canonicalize_website_url(q.url) c WHERE q.scan_id=p_id;
  ELSE SELECT a.site_checks,a.target_origin INTO v_state,v_origin FROM public.website_audits a WHERE a.id=p_id; END IF;
  SELECT h.host_key INTO v_host FROM public.website_crawl_hosts h WHERE h.lease_token=p_token AND h.lease_until>clock_timestamp();
  IF v_host IS NULL THEN RAISE EXCEPTION 'SITE_CHECK_STALE_HOST_LEASE'; END IF;
  IF p_result->>'kind'='site_resource' THEN
    v_pending:=v_state->'_pending'; v_check:=p_result->'resource'; v_key:=v_pending->>'url';
    IF v_key IS NULL OR jsonb_typeof(v_check) IS DISTINCT FROM 'object' OR v_check->>'kind' IS DISTINCT FROM 'sitemap'
      OR v_check->>'url' IS DISTINCT FROM v_key OR octet_length(v_check::text)>16384 THEN RAISE EXCEPTION 'SITE_CHECK_INVALID_RESULT'; END IF;
    IF p_result ? 'next_url' THEN
      SELECT c.canonical_url,c.normalized_domain INTO v_url,v_domain FROM public.canonicalize_website_url(p_result->>'next_url') c;
      IF split_part(v_url,'://',1)||'://'||v_domain<>v_origin OR (v_pending->>'redirect_count')::integer>=4
        OR v_url=v_pending->>'fetch_url' OR v_pending->'visited' ? v_url THEN RAISE EXCEPTION 'SITE_CHECK_INVALID_REDIRECT'; END IF;
      v_pending:=v_pending||jsonb_build_object('fetch_url',v_url,'redirect_count',(v_pending->>'redirect_count')::integer+1,'visited',(v_pending->'visited')||jsonb_build_array(v_pending->>'fetch_url'));
      v_state:=jsonb_set(v_state,ARRAY['_pending'],v_pending);
      v_check:=NULL;
    ELSE v_state:=v_state-'_pending'; END IF;
    -- Resource continuations use the existing release/backoff path, but do not
    -- consume the content retry budget or discover sitemap URLs as pages.
    IF p_quick THEN UPDATE public.website_quick_work SET attempts=greatest(0,attempts-1) WHERE scan_id=p_id;
    ELSE UPDATE public.website_audit_pages SET attempts=greatest(0,attempts-1) WHERE audit_id=p_id AND lease_token=p_token; END IF;
    p_result:=(p_result-'resource'-'next_url')||jsonb_build_object('kind','retry','reason','site_resource_check','delay_ms',2000);
  ELSE
    v_check:=p_result->'site_check'; v_key:=v_origin||'/robots.txt';
    IF v_check IS NOT NULL AND (jsonb_typeof(v_check) IS DISTINCT FROM 'object' OR v_check->>'kind' IS DISTINCT FROM 'robots' OR v_check->>'url' IS DISTINCT FROM v_key OR octet_length(v_check::text)>16384) THEN RAISE EXCEPTION 'SITE_CHECK_INVALID_ROBOTS_RESULT'; END IF;
  END IF;
  IF v_check IS NOT NULL THEN
    v_check:=v_check||jsonb_build_object('checked_at',clock_timestamp(),'expires_at',clock_timestamp()+interval '24 hours');
    v_state:=jsonb_set(v_state,ARRAY[v_key],v_check);
    -- Redirected robots may have a permit on another host. Preserve its finding
    -- in this job, but do not pollute that host's cache with unrelated origins.
    IF v_host=substring(v_origin from '^[^:]+://(.*)$') THEN
      IF v_check->>'kind'='sitemap' AND v_key<>v_origin||'/sitemap.xml' THEN
        -- Retain only one declared sitemap per origin in the shared cache, even
        -- if declarations change between jobs. Snapshots already in jobs remain.
        UPDATE public.website_crawl_hosts h SET site_checks=coalesce((SELECT jsonb_object_agg(e.key,e.value)
          FROM jsonb_each(h.site_checks) e WHERE left(e.key,length(v_origin)+1)<>v_origin||'/' OR e.key IN (v_origin||'/robots.txt',v_origin||'/sitemap.xml')),'{}') WHERE h.host_key=v_host;
      END IF;
      UPDATE public.website_crawl_hosts SET site_checks=jsonb_set(site_checks,ARRAY[v_key],v_check) WHERE host_key=v_host;
    END IF;
  END IF;
  IF p_quick THEN UPDATE public.website_quick_work SET site_checks=v_state WHERE scan_id=p_id;
  ELSE UPDATE public.website_audits SET site_checks=v_state WHERE id=p_id; END IF;
  RETURN p_result;
END;
$$;

-- Summary enrichment happens on NEW rows in the finalizer's transaction. No
-- retained observations are updated. Per-page evidence comes from the claim.
CREATE FUNCTION public.attach_website_site_checks() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_checks JSONB; v_evidence JSONB;
BEGIN
  IF NEW.category='website_audit_summary' AND (SELECT site_checks_enabled FROM public.website_audit_runtime WHERE singleton) THEN
    SELECT coalesce(jsonb_agg(e.value ORDER BY e.key),'[]') INTO v_checks FROM public.website_audits a
      CROSS JOIN LATERAL jsonb_each(a.site_checks) e WHERE a.id::text=NEW.metadata->>'audit_id' AND a.source_id=NEW.source_id AND e.key<>'_pending';
    SELECT coalesce(jsonb_agg(jsonb_build_object('id','site_resource_'||ordinality,'label',value->>'url','value',
      (value->>'status')||'; HTTP '||coalesce(value->>'http_status','not recorded')) ORDER BY ordinality),'[]') INTO v_evidence
      FROM jsonb_array_elements(v_checks) WITH ORDINALITY;
    NEW.metadata:=NEW.metadata||jsonb_build_object('site_checks',v_checks,'evidence',coalesce(NEW.metadata->'evidence','[]')||v_evidence);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER website_observation_site_checks BEFORE INSERT ON public.signal_observations
FOR EACH ROW EXECUTE FUNCTION public.attach_website_site_checks();
REVOKE ALL ON FUNCTION public.prepare_website_site_checks(JSONB,BOOLEAN),public.record_website_site_check(UUID,UUID,JSONB,BOOLEAN),public.attach_website_site_checks() FROM PUBLIC,anon,authenticated,service_role;

-- Existing RPC replacements below retain signatures, grants, locks, fencing,
-- observation transactions, host release and recovery behavior verbatim except
-- the private claim enrichment and fenced result recording calls.

CREATE OR REPLACE FUNCTION public.claim_website_audit_page(p_audit_id UUID DEFAULT NULL)
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
    RETURN public.prepare_website_site_checks(jsonb_build_object('audit_id', v_a.id, 'page_id', v_p.id, 'lease_token', v_token,
      'url', v_p.fetch_url, 'origin', v_a.target_origin, 'depth', v_p.depth, 'redirect_count', v_p.redirect_count,
      'robots_body', CASE WHEN v_h.robots_origin = v_a.target_origin AND v_h.robots_expires_at > clock_timestamp() THEN v_h.robots_body ELSE NULL END),false);
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_website_audit_page(p_page_id UUID, p_lease_token UUID, p_result JSONB)
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
  p_result:=public.record_website_site_check(v_a.id,p_lease_token,p_result,false);
  v_kind:=p_result->>'kind';
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

CREATE OR REPLACE FUNCTION public.claim_website_quick_scan(p_scan_id UUID) RETURNS JSONB
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
  RETURN public.prepare_website_site_checks(jsonb_build_object('audit_id',v_s.id,'page_id',v_s.id,'lease_token',v_token,'url',v_url,'origin',v_origin,'depth',0,'redirect_count',v_q.redirect_count,
    'robots_url',v_q.robots_url,'robots_body',coalesce(v_q.robots_body,CASE WHEN v_q.robots_url IS NULL AND v_h.robots_origin=v_origin AND v_h.robots_expires_at>clock_timestamp() THEN v_h.robots_body ELSE NULL END)),true);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_website_quick_scan(p_scan_id UUID,p_lease_token UUID,p_result JSONB) RETURNS JSONB
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
  p_result:=public.record_website_site_check(v_s.id,p_lease_token,p_result,true);
  -- Match the helper's row update in the already-loaded retry-budget snapshot.
  IF v_kind='site_resource' THEN v_q.attempts:=greatest(0,v_q.attempts-1); END IF;
  v_kind:=p_result->>'kind';
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

NOTIFY pgrst, 'reload schema';
COMMIT;
