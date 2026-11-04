-- DATABASE INTEGRATION TESTS: disposable reviewed database only. NOT executed by Jest.
-- Apply the reviewed audit draft separately first. All test data/fault injection rolls back.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT no_plan();
UPDATE public.website_audit_runtime SET creation_enabled=false,worker_enabled=false,coordination_enabled=false;
SELECT is(public.claim_website_audit_page(),NULL::jsonb,'worker is disabled by database switch');

INSERT INTO auth.users(id,email) VALUES
('10000000-0000-4000-8000-000000000001','audit-a@example.org'),
('10000000-0000-4000-8000-000000000002','audit-b@example.org');
INSERT INTO public.users(id,public_id,auth_id,email) VALUES
('20000000-0000-4000-8000-000000000001','audit_test_user_a','10000000-0000-4000-8000-000000000001','audit-a@example.org'),
('20000000-0000-4000-8000-000000000002','audit_test_user_b','10000000-0000-4000-8000-000000000002','audit-b@example.org');
INSERT INTO public.workspaces(id,public_id,owner_user_id,name,slug) VALUES
('30000000-0000-4000-8000-000000000001','audit_test_workspace_a','20000000-0000-4000-8000-000000000001','Audit test A','audit-test-a'),
('30000000-0000-4000-8000-000000000002','audit_test_workspace_b','20000000-0000-4000-8000-000000000002','Audit test B','audit-test-b');
INSERT INTO public.workspace_memberships(public_id,workspace_id,user_id,role,status) VALUES
('audit_test_member_a','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','owner','active'),
('audit_test_member_b','30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','owner','active');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
SELECT throws_ok($$SELECT public.create_website_audit('30000000-0000-4000-8000-000000000001','https://audit-fixture.example.org/','40000000-0000-4000-8000-000000000001')$$,
  'P0001','AUDIT_CREATION_DISABLED','creation is disabled by default');
RESET ROLE;
UPDATE public.website_audit_runtime SET creation_enabled=true,worker_enabled=true,coordination_enabled=true;
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.create_website_audit('30000000-0000-4000-8000-000000000001','https://audit-fixture.example.org/','40000000-0000-4000-8000-000000000001')$$,'owner creates atomic audit');
SELECT lives_ok($$SELECT public.create_website_audit('30000000-0000-4000-8000-000000000001','https://audit-fixture.example.org/','40000000-0000-4000-8000-000000000001')$$,'idempotent creation retries');
SELECT is((SELECT count(*) FROM public.website_audits),1::bigint,'creation retry did not duplicate job');
SELECT is((SELECT count(*) FROM public.website_scans WHERE website_id IN (SELECT website_id FROM public.website_audits)),0::bigint,'audit creation did not queue Quick Scan');
SELECT throws_ok($$UPDATE public.website_audit_pages SET status='completed'$$,'42501',NULL,'browser cannot mutate page results');
SELECT throws_ok($$SELECT public.claim_website_audit_page()$$,'42501',NULL,'browser cannot claim worker jobs');
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SELECT is((SELECT count(*) FROM public.website_audits),0::bigint,'tenant B cannot see tenant A audit');
SELECT is((SELECT count(*) FROM public.website_audit_pages),0::bigint,'tenant B cannot see tenant A pages');
SELECT is((SELECT count(*) FROM public.website_audit_progress),0::bigint,'progress view respects RLS');
SELECT throws_ok($$SELECT public.create_website_audit('30000000-0000-4000-8000-000000000001','https://audit-fixture.example.org/','40000000-0000-4000-8000-000000000002')$$,'42501','AUDIT_NOT_AUTHORIZED','cross-tenant creation denied');
RESET ROLE;
SELECT ok(has_function_privilege('service_role','public.finish_website_audit_page(uuid,uuid,jsonb)','EXECUTE'),'service role can finalize pages through RPC');
SELECT throws_ok($$UPDATE public.website_audits SET start_url='https://changed.example.org/'$$,'P0001','AUDIT_IMMUTABLE_TARGET','even an owner session cannot rewrite target snapshot');

