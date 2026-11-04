-- DISPOSABLE DATABASE ONLY. Apply Phase 1 and site-check drafts first.
-- Real pgTAP integration tests; never run this fault/clock manipulation on production.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;
SELECT no_plan();
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

SELECT ok(NOT site_checks_enabled,'new resource checks default disabled') FROM public.website_audit_runtime;
SELECT ok(NOT has_function_privilege('service_role','public.record_website_site_check(uuid,uuid,jsonb,boolean)','EXECUTE'),'worker cannot bypass fenced finish RPC');
UPDATE public.website_audit_runtime SET creation_enabled=true,worker_enabled=true,coordination_enabled=true,site_checks_enabled=true;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
SELECT public.create_website_audit('30000000-0000-4000-8000-000000000001','https://audit-fixture.example.org/','40000000-0000-4000-8000-000000000091');
-- Exercise the real helper's cached-body regex, including both length boundaries.
SELECT public.prepare_website_site_checks(jsonb_build_object('audit_id',id,'origin',target_origin,'lease_token',gen_random_uuid(),
  'robots_body','Sitemap: https://audit-fixture.example.org/'||repeat('a',2048-length('https://audit-fixture.example.org/'))||E'\nSitemap: https://audit-fixture.example.org/'||repeat('b',2049-length('https://audit-fixture.example.org/'))||E'\nSitemap: https://audit-fixture.example.org/valid.xml'),false) FROM public.website_audits;
SELECT is(jsonb_array_length(site_checks->'https://audit-fixture.example.org/robots.txt'->'sitemap_refs'),2,'cached-body extraction accepts 2048 characters and rejects 2049') FROM public.website_audits;
SELECT is(char_length(site_checks->'https://audit-fixture.example.org/robots.txt'->'sitemap_refs'->>0),2048,'maximum-length reference remains intact, not truncated') FROM public.website_audits;
SELECT is(site_checks->'https://audit-fixture.example.org/robots.txt'->'sitemap_refs'->>1,'https://audit-fixture.example.org/valid.xml','valid reference after overlong declaration is retained') FROM public.website_audits;
UPDATE public.website_audits SET site_checks='{}';
CREATE TEMP TABLE resource_test_claim(value JSONB);
INSERT INTO resource_test_claim SELECT public.claim_website_audit_page();
SELECT is(value->'site_checks','[]'::jsonb,'new robots request has no invented status') FROM resource_test_claim;
SELECT public.finish_website_audit_page((value->>'page_id')::uuid,(value->>'lease_token')::uuid,
  '{"kind":"policy","robots_body":"User-agent: *\nSitemap: https://elsewhere.example.org/index.xml\nSitemap: https://audit-fixture.example.org/declared.xml\nSitemap: https://audit-fixture.example.org/never.xml","delay_ms":2000,"site_check":{"kind":"robots","url":"https://audit-fixture.example.org/robots.txt","final_url":"https://audit-fixture.example.org/robots.txt","http_status":200,"status":"available","sitemap_refs":["https://elsewhere.example.org/index.xml","https://audit-fixture.example.org/declared.xml","https://audit-fixture.example.org/never.xml"]}}') FROM resource_test_claim;
-- Test clocks only: normal production waits are deliberately bypassed locally.
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity';
UPDATE public.website_audit_pages SET next_attempt_at='-infinity';
UPDATE resource_test_claim SET value=public.claim_website_audit_page();
SELECT is(value->'site_resource'->>'url','https://audit-fixture.example.org/sitemap.xml','root sitemap is checked first') FROM resource_test_claim;
SELECT throws_ok($q$SELECT public.finish_website_audit_page((value->>'page_id')::uuid,gen_random_uuid(),'{"kind":"site_resource","resource":{}}') FROM resource_test_claim$q$,'P0001','AUDIT_STALE_LEASE','stale worker cannot write shared cache');
SELECT public.finish_website_audit_page((value->>'page_id')::uuid,(value->>'lease_token')::uuid,
  jsonb_build_object('kind','site_resource','next_url','https://audit-fixture.example.org/maps.xml','not_before',clock_timestamp()+interval '2 hours',
    'resource',jsonb_build_object('kind','sitemap','url','https://audit-fixture.example.org/sitemap.xml','http_status',302,'status','redirect'))) FROM resource_test_claim;
SELECT is(public.claim_website_audit_page(),NULL::jsonb,'resource redirect respects host-wide two-hour Retry-After');
SELECT is((SELECT attempts FROM public.website_audit_pages),0,'optional resources do not consume content retries');
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity',not_before='-infinity';
UPDATE public.website_audit_pages SET next_attempt_at='-infinity';
UPDATE resource_test_claim SET value=public.claim_website_audit_page();
SELECT is(value->'site_resource'->>'fetch_url','https://audit-fixture.example.org/maps.xml','redirect continuation is durable') FROM resource_test_claim;
SELECT public.finish_website_audit_page((value->>'page_id')::uuid,(value->>'lease_token')::uuid,
  '{"kind":"site_resource","resource":{"kind":"sitemap","url":"https://audit-fixture.example.org/sitemap.xml","final_url":"https://audit-fixture.example.org/maps.xml","http_status":404,"status":"missing"}}') FROM resource_test_claim;
