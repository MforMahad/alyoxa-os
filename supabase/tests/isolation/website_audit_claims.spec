# PostgreSQL isolationtester specification. Disposable database only; draft must be reviewed/applied first.
# Every step raises an exception if concurrent ownership is possible. Do not execute against production.
setup
{
  UPDATE public.website_audit_runtime SET creation_enabled=true,worker_enabled=true,coordination_enabled=true;
  INSERT INTO auth.users(id,email) VALUES ('10000000-0000-4000-8000-000000000011','audit-isolation-a@example.org'),('10000000-0000-4000-8000-000000000012','audit-isolation-b@example.org');
  INSERT INTO public.users(id,public_id,auth_id,email) VALUES
    ('20000000-0000-4000-8000-000000000011','audit_isolation_a','10000000-0000-4000-8000-000000000011','audit-isolation-a@example.org'),
    ('20000000-0000-4000-8000-000000000012','audit_isolation_b','10000000-0000-4000-8000-000000000012','audit-isolation-b@example.org');
  INSERT INTO public.workspaces(id,public_id,owner_user_id,name,slug) VALUES
    ('30000000-0000-4000-8000-000000000011','audit_isolation_a','20000000-0000-4000-8000-000000000011','Isolation A','audit-isolation-a'),
    ('30000000-0000-4000-8000-000000000012','audit_isolation_b','20000000-0000-4000-8000-000000000012','Isolation B','audit-isolation-b');
  INSERT INTO public.workspace_memberships(public_id,workspace_id,user_id,role,status) VALUES
    ('audit_isolation_a','30000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000011','owner','active'),
    ('audit_isolation_b','30000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000012','owner','active');
  SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',false);
  SELECT public.create_website_audit('30000000-0000-4000-8000-000000000011','https://isolation-fixture.example.org/','40000000-0000-4000-8000-000000000011');
  SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',false);
  SELECT public.create_website_audit('30000000-0000-4000-8000-000000000012','https://isolation-fixture.example.org/','40000000-0000-4000-8000-000000000012');
  INSERT INTO public.website_scans(public_id,website_id,status)
    SELECT 'quick_audit_isolation',website_id,'queued' FROM public.website_audits WHERE idempotency_key='40000000-0000-4000-8000-000000000011';
}
teardown
{
  DELETE FROM public.website_audit_pages WHERE workspace_id IN ('30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000012');
  DELETE FROM public.website_audits WHERE workspace_id IN ('30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000012');
  DELETE FROM public.websites WHERE workspace_id IN ('30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000012');
  DELETE FROM public.signal_feed_sources WHERE workspace_id IN ('30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000012');
  DELETE FROM public.workspace_memberships WHERE workspace_id IN ('30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000012');
  DELETE FROM public.workspaces WHERE id IN ('30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000012');
  DELETE FROM public.users WHERE id IN ('20000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000012');
  DELETE FROM auth.users WHERE id IN ('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000012');
  DELETE FROM public.website_crawl_hosts WHERE host_key='isolation-fixture.example.org';
  UPDATE public.website_audit_runtime SET creation_enabled=false,worker_enabled=false,coordination_enabled=false;
}
session "worker1"
step "begin1" { BEGIN; }
step "claim1" { DO $$ BEGIN IF public.claim_website_audit_page((SELECT id FROM public.website_audits WHERE idempotency_key='40000000-0000-4000-8000-000000000011')) IS NULL THEN RAISE EXCEPTION 'Expected first claim'; END IF; END $$; }
step "commit1" { COMMIT; }
step "rollback1" { ROLLBACK; }
step "quick_claim1" { DO $$ BEGIN IF public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_audit_isolation')) IS NULL THEN RAISE EXCEPTION 'Expected Quick host claim'; END IF; END $$; }
session "worker2"
step "same_page" { DO $$ BEGIN IF public.claim_website_audit_page((SELECT id FROM public.website_audits WHERE idempotency_key='40000000-0000-4000-8000-000000000011')) IS NOT NULL THEN RAISE EXCEPTION 'Concurrent duplicate claim'; END IF; END $$; }
step "same_host" { DO $$ BEGIN IF public.claim_website_audit_page((SELECT id FROM public.website_audits WHERE idempotency_key='40000000-0000-4000-8000-000000000012')) IS NOT NULL THEN RAISE EXCEPTION 'Cross-tenant host concurrency'; END IF; END $$; }
step "after_commit" { DO $$ BEGIN IF public.claim_website_audit_page((SELECT id FROM public.website_audits WHERE idempotency_key='40000000-0000-4000-8000-000000000012')) IS NOT NULL THEN RAISE EXCEPTION 'Host lease lost after transaction commit'; END IF; END $$; }
step "after_rollback" { DO $$ BEGIN IF public.claim_website_audit_page((SELECT id FROM public.website_audits WHERE idempotency_key='40000000-0000-4000-8000-000000000012')) IS NULL THEN RAISE EXCEPTION 'Rolled-back claim blocked host'; END IF; END $$; }
step "quick_blocked" { DO $$ BEGIN IF public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_audit_isolation')) IS NOT NULL THEN RAISE EXCEPTION 'Quick overlapped audit lease'; END IF; END $$; }
step "quick_after_rollback" { DO $$ BEGIN
  UPDATE public.website_quick_work SET next_attempt_at='-infinity' WHERE scan_id=(SELECT id FROM public.website_scans WHERE public_id='quick_audit_isolation');
  IF public.claim_website_quick_scan((SELECT id FROM public.website_scans WHERE public_id='quick_audit_isolation')) IS NULL THEN RAISE EXCEPTION 'Quick did not acquire released host'; END IF; END $$; }
permutation "begin1" "claim1" "same_page" "same_host" "commit1" "after_commit"
permutation "begin1" "claim1" "same_page" "same_host" "rollback1" "after_rollback"
permutation "begin1" "quick_claim1" "same_host" "commit1" "after_commit"
permutation "begin1" "claim1" "quick_blocked" "rollback1" "quick_after_rollback"