CREATE TEMP TABLE audit_test_state(key TEXT PRIMARY KEY, value JSONB);
INSERT INTO audit_test_state VALUES('first',public.claim_website_audit_page());
SELECT ok((SELECT value->>'page_id' IS NOT NULL FROM audit_test_state WHERE key='first'),'worker claims seed');
SELECT is(public.claim_website_audit_page(),NULL::jsonb,'second claim cannot own a leased page/host');
CREATE FUNCTION pg_temp.reject_audit_page() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.category='website_audit_page' THEN RAISE EXCEPTION 'TEST_PAGE_DENIED'; END IF; RETURN NEW; END $$;
CREATE TRIGGER test_page_failure BEFORE INSERT ON public.signal_observations FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_audit_page();
SELECT throws_ok($$SELECT public.finish_website_audit_page(
  (SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='first'),
  (SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='first'),
  '{"kind":"completed","url":"https://audit-fixture.example.org/","metadata":{}}')$$,'P0001','TEST_PAGE_DENIED','page insert failure rolls back state transition');
SELECT is((SELECT status FROM public.website_audit_pages),'processing','failed insert preserves recoverable lease');
SELECT is((SELECT count(*) FROM public.signal_observations WHERE category='website_audit_page'),0::bigint,'failed insert creates no evidence');
DROP TRIGGER test_page_failure ON public.signal_observations;

SELECT lives_ok($$SELECT public.finish_website_audit_page(
  (SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='first'),
  (SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='first'),
  '{"kind":"completed","url":"https://audit-fixture.example.org/","title":"Fixture home","description":"Measured test","metadata":{"evidence":[{"id":"title","value":""},{"id":"description","value":""}]},"links":[{"url":"https://audit-fixture.example.org/about.html","priority":10},{"url":"https://audit-fixture.example.org/about.html#section","priority":50},{"url":"https://audit-fixture.example.org/","priority":50}]}')$$,'evidence, discovery, completion commit together');
SELECT lives_ok($$SELECT public.finish_website_audit_page(
  (SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='first'),
  (SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='first'),
  '{"kind":"completed"}')$$,'lost response retry returns committed outcome');
SELECT is((SELECT count(*) FROM public.signal_observations WHERE category='website_audit_page' AND source_id=(SELECT source_id FROM public.website_audits LIMIT 1)),1::bigint,'completion retry retained exactly one observation');
SELECT is(public.finalize_website_audit(),NULL::jsonb,'audit cannot finish with pending pages');

UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='audit-fixture.example.org';
UPDATE public.website_crawl_hosts SET crawl_delay_ms=3600000 WHERE host_key='audit-fixture.example.org';
INSERT INTO audit_test_state VALUES('expired',public.claim_website_audit_page());
SELECT ok((SELECT next_allowed_at > clock_timestamp()+interval '59 minutes' FROM public.website_crawl_hosts WHERE host_key='audit-fixture.example.org'),'claim reserves long crawl delay even if worker crashes');
UPDATE public.website_audit_pages SET lease_until=clock_timestamp()-interval '1 second' WHERE id=(SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='expired');
UPDATE public.website_crawl_hosts SET lease_until=clock_timestamp()-interval '1 second',next_allowed_at='-infinity' WHERE host_key='audit-fixture.example.org';
INSERT INTO audit_test_state VALUES('recovered',public.claim_website_audit_page());
UPDATE public.website_crawl_hosts SET crawl_delay_ms=2000 WHERE host_key='audit-fixture.example.org';
SELECT isnt((SELECT value->>'lease_token' FROM audit_test_state WHERE key='expired'),(SELECT value->>'lease_token' FROM audit_test_state WHERE key='recovered'),'recovery assigns a new fencing token');
SELECT throws_ok($$SELECT public.finish_website_audit_page(
  (SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='expired'),
  (SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='expired'),
  '{"kind":"failed","reason":"stale"}')$$,'P0001','AUDIT_STALE_LEASE','stale worker cannot mutate recovered page');
SELECT lives_ok($$SELECT public.finish_website_audit_page(
  (SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='recovered'),
  (SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='recovered'),
  '{"kind":"completed","url":"https://audit-fixture.example.org/about.html","title":"About","description":"Measured test","metadata":{"evidence":[]},"links":[]}')$$,'new lease can persist recovered page');
SELECT is((SELECT completed FROM public.website_audit_progress),2::bigint,'progress counts committed page rows accurately');

