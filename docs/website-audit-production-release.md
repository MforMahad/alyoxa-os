# Full Website Audit — manual release candidate

This document supersedes the earlier Phase 1-only rollout/blocker proposals. No SQL, deployment, production access, Docker installation, secret modification, commit or push was performed. All audit creation, worker and coordination switches default disabled. The candidate is implemented; PostgreSQL execution, browser interaction and Netlify deployment are not verified by application tests.

## Final SQL and compatibility

Full SQL: `supabase/migration-drafts/20261029001000_website_audit_phase1.sql`. Apply this complete candidate once, not the earlier draft or either old `20261006000500` file. It remains outside auto-applied migrations intentionally.

The candidate adds tables, functions, indexes, supporting unique keys, RLS policies, the invoker progress view and a guarded Quick Scan trigger. It preserves existing submission RPCs, existing Quick Scan columns, source identities, observations and public homepage scan results. It never updates/deletes retained observations. The new Quick worker inserts observations and updates its existing scan status in one fenced transaction. The old Quick path remains active until its application switch is explicitly set.

Preconditions: PostgreSQL >=15 (repository config is 17); executor `postgres` with BYPASSRLS/superuser; required existing table SELECT/INSERT and scan UPDATE privileges; helper EXECUTE privileges; API roles cannot CREATE in public. Definer functions have pinned `pg_catalog,public,pg_temp` paths; authenticated can create only via owner/admin checks and read audits/pages through membership RLS. Only service_role can invoke worker mutations; it receives no direct DML on new operational tables. Runtime/host state remains private. No global grants or old RLS policies are weakened.

Supporting unique constraints touch existing websites, sources and observations and require locks. The SQL sets a five-second lock timeout and a 120-second statement timeout for application. A prerequisite/DDL failure rolls back the transaction. Stop and review the first error; do not bypass guards. If any earlier audit schema is already installed, the script deliberately fails and requires a separately reviewed upgrade diff. It is additive to the existing Quick-only schema, not an idempotent updater for previously applied drafts.

### Focused release review: trigger and supporting keys

Redirect scheduling review: `finish_website_audit_page` leaves a redirect's already-due `next_attempt_at` unchanged. This does not bypass pacing: redirects are restricted to the immutable origin, completion validates the existing page/host lease, host release retains crawl delay and the greatest Retry-After deadline, and every continuation claim checks host lease expiry, `next_allowed_at`, `not_before` and `blocked` before claiming the due page. No migration correction was justified. A focused rollback-only SQL regression now isolates each host gate while the redirect page remains due, then verifies continuation after the gates clear. PostgreSQL execution remains unverified.

The former `OLD.status='processing'` exemption was unsafe: processing-to-processing writes bypassed every lease check. Every write whose new status is processing now needs an unexpired matching page/host lease AND the current claim RPC's transaction-local token. `claim_website_quick_scan` sets this token only around its scan update and restores the previous setting afterward, including within a longer caller transaction. Fenced expired-lease reclamation still works. Legacy workers can finish/fail because transitions leaving processing remain permitted; the existing legacy worker does not require processing-state heartbeat writes. This guard is not a new security boundary against a malicious service-role/SQL operator who can forge settings; those callers are already trusted. Completion/failure fencing remains in the coordinated finish RPC, not a new blanket terminal-update restriction.

The tracked baseline has `id` primary keys on all three tables, but no equivalent `(id,workspace_id)` website/source or `(id,source_id)` observation key. PK uniqueness prevents duplicate composite pairs. It does not provide the exact composite referenced key required by these foreign keys. Production may have additional constraints/indexes absent from the repository: inspect before manual application, and stop for a reviewed adaptation if an equivalent key or conflicting name exists. The UNIQUE DDL is unchanged; no speculative production-index replacement/reuse was added.

Ordinary `ADD CONSTRAINT ... UNIQUE` takes ACCESS EXCLUSIVE, scans/builds its supporting index, blocks reads and writes, and retains the lock until this transaction commits. `lock_timeout='5s'` limits each wait to acquire a lock; it does NOT limit how long an acquired lock blocks traffic. `statement_timeout='120s'` is per statement, not a total transaction budget. An earlier table's lock remains held while later keys and schema objects are created. Schedule a reviewed maintenance window. For large/hot tables, stop and separately review phased `CREATE UNIQUE INDEX CONCURRENTLY` plus `ADD CONSTRAINT ... USING INDEX`; concurrent index creation cannot run inside this transaction, and attachment still needs a brief exclusive lock. UNIQUE cannot be made `NOT VALID` to avoid this work.

Additional read-only preflight (all indexes are shown so differently named equivalents cannot be missed):