SELECT lives_ok($q$SELECT public.finish_website_audit_page((value->>'page_id')::uuid,(value->>'lease_token')::uuid,'{"kind":"site_resource","resource":{}}') FROM resource_test_claim$q$,'replay returns committed result without duplicating cache mutation');
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity';
UPDATE public.website_audit_pages SET next_attempt_at='-infinity';
UPDATE resource_test_claim SET value=public.claim_website_audit_page();
SELECT is(value->'site_resource'->>'url','https://audit-fixture.example.org/declared.xml','selects first same-origin declaration, not external one') FROM resource_test_claim;
SELECT public.finish_website_audit_page((value->>'page_id')::uuid,(value->>'lease_token')::uuid,
  '{"kind":"site_resource","resource":{"kind":"sitemap","url":"https://audit-fixture.example.org/declared.xml","final_url":"https://audit-fixture.example.org/declared.xml","http_status":403,"status":"restricted"}}') FROM resource_test_claim;
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity';
UPDATE public.website_audit_pages SET next_attempt_at='-infinity';
UPDATE resource_test_claim SET value=public.claim_website_audit_page();
SELECT ok(NOT value ? 'site_resource','two sitemap findings allow normal HTML work; third declaration is never requested') FROM resource_test_claim;
SELECT is(jsonb_array_length(value->'site_checks'),3,'robots and both sitemap findings retained') FROM resource_test_claim;
SELECT public.finish_website_audit_page((value->>'page_id')::uuid,(value->>'lease_token')::uuid,
  jsonb_build_object('kind','completed','url','https://audit-fixture.example.org/','metadata',jsonb_build_object('site_checks',value->'site_checks','evidence','[]'::jsonb),
    'links','[{"url":"https://audit-fixture.example.org/about","priority":1}]'::jsonb)) FROM resource_test_claim;
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity';
UPDATE resource_test_claim SET value=public.claim_website_audit_page();
SELECT ok(NOT value ? 'site_resource','later audit page reuses checks without repeating requests') FROM resource_test_claim;
SELECT public.finish_website_audit_page((value->>'page_id')::uuid,(value->>'lease_token')::uuid,
  jsonb_build_object('kind','completed','url','https://audit-fixture.example.org/about','metadata',jsonb_build_object('site_checks',value->'site_checks','evidence','[]'::jsonb),'links','[]'::jsonb)) FROM resource_test_claim;
SELECT is(public.finalize_website_audit()->>'status','completed','missing or restricted sitemaps do not fail the audit');
SELECT is(jsonb_array_length(o.metadata->'site_checks'),3,'deterministic summary retains site resource evidence') FROM public.website_audits a JOIN public.signal_observations o ON o.id=a.summary_observation_id;
SELECT is((SELECT count(*) FROM public.signal_observations WHERE category='website_audit_page'),2::bigint,'only real HTML pages create page observations');

-- A second job (Quick Scan) reuses the host cache without more sitemap work.
INSERT INTO public.website_scans(public_id,website_id,status) SELECT 'site_checks_quick_test',website_id,'queued' FROM public.website_audits;
UPDATE public.website_crawl_hosts SET next_allowed_at='-infinity';
UPDATE resource_test_claim SET value=public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='site_checks_quick_test'));
SELECT ok(NOT value ? 'site_resource','Quick reuses fresh audit resource cache') FROM resource_test_claim;
SELECT is(jsonb_array_length(value->'site_checks'),3,'Quick receives actual cached robots/sitemap findings') FROM resource_test_claim;
SELECT public.finish_website_quick_scan((value->>'page_id')::uuid,(value->>'lease_token')::uuid,
  jsonb_build_object('kind','completed','url','https://audit-fixture.example.org/','metadata',jsonb_build_object('site_checks',value->'site_checks','evidence','[]'::jsonb))) FROM resource_test_claim;
SELECT is(jsonb_array_length(metadata->'site_checks'),3,'Quick observation retains shared findings') FROM public.signal_observations WHERE category='website_content';

-- A resource check at the final content attempt must not exhaust that budget.
SELECT public.create_website_audit('30000000-0000-4000-8000-000000000001','https://other-fixture.example.org/','40000000-0000-4000-8000-000000000092');
INSERT INTO public.website_scans(public_id,website_id,status) SELECT 'site_checks_quick_budget',website_id,'queued' FROM public.website_audits WHERE target_origin='https://other-fixture.example.org';
UPDATE public.website_crawl_hosts SET robots_origin='https://other-fixture.example.org',robots_body='',robots_expires_at=clock_timestamp()+interval '15 minutes',next_allowed_at='-infinity' WHERE host_key='other-fixture.example.org';
UPDATE resource_test_claim SET value=public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='site_checks_quick_budget'));
UPDATE public.website_quick_work SET attempts=3 WHERE scan_id=(SELECT (value->>'page_id')::uuid FROM resource_test_claim);
SELECT is(public.finish_website_quick_scan((value->>'page_id')::uuid,(value->>'lease_token')::uuid,
  '{"kind":"site_resource","resource":{"kind":"sitemap","url":"https://other-fixture.example.org/sitemap.xml","http_status":404,"status":"missing"}}')->>'status','deferred','optional resource does not fail Quick at its final content attempt') FROM resource_test_claim;
SELECT is(attempts,2,'Quick row and local finish snapshot retain the same content retry budget') FROM public.website_quick_work WHERE scan_id=(SELECT (value->>'page_id')::uuid FROM resource_test_claim);
SELECT * FROM finish();
ROLLBACK;