CREATE FUNCTION pg_temp.reject_audit_summary() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.category='website_audit_summary' THEN RAISE EXCEPTION 'TEST_SUMMARY_DENIED'; END IF; RETURN NEW; END $$;
CREATE TRIGGER test_summary_failure BEFORE INSERT ON public.signal_observations FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_audit_summary();
SELECT is(public.finalize_website_audit()->>'status','finalization_retry','summary failure is durably deferred, not completed');
SELECT is((SELECT last_finalize_error_code FROM public.website_audits),'P0001','summary failure retains a safe error code');
SELECT is(public.finalize_website_audit(),NULL::jsonb,'backoff prevents poison-audit hot looping');
SELECT is((SELECT status FROM public.website_audits),'running','audit is not completed without retained summary');
SELECT ok((SELECT summary_observation_id IS NULL FROM public.website_audits),'summary pointer remains absent on failed transaction');
DROP TRIGGER test_summary_failure ON public.signal_observations;
UPDATE public.website_audits SET next_finalize_at='-infinity';
SELECT lives_ok($$SELECT public.finalize_website_audit()$$,'summary and terminal audit status commit together');
SELECT is((SELECT status FROM public.website_audits),'completed','exhausted two-page frontier completes without padding to five');
SELECT is(public.finalize_website_audit(),NULL::jsonb,'repeated finalization does not insert again');
SELECT is((SELECT (o.metadata->'findings'->>'missing_titles')::integer FROM public.website_audits a JOIN public.signal_observations o ON o.id=a.summary_observation_id),1,'summary uses raw title evidence, not fallback display title');
SELECT is((SELECT (o.metadata->'findings'->>'missing_descriptions')::integer FROM public.website_audits a JOIN public.signal_observations o ON o.id=a.summary_observation_id),1,'summary consumes extractor id/value evidence array');
SELECT is((SELECT count(*) FROM public.signal_observations WHERE category='website_audit_summary' AND source_id=(SELECT source_id FROM public.website_audits LIMIT 1)),1::bigint,'exactly one retained deterministic summary');
SELECT throws_ok($$UPDATE public.website_audit_pages SET workspace_id='30000000-0000-4000-8000-000000000002'$$,'23503',NULL,'composite foreign keys prevent cross-tenant page reassignment');

-- Admission cap and retry exhaustion, independent of the two-page completion test.
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
SELECT public.create_website_audit('30000000-0000-4000-8000-000000000001','https://audit-fixture.example.org/','40000000-0000-4000-8000-000000000003');
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='audit-fixture.example.org';
INSERT INTO audit_test_state VALUES('cap_seed',public.claim_website_audit_page());
SELECT public.finish_website_audit_page(
  (SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='cap_seed'),
  (SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='cap_seed'),
  jsonb_build_object('kind','completed','url','https://audit-fixture.example.org/','title','Cap seed','metadata','{}'::jsonb,
    'links',(SELECT jsonb_agg(jsonb_build_object('url','https://audit-fixture.example.org/page-'||n::text,'priority',10) ORDER BY n) FROM generate_series(1,12) AS n)));
SELECT is((SELECT admitted FROM public.website_audit_progress WHERE id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='cap_seed')),5::bigint,'database admits no more than five unique targets');
SELECT is((SELECT skipped FROM public.website_audit_progress WHERE id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='cap_seed')),8::bigint,'unselected candidates remain explicit page-limit exclusions');
SELECT is(public.claim_website_audit_page(),NULL::jsonb,'host spacing survives committed page transaction');
DO $$
DECLARE v_claim JSONB; v_audit UUID := (SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='cap_seed'); v_page UUID;
BEGIN
  FOR i IN 1..3 LOOP
    UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='audit-fixture.example.org';
    UPDATE public.website_audit_pages SET next_attempt_at='-infinity' WHERE audit_id=v_audit AND status='queued';
    v_claim := public.claim_website_audit_page(v_audit);
    IF v_claim IS NULL THEN RAISE EXCEPTION 'Expected retry claim'; END IF;
    IF v_page IS NOT NULL AND v_page<>(v_claim->>'page_id')::uuid THEN RAISE EXCEPTION 'Retry changed page'; END IF;
    v_page := (v_claim->>'page_id')::uuid;
    PERFORM public.finish_website_audit_page(v_page,(v_claim->>'lease_token')::uuid,'{"kind":"retry","reason":"http_503","delay_ms":60000}');
  END LOOP;