```sql
SELECT t.oid::regclass AS table_name, x.relname AS index_name,
       c.conname, c.contype, c.condeferrable, c.condeferred,
       i.indisunique, i.indisprimary, i.indisvalid, i.indisready,
       i.indimmediate, i.indnkeyatts,
       pg_get_expr(i.indpred,i.indrelid) AS predicate,
       pg_get_expr(i.indexprs,i.indrelid) AS expressions,
       pg_get_indexdef(i.indexrelid) AS index_definition
FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid
JOIN pg_class x ON x.oid=i.indexrelid
LEFT JOIN pg_constraint c ON c.conindid=i.indexrelid AND c.conrelid=t.oid
WHERE t.oid IN ('public.websites'::regclass,'public.signal_feed_sources'::regclass,
               'public.signal_observations'::regclass)
ORDER BY t.oid::regclass::text,x.relname;

SELECT c.oid::regclass AS table_name,c.reltuples AS estimated_rows,
       pg_size_pretty(pg_table_size(c.oid)) AS table_size
FROM pg_class c WHERE c.oid IN ('public.websites'::regclass,
  'public.signal_feed_sources'::regclass,'public.signal_observations'::regclass);

SELECT l.relation::regclass AS relation,l.pid,l.mode,l.granted,
       a.xact_start,a.state,a.wait_event_type,a.wait_event
FROM pg_locks l LEFT JOIN pg_stat_activity a ON a.pid=l.pid
WHERE l.relation IN ('public.websites'::regclass,'public.signal_feed_sources'::regclass,
                     'public.signal_observations'::regclass)
ORDER BY l.relation,l.pid;

SELECT name,to_regclass('public.'||name) AS existing_index_relation
FROM unnest(ARRAY['audit_websites_tenant_key','audit_sources_tenant_key',
                  'audit_observations_source_key']) AS names(name);
SELECT conrelid::regclass,conname,pg_get_constraintdef(oid)
FROM pg_constraint WHERE conname IN ('audit_websites_tenant_key',
  'audit_sources_tenant_key','audit_observations_source_key');
```

Check live PKs are still valid; compare the composite key columns (including reverse column order), uniqueness, immediate/nondeferrable enforcement, validity and absence of predicates/expressions. Existing `(workspace_id,normalized_domain)`, `(workspace_id,source_key)` or `(source_id,source_event_id)` keys are not equivalent. The proposed constraint names also create index names: check those names are unused in public. Estimates/locks are a point-in-time observation, not a guarantee of installation duration.

## Implemented behavior

- `create_website_audit(uuid,text,uuid,integer DEFAULT 5)` accepts 1–100 admitted targets. Three-argument callers retain the default of five. URL and page limit are included in idempotency matching and the immutable configuration. Workspace admission remains two active audits maximum.
- Same-origin navigation discovery reuses the safe fetcher/extractor; fragments deduplicate, queries remain distinct, nav/header links have priority. Each page examines at most 200 anchors and returns at most 100 links/32KB of URL payload. Each audit retains at most 1,000 candidates, depth eight, and admits no more than its chosen page limit. Blocked/failed/alias targets consume admission slots. There is no artificial padding.
- Batches remain at most two steps, 20 seconds total, one bounded HTTP request per claimed step. Page and host leases last 120 seconds. Policy and redirect continuations are durable; three failed/abandoned attempts exhaust a page. Audit lifetime is 24 hours. Claims and finalization are fair/bounded and use SKIP LOCKED. Summary failure records SQLSTATE/backoff rather than falsely completing.
- Quick Scan has a separate private continuation row and remains homepage-only, including safe cross-origin HTML and robots redirects. Each target/redirect obtains the actual hostname's shared permit and public DNS/IP validation. It reuses real AI recommendations only when already configured; Full Audit never invokes an LLM. The legacy Quick path stays untouched behind the disabled coordination switch.
- Quick and audit acquisition both lock the same host row. A database trigger rejects new legacy/unfenced processing transitions when coordination is enabled. Old processing scans without continuation rows are not automatically reclaimed; both modes yield while those scans drain.
- Absolute `not_before` deadlines are separate from lease/crawl spacing. Both modes honor them after release, retry exhaustion and future requests, including HTTP-date and multi-hour values. Redirect continuations also wait for the originating response's deadline. Unrepresentable Retry-After or robots delay over 24 hours blocks the host for operator review. Deadlines beyond a job's lifetime exclude/fail its remaining work honestly without clearing global suppression. The longest observed crawl delay is retained conservatively until operator review.
- Signal entry has a Quick/Full selector, shown only after server-side activation. Full Audit shows recent history, immutable target, cap, queued/processing/completed/failed/excluded rows, per-page evidence and deterministic summary findings. Reads use the session client, active workspace validation and RLS. Failed reads are explicit errors. Raw audit pages remain excluded from AI context; compact summaries are included.