END $$;
SELECT is((SELECT failed FROM public.website_audit_progress WHERE id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='cap_seed')),1::bigint,'third retryable failure becomes terminal with accurate counters');

-- Remaining three admission slots: self-loop, known alias, and multi-hop loop.
DO $$ DECLARE c JSONB; v_original TEXT; v_audit UUID := (SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='cap_seed');
BEGIN
  UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity';
  c:=public.claim_website_audit_page(v_audit);
  PERFORM public.finish_website_audit_page((c->>'page_id')::uuid,(c->>'lease_token')::uuid,jsonb_build_object('kind','redirect','url',c->>'url'));
  UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity';
  c:=public.claim_website_audit_page(v_audit);
  PERFORM public.finish_website_audit_page((c->>'page_id')::uuid,(c->>'lease_token')::uuid,'{"kind":"redirect","url":"https://audit-fixture.example.org/"}');
  UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity';
  c:=public.claim_website_audit_page(v_audit); v_original:=c->>'url';
  PERFORM public.finish_website_audit_page((c->>'page_id')::uuid,(c->>'lease_token')::uuid,'{"kind":"redirect","url":"https://audit-fixture.example.org/hop"}');
  UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity';
  c:=public.claim_website_audit_page(v_audit);
  PERFORM public.finish_website_audit_page((c->>'page_id')::uuid,(c->>'lease_token')::uuid,jsonb_build_object('kind','redirect','url',v_original));
END $$;
SELECT is((SELECT count(*) FROM public.website_audit_pages WHERE reason='redirect_loop'),2::bigint,'self and multi-hop redirect loops terminate before redirect cap');
SELECT is((SELECT count(*) FROM public.website_audit_pages WHERE reason='redirect_alias'),1::bigint,'known retained redirect target skips redundant fetch');
SELECT is(public.finalize_website_audit()->>'status','partial','blocked and capped admission slots never imply full coverage');

-- Expired audits have no pending pages after a claim sweep, and can finalize.
CREATE FUNCTION pg_temp.expire_new_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.expires_at:=clock_timestamp()-interval '1 second'; RETURN NEW; END $$;
CREATE TRIGGER test_expire_audit BEFORE INSERT ON public.website_audits FOR EACH ROW EXECUTE FUNCTION pg_temp.expire_new_audit();
INSERT INTO audit_test_state VALUES('expiry',public.create_website_audit('30000000-0000-4000-8000-000000000001','https://expired-fixture.example.org/','40000000-0000-4000-8000-000000000005'));
DROP TRIGGER test_expire_audit ON public.website_audits;
SELECT is(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='expiry')),NULL::jsonb,'expired audit never fetches');
SELECT is((SELECT count(*) FROM public.website_audit_pages WHERE audit_id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='expiry') AND status IN ('discovered','queued','processing')),0::bigint,'expired audit has no stuck pending page');
CREATE TRIGGER test_summary_failure BEFORE INSERT ON public.signal_observations FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_audit_summary();
SELECT is(public.finalize_website_audit()->>'status','finalization_retry','expired audit still requires retained summary');
DROP TRIGGER test_summary_failure ON public.signal_observations;
INSERT INTO audit_test_state VALUES('fair',public.create_website_audit('30000000-0000-4000-8000-000000000001','https://fair-fixture.example.org/','40000000-0000-4000-8000-000000000006'));
INSERT INTO audit_test_state VALUES('fair_claim',public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='fair')));
SELECT public.finish_website_audit_page((SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='fair_claim'),(SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='fair_claim'),'{"kind":"skipped","reason":"robots_disallow"}');
SELECT is(public.finalize_website_audit()->>'audit_id',(SELECT value->>'audit_id' FROM audit_test_state WHERE key='fair'),'poison summary does not starve newer ready audits');
UPDATE public.website_audits SET next_finalize_at='-infinity' WHERE id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='expiry');
SELECT is(public.finalize_website_audit()->>'status','failed','expired audit eventually finalizes after storage recovers');
SELECT ok(NOT has_table_privilege('service_role','public.website_audit_pages','INSERT'),'service role uses fenced RPC, not direct page writes');
SELECT ok((SELECT bool_and(pg_get_userbyid(proowner)='postgres' AND proconfig @> ARRAY['search_path=pg_catalog, public, pg_temp']) FROM pg_proc WHERE oid IN ('public.create_website_audit(uuid,text,uuid,integer)'::regprocedure,'public.finish_website_audit_page(uuid,uuid,jsonb)'::regprocedure)),'definers have trusted owner and pinned search path');

-- Exhausted leases become terminal; an expired host token cannot strand later jobs.
INSERT INTO audit_test_state VALUES('exhausted',public.create_website_audit('30000000-0000-4000-8000-000000000001','https://expired-fixture.example.org/','40000000-0000-4000-8000-000000000007'));
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='expired-fixture.example.org';
INSERT INTO audit_test_state VALUES('exhausted_claim',public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='exhausted')));
UPDATE public.website_audit_pages SET attempts=3,lease_until=clock_timestamp()-interval '1 second' WHERE id=(SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='exhausted_claim');
UPDATE public.website_crawl_hosts SET lease_until=clock_timestamp()-interval '1 second',next_allowed_at='-infinity' WHERE host_key='expired-fixture.example.org';
SELECT is(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='exhausted')),NULL::jsonb,'expired third attempt is not claimed a fourth time');
SELECT is(public.finalize_website_audit()->>'status','failed','exhausted processing lease eventually finalizes');
INSERT INTO audit_test_state VALUES('host_reuse',public.create_website_audit('30000000-0000-4000-8000-000000000001','https://expired-fixture.example.org/','40000000-0000-4000-8000-000000000008'));
INSERT INTO audit_test_state VALUES('host_reuse_claim',public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='host_reuse')));
SELECT ok((SELECT value->>'lease_token' IS NOT NULL FROM audit_test_state WHERE key='host_reuse_claim'),'new job can replace expired host lease');
-- Exercise the actual API role, not only the migration owner's privileges.
SELECT set_config('audit_test.page_id',(SELECT value->>'page_id' FROM audit_test_state WHERE key='host_reuse_claim'),true);
SELECT set_config('audit_test.lease_token',(SELECT value->>'lease_token' FROM audit_test_state WHERE key='host_reuse_claim'),true);
SET LOCAL ROLE service_role;
SELECT public.finish_website_audit_page(current_setting('audit_test.page_id')::uuid,current_setting('audit_test.lease_token')::uuid,
  '{"kind":"policy","robots_body":"User-agent: *\nCrawl-delay: 2.0001","delay_ms":2001}');
RESET ROLE;
SELECT is((SELECT crawl_delay_ms FROM public.website_crawl_hosts WHERE host_key='expired-fixture.example.org'),2001,'service-role RPC retains rounded fractional policy delay without direct table privileges');
SELECT ok(NOT has_function_privilege('anon','public.create_website_audit(uuid,text,uuid,integer)','EXECUTE'),'anonymous cannot create audits');
SELECT ok(NOT has_function_privilege('authenticated','public.finish_website_audit_page(uuid,uuid,jsonb)','EXECUTE'),'browser cannot finish fenced pages');
UPDATE public.website_audit_runtime SET coordination_enabled=false;
INSERT INTO public.website_scans(public_id,website_id,status)
SELECT 'audit_test_quick_processing',website_id,'processing' FROM public.website_audits WHERE id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='host_reuse');
UPDATE public.website_audit_runtime SET coordination_enabled=true;
SELECT throws_ok($$UPDATE public.website_scans SET status='processing' WHERE public_id='audit_test_quick_processing'$$,'P0001','QUICK_COORDINATED_CLAIM_REQUIRED','legacy drain cannot restart processing without a lease');
SELECT lives_ok($$UPDATE public.website_scans SET status='failed',completed_at=clock_timestamp() WHERE public_id='audit_test_quick_processing'$$,'legacy processing may drain to a terminal status');
-- Restore the historical fixture only while coordination is disabled.
UPDATE public.website_audit_runtime SET coordination_enabled=false;
UPDATE public.website_scans SET status='processing',completed_at=NULL WHERE public_id='audit_test_quick_processing';
UPDATE public.website_audit_runtime SET coordination_enabled=true;
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='expired-fixture.example.org';
UPDATE public.website_audit_pages SET next_attempt_at='-infinity' WHERE audit_id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='host_reuse');
SELECT is(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='host_reuse')),NULL::jsonb,'audit yields to an already-processing Quick Scan');
DELETE FROM public.website_scans WHERE public_id='audit_test_quick_processing';
SELECT ok(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='host_reuse')) IS NOT NULL,'audit resumes once observed Quick Scan is absent');