Navigation-only coverage is always partial, even if all admitted pages finish. No sitemap crawler, browser rendering or complete-site census is claimed. External-origin redirects are excluded for Full Audit; submit the final origin. Quick Scan can safely follow them. Current URL contracts still inherit standard-port and 92-character hostname restrictions. Dispatcher frequency is once per minute; a host normally yields roughly one page/step per tick, so 100 pages can take around two hours or longer with redirects, robots, contention or backoff. No latency guarantee was measured.

## Review before manual application (read-only checks)

The user/ChatGPT should execute these in the intended Cloud project's SQL editor, verify its project identity independently, and compare returned schema/helper definitions with the repository. These were not run here.

```sql
SELECT version(), current_user;
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='postgres';
SELECT to_regclass('public.website_audit_runtime'), to_regclass('public.website_audits'),
       to_regclass('public.website_quick_work'); -- all must be NULL for this first-install script
SELECT r, has_schema_privilege(r,'public','CREATE') AS can_create_public
FROM unnest(ARRAY['anon','authenticated','service_role']) AS r;
SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns WHERE table_schema='public'
AND table_name IN ('websites','website_scans','signal_feed_sources','signal_observations')
ORDER BY table_name,ordinal_position;
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'
AND tablename IN ('websites','website_scans','signal_feed_sources','signal_observations');
SELECT pg_get_functiondef('public.canonicalize_website_url(text)'::regprocedure);
SELECT pg_get_functiondef('public.has_workspace_role(uuid,text[])'::regprocedure);
SELECT pg_get_functiondef('public.current_application_user_id()'::regprocedure);
SELECT pg_get_functiondef('public.is_active_workspace_member(uuid)'::regprocedure);
SELECT status,count(*) FROM public.website_scans GROUP BY status;
```

Review effective table/helper permissions against the preflight at the top of the final SQL. Confirm the supporting constraint names and new function/table/trigger names are unused. Never run the fault-injection pgTAP/isolation suites against the existing production database: they are for disposable test data only. No passing PostgreSQL result exists yet; this remains a release risk requiring explicit reviewer acceptance before any live canary.

## Manual staged application and activation

1. Review the full SQL and working-tree changes, obtain the project's normal backup/recovery checkpoint, and approve application separately. Keep all app flags false/missing. The user manually applies the complete final SQL in one transaction in Supabase SQL editor. Confirm successful commit and schema cache reload. No jobs are created by the migration.
2. Inspect `SELECT * FROM public.website_audit_runtime;`: `creation_enabled`, `worker_enabled`, `coordination_enabled` must all be false. Confirm grants/owner/search_path and RLS using the new objects' definitions. Confirm existing Quick Scan submission still works while coordination is disabled; this is the backward-compatible path.
3. Separately approve/release the application and dispatcher code with all feature flags still disabled. This step is not performed by this task. Ensure every function instance is running the new code. Let existing processing Quick Scans drain; investigate stalled scans rather than automatically overwriting their status or evidence.
4. Activate coordinated Quick Scan first: the user first sets `ALYOXA_SHARED_CRAWL_ENABLED=true` for BOTH Next server and Netlify scheduled functions, confirms every dispatcher/server instance uses the coordinated code and legacy processing has drained, then sets only `coordination_enabled=true` in the runtime row. During this brief pre-enable window the new worker fails closed and retains queued jobs; do not enable the database guard while a legacy dispatcher can still mark rejected queued work failed. Audit creation/worker flags remain false. Transitional missing/mismatched switches fail closed; the new dispatcher retains uncertain queued work. Verify one homepage scan, including redirect/robots continuation, retained observation and real AI status. Do not leave the old dispatcher running with coordination enabled.
5. For an approved five-page canary, the user sets runtime `worker_enabled=true, creation_enabled=true` and server/function `ALYOXA_AUDIT_WORKER_ENABLED=true`, `ALYOXA_AUDIT_CREATION_ENABLED=true`, retaining the shared switch. The selector now appears. Owner/admin submits an operator-controlled site with a five-page limit. Record audit ID; monitor jobs/pages and logs. No activation settings were changed here.
6. Verify five completed page rows reference five distinct retained observations, the summary observation exists, its denominator is five, no pending pages remain, and repeat/reload does not duplicate observations. A smaller site must finish with its real smaller count. Confirm a second workspace cannot read the canary through authenticated API/UI. Do not use the service role for the tenant-isolation check.
7. Before broad use, manually exercise Quick-vs-audit contention on the same hostname, safe redirects, inaccessible pages, two-hour Retry-After, lease interruption/recovery and summary persistence. The supplied real PostgreSQL tests cover these, but have not run. Any permission/compilation/RLS problem is a stop condition. Increase page limits to 30, 50 and 100 only after reviewing the previous canary; 100+ candidate sites must stop at 100 admissions and report omissions/unknown coverage.