-- Real database retention acceptance, not an HTTP/extractor test. These synthetic
-- measured outcomes exercise five INSERTs and one summary transaction on PostgreSQL.
INSERT INTO audit_test_state VALUES('five_pages',public.create_website_audit('30000000-0000-4000-8000-000000000001','https://five-page-fixture.example.org/','40000000-0000-4000-8000-000000000009'));
DO $$
DECLARE v_claim JSONB; v_result JSONB; v_audit UUID := (SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='five_pages');
BEGIN
  FOR i IN 1..5 LOOP
    -- Simulate elapsed host spacing in this rollback-only fixture; no network I/O.
    UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='five-page-fixture.example.org';
    v_claim := public.claim_website_audit_page(v_audit);
    IF v_claim IS NULL THEN RAISE EXCEPTION 'Expected five-page claim %',i; END IF;
    v_result := jsonb_build_object('kind','completed','url',v_claim->>'url','title','Measured SQL fixture',
      'metadata',jsonb_build_object('evidence',jsonb_build_array(jsonb_build_object('id','title','value','Measured SQL fixture'),jsonb_build_object('id','description','value',''))),
      'links',CASE WHEN i=1 THEN (SELECT jsonb_agg(jsonb_build_object('url','https://five-page-fixture.example.org/page-'||n::text,'priority',10)) FROM generate_series(1,4) AS n) ELSE '[]'::jsonb END);
    PERFORM public.finish_website_audit_page((v_claim->>'page_id')::uuid,(v_claim->>'lease_token')::uuid,v_result);
    PERFORM public.finish_website_audit_page((v_claim->>'page_id')::uuid,(v_claim->>'lease_token')::uuid,v_result);
  END LOOP;
END $$;
SELECT is((SELECT completed FROM public.website_audit_progress WHERE id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='five_pages')),5::bigint,'five completed page rows have retained observations');
SELECT is(public.finalize_website_audit((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='five_pages'))->>'status','completed','five-page audit completes only with a retained summary');
SELECT is(public.finalize_website_audit((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='five_pages')),NULL::jsonb,'five-page finalization retry is idempotent');
SELECT is((SELECT count(*) FROM public.signal_observations WHERE metadata->>'audit_id'=(SELECT value->>'audit_id' FROM audit_test_state WHERE key='five_pages') AND category='website_audit_page'),5::bigint,'exactly five observations despite page response retries');
SELECT is((SELECT count(*) FROM public.signal_observations WHERE metadata->>'audit_id'=(SELECT value->>'audit_id' FROM audit_test_state WHERE key='five_pages') AND category='website_audit_summary'),1::bigint,'exactly one deterministic summary');
SELECT is((SELECT (metadata->'findings'->>'denominator_completed_pages')::integer FROM public.signal_observations WHERE metadata->>'audit_id'=(SELECT value->>'audit_id' FROM audit_test_state WHERE key='five_pages') AND category='website_audit_summary'),5,'summary denominator uses all five retained pages');

-- Larger admissions exercise the actual RPCs and retained summaries, not mocks.
DO $$
DECLARE v_limit INTEGER; v_audit UUID; c JSONB; r JSONB; v_done INTEGER;
BEGIN
  FOREACH v_limit IN ARRAY ARRAY[30,50,100,125] LOOP
    v_audit:=(public.create_website_audit('30000000-0000-4000-8000-000000000001','https://large-fixture.example.org/',gen_random_uuid(),least(100,v_limit))->>'audit_id')::uuid;
    FOR i IN 1..least(100,v_limit) LOOP
      UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='large-fixture.example.org';
      c:=public.claim_website_audit_page(v_audit);
      IF c IS NULL THEN RAISE EXCEPTION 'Missing claim at page % of %',i,v_limit; END IF;
      r:=jsonb_build_object('kind','completed','url',c->>'url','title','Measured SQL fixture','metadata',jsonb_build_object('evidence',jsonb_build_array(jsonb_build_object('id','title','value','Page'))),
        'links',CASE WHEN i=1 THEN (SELECT jsonb_agg(jsonb_build_object('url','https://large-fixture.example.org/page-'||n::text,'priority',10)) FROM generate_series(1,v_limit-1) AS n) ELSE '[]'::jsonb END);
      PERFORM public.finish_website_audit_page((c->>'page_id')::uuid,(c->>'lease_token')::uuid,r);
    END LOOP;
    IF public.finalize_website_audit(v_audit)->>'status' IS DISTINCT FROM CASE WHEN v_limit>100 THEN 'partial' ELSE 'completed' END THEN RAISE EXCEPTION 'Large audit failed finalization'; END IF;
    SELECT count(*) INTO v_done FROM public.website_audit_pages WHERE audit_id=v_audit AND status='completed' AND observation_id IS NOT NULL;
    IF v_done<>least(100,v_limit) THEN RAISE EXCEPTION 'Large audit lost observations'; END IF;
    IF v_limit=125 AND (SELECT count(*) FROM public.website_audit_pages WHERE audit_id=v_audit AND reason='page_limit')<>25 THEN RAISE EXCEPTION 'Large audit lost excluded pages'; END IF;
  END LOOP;
END $$;
SELECT pass('30, 50, 100 and 125 candidate pages respect retention, limits and partial finalization');

-- Cross-mode host ownership, stale leases and two-hour Retry-After suppression.
INSERT INTO audit_test_state VALUES('shared_a',public.create_website_audit('30000000-0000-4000-8000-000000000001','https://shared-fixture.example.org/',gen_random_uuid()));
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
INSERT INTO audit_test_state VALUES('shared_b',public.create_website_audit('30000000-0000-4000-8000-000000000002','https://shared-fixture.example.org/',gen_random_uuid()));
INSERT INTO public.website_scans(public_id,website_id,status) SELECT 'quick_shared_test',website_id,'queued' FROM public.website_audits WHERE id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_a');
SELECT throws_ok($$UPDATE public.website_scans SET status='processing' WHERE public_id='quick_shared_test'$$,'P0001','QUICK_COORDINATED_CLAIM_REQUIRED','legacy claim cannot race audits after coordination activation');
INSERT INTO audit_test_state VALUES('quick_first',public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_shared_test')));
SELECT ok((SELECT value IS NOT NULL FROM audit_test_state WHERE key='quick_first'),'Quick acquires host atomically');
SELECT throws_ok($$UPDATE public.website_scans SET status='processing' WHERE public_id='quick_shared_test'$$,'P0001','QUICK_COORDINATED_CLAIM_REQUIRED','valid stored lease alone does not authorize a direct processing rewrite');
SELECT is(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_b')),NULL::jsonb,'cross-tenant audit cannot overlap Quick');
UPDATE public.website_quick_work SET lease_until=clock_timestamp()-interval '1 second' WHERE scan_id=(SELECT id FROM public.website_scans WHERE public_id='quick_shared_test');
UPDATE public.website_crawl_hosts SET lease_until=clock_timestamp()-interval '1 second',next_allowed_at='-infinity' WHERE host_key='shared-fixture.example.org';
SELECT throws_ok($$UPDATE public.website_scans SET started_at=clock_timestamp() WHERE public_id='quick_shared_test'$$,'P0001','QUICK_COORDINATED_CLAIM_REQUIRED','expired processing row does not bypass host fencing');
INSERT INTO audit_test_state VALUES('quick_recovered',public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_shared_test')));
SELECT throws_ok($$SELECT public.finish_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_shared_test'),(SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='quick_first'),'{"kind":"failed","reason":"stale"}')$$,'P0001','QUICK_STALE_LEASE','late Quick worker cannot finish recovered scan');
SELECT public.finish_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_shared_test'),(SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='quick_recovered'),jsonb_build_object('kind','retry','reason','http_429','delay_ms',3600000,'not_before',clock_timestamp()+interval '2 hours'));
SELECT ok((SELECT not_before>clock_timestamp()+interval '119 minutes' FROM public.website_crawl_hosts WHERE host_key='shared-fixture.example.org'),'full two-hour deadline survives Quick release');
SELECT is(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_b')),NULL::jsonb,'audit respects Quick host Retry-After');
SELECT is(public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_shared_test')),NULL::jsonb,'Quick respects retained host deadline');
-- Simulate elapsed time, then reverse the ownership direction.
UPDATE public.website_crawl_hosts SET not_before='-infinity',next_allowed_at='-infinity' WHERE host_key='shared-fixture.example.org';
INSERT INTO audit_test_state VALUES('audit_shared_claim',public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_b')));
UPDATE public.website_quick_work SET next_attempt_at='-infinity' WHERE scan_id=(SELECT id FROM public.website_scans WHERE public_id='quick_shared_test');
SELECT is(public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_shared_test')),NULL::jsonb,'Quick cannot overlap an audit-owned host');
SELECT public.finish_website_audit_page((SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='audit_shared_claim'),(SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='audit_shared_claim'),jsonb_build_object('kind','retry','reason','http_503','not_before',clock_timestamp()+interval '2 hours'));
SELECT is(public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_shared_test')),NULL::jsonb,'Quick respects audit host Retry-After');

-- Redirect continuation deliberately retains an already-due page timestamp.
-- Independently prove that crawl spacing, host ownership and Retry-After still
-- gate the next claim. Simulate elapsed time only in this rollback-only fixture.
UPDATE public.website_crawl_hosts SET not_before='-infinity',next_allowed_at='-infinity',crawl_delay_ms=60000 WHERE host_key='shared-fixture.example.org';
UPDATE public.website_audit_pages SET next_attempt_at='-infinity' WHERE audit_id=(SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_b') AND status='queued';
INSERT INTO audit_test_state VALUES('redirect_pacing',public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_b')));
SELECT ok((SELECT value IS NOT NULL FROM audit_test_state WHERE key='redirect_pacing'),'redirect pacing fixture owns a page and host');
SELECT public.finish_website_audit_page((SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='redirect_pacing'),(SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='redirect_pacing'),'{"kind":"redirect","url":"https://shared-fixture.example.org/redirect-target"}');
SELECT ok((SELECT status='queued' AND fetch_url='https://shared-fixture.example.org/redirect-target' AND next_attempt_at<=clock_timestamp() AND lease_token IS NULL AND lease_until IS NULL FROM public.website_audit_pages WHERE id=(SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='redirect_pacing')),'redirect queues its target with a due page timestamp and releases its page lease');
SELECT ok((SELECT lease_token IS NULL AND lease_until IS NULL AND next_allowed_at>clock_timestamp()+interval '50 seconds' FROM public.website_crawl_hosts WHERE host_key='shared-fixture.example.org'),'redirect releases its host lease while retaining crawl spacing');
SELECT is(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_b')),NULL::jsonb,'due redirect cannot bypass host crawl delay');
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='shared-fixture.example.org';
INSERT INTO audit_test_state VALUES('redirect_pacing_next',public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_b')));
SELECT ok((SELECT value->>'url'='https://shared-fixture.example.org/redirect-target' AND value->>'lease_token' IS DISTINCT FROM (SELECT value->>'lease_token' FROM audit_test_state WHERE key='redirect_pacing') FROM audit_test_state WHERE key='redirect_pacing_next'),'elapsed crawl delay allows continuation with a fresh lease');
-- Remove spacing as a confounder: a live shared host lease alone still blocks.
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='shared-fixture.example.org';
SELECT is(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_a')),NULL::jsonb,'another audit cannot overlap the redirect continuation host lease');
SELECT public.finish_website_audit_page((SELECT (value->>'page_id')::uuid FROM audit_test_state WHERE key='redirect_pacing_next'),(SELECT (value->>'lease_token')::uuid FROM audit_test_state WHERE key='redirect_pacing_next'),jsonb_build_object('kind','redirect','url','https://shared-fixture.example.org/final-target','not_before',clock_timestamp()+interval '2 hours'));
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity' WHERE host_key='shared-fixture.example.org';
SELECT ok((SELECT not_before>clock_timestamp()+interval '119 minutes' FROM public.website_crawl_hosts WHERE host_key='shared-fixture.example.org'),'redirect retains full two-hour shared Retry-After deadline');
SELECT is(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_b')),NULL::jsonb,'due redirect cannot bypass Retry-After even after spacing is elapsed');
UPDATE public.website_crawl_hosts SET not_before='-infinity' WHERE host_key='shared-fixture.example.org';
SELECT ok(public.claim_website_audit_page((SELECT (value->>'audit_id')::uuid FROM audit_test_state WHERE key='shared_b')) IS NOT NULL,'redirect resumes when every shared host gate is satisfied');
SELECT * FROM finish();
ROLLBACK;