Useful post-activation read-only SQL (replace the example placeholder with the recorded canary audit UUID):

```sql
SELECT * FROM public.website_audit_progress WHERE id='<audit UUID>'::uuid;
SELECT url,final_url,status,admitted,reason,observation_id
FROM public.website_audit_pages WHERE audit_id='<audit UUID>'::uuid ORDER BY url;
SELECT a.status,a.summary_observation_id,o.metadata
FROM public.website_audits a LEFT JOIN public.signal_observations o ON o.id=a.summary_observation_id
WHERE a.id='<audit UUID>'::uuid;
SELECT category,count(*) FROM public.signal_observations
WHERE metadata->>'audit_id'='<audit UUID>' GROUP BY category;
SELECT host_key,lease_until,next_allowed_at,not_before,blocked FROM public.website_crawl_hosts;
```

The Cloud manual canary uses UI and read-only inspections. The existing CLI acceptance script intentionally refuses remote database/app URLs and must not be weakened for production. Application tests use transport/repository doubles; SQL compilation, concurrent transactions, live RLS, Netlify runtime and the browser remain unverified.

## Disable / rollback

Hide/stop new audits first: application creation flag false and database creation switch false. Disable audit dispatch/worker switches, allow in-flight fenced steps to finish or leases to expire, and preserve all tables and observations. Keep shared coordination enabled for Quick Scan; this avoids losing durable continuations or violating outstanding host deadlines. Do not drop the trigger/tables or clear backoff to force throughput.

A complete return to the old Quick path requires a separate drained cutover: pause dispatch, no active audits or Quick continuations, no live leases, and no outstanding host deadline/block that the legacy path would bypass. Then coordinate database/application switches before resuming. Never disable shared coordination while audits are still running. Host blocks/long crawl delays need evidence-based operator review; there is intentionally no automatic policy bypass or browser mutation API.

## Changed-file inventory for this implementation

- SQL: `supabase/migration-drafts/20261029001000_website_audit_phase1.sql`.
- Quick: `src/lib/os/signal/websiteScanProcessor.ts`, `websiteFetch.ts`, `audit/quickProcessor.ts`; `src/app/api/internal/website-scans/[scanId]/route.ts`; `netlify/functions/dispatch-website-scans.mts`.
- Audit: `src/lib/os/signal/audit/contracts.ts`, `backoff.ts`, `transport.ts`; `netlify/functions/dispatch-website-audits.mts`.
- Actions: `src/actions/signal/submitWebsiteAudit.ts`, `getWebsiteAuditStatus.ts`.
- UI: `src/components/os/workspace/WorkspaceSignalEntry.tsx`, `WebsiteAuditPanel.tsx`.
- Application tests: audit `actions`, `backoff`, `multiPage`, `quickProcessor`, `transport`, `migrationContract`, `flagsAndEndpoint` tests; existing `websiteScanRoute` and `websiteWorkspaceBoundary` tests.
- Database tests: `supabase/tests/website_audit_phase1.sql`; `supabase/tests/isolation/website_audit_claims.spec` (four permutations).
- Documentation: this file plus supersession notices in `website-audit-phase1.md` and `website-audit-database-validation.md`.

Earlier uncommitted diagnostic changes and old draft migrations were preserved. No historical migration was edited. No database test was executed or mocked result presented as a PostgreSQL result.

## Local verification results

- `npx.cmd jest --runInBand`: **49 suites, 252 tests passed** after the focused trigger review.
- `npx.cmd tsc --noEmit --incremental false`: **exit 0**.
- `npm.cmd run lint`: **exit 0, zero errors, three pre-existing warnings** in jest.config.js, src/app/app/page.tsx and OverviewSidebar.tsx.
- `node --check scripts/accept-five-page-audit.cjs`: passed.
- `git diff --check`: passed (Git emitted only existing line-ending conversion notices).
- PostgreSQL migration application/compilation, pgTAP, four isolation permutations, database-backed HTTP acceptance, deployed Netlify and interactive browser verification: **not run**.

SQL design references: [PostgreSQL trigger semantics](https://www.postgresql.org/docs/17/sql-createtrigger.html), [security-invoker view semantics](https://www.postgresql.org/docs/17/sql-createview.html).
