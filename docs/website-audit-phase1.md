# Current release candidate

The original Phase 1 notes below are historical. For the implemented 1–100 page limits, shared Quick/Audit coordination, long host backoff and current activation order, use [the production release guide](website-audit-production-release.md). All switches remain disabled by default; no live SQL or deployment has occurred.

# Recoverable five-page audit — Phase 1 review package

## Status and boundaries

Implementation is separate from Quick Scan and disabled by default. No SQL, live database connection, migration execution, deployment, push or commit was performed. Database integration suites are supplied but **not executed**. Local Jest tests exercise worker/application contracts and fixture extraction; they do not establish that the draft compiles or that PostgreSQL concurrency/RLS behaves correctly. Database review and disposable-database tests are release gates.

**Full migration SQL:** `supabase/migration-drafts/20261029001000_website_audit_phase1.sql` is the complete, unabridged transactional SQL artifact. It is intentionally outside `supabase/migrations/`, so a routine migration command cannot apply it. No historical migration or pre-existing untracked draft was edited or used as its source. Do not blindly reset/apply the existing migration folder: the two old `00500` drafts still need independent handling.

## Database contract

| Object | Contract |
| --- | --- |
| `website_audit_runtime` | Singleton creation/worker switches, both false. Browser and service-role direct table access denied. Database owner controls activation. |
| `website_audits` | Immutable workspace, website, source, requester, idempotency key, full start URL, exact target origin, hostname, config and expiry. Five-page creation cap; schema permits 1–100 for a separately reviewed future expansion. Maximum two active audits per workspace. 24-hour lifetime. |
| `website_audit_pages` | SHA-256 URL identity, requested URL, mutable redirect destination, bounded depth/priority, admitted state, queue/result status, attempts, 120-second lease/token, last-result token, observation reference, terminal reason. At most 100 discovered candidates and five admitted targets. |
| `website_crawl_hosts` | Shared hostname lease and spacing across audit tenants. One network operation per claim; at least two seconds between operations, enlarged by crawl-delay/backoff. Robots cache is origin-specific. No browser read access. |
| `website_audit_progress` | Security-invoker view computes counters from committed rows. No retry-sensitive increment-only counters. |
| Existing `signal_observations` | One retained row per analyzed page and one final summary, with stable source-event keys. No new raw-HTML store or AI provider calls. |

New composite keys on existing website/source/observation tables support tenant-safe FKs. A page's source/workspace must match its audit; its observation must belong to the same source. Terminal audit statuses require a retained summary. Completed pages require an observation. Targets/configuration cannot be rewritten, even through direct owner updates.

RPCs:

- `create_website_audit(uuid,text,uuid)`: explicit active owner/admin authorization; atomic source/website registration, audit and seed queue creation; idempotent request key. Does not update the workspace primary URL or queue a Quick Scan.
- `claim_website_audit_page(uuid DEFAULT NULL)`: bounded fair scan of up to 20 audits, `FOR UPDATE SKIP LOCKED`, expired-lease recovery, host permit and one page claim. Only handles Phase 1 jobs with page_limit <= 5.
- `finish_website_audit_page(uuid,uuid,jsonb)`: atomically checks job/page/host ownership and unexpired lease, retains evidence, discovers/adopts candidates, changes page state, releases host and schedules future work. A previously committed token returns the retained outcome without duplicating observations.
- `finalize_website_audit(uuid DEFAULT NULL)`: only when all discovered/admitted work is terminal; writes deterministic counts, missing-title/description findings, denominators and page references to a summary observation in the same transaction as terminal audit status. Failed summary persistence cannot mark completion.

All new mutation RPCs use SECURITY DEFINER with a pinned `pg_catalog, public, pg_temp` search path and qualified relations. Creation is granted only to authenticated users and performs explicit authorization. Claim/finish/finalize are granted only to service_role. No PUBLIC/anon execution; no browser DML on operational tables. Members receive RLS-scoped SELECT on jobs/pages and the progress view. Worker direct table privileges are revoked on the four new tables; mutations go through RPCs owned by the reviewed database owner. Existing Quick Scan policies/RPCs are unchanged.

## Worker and network behavior

Creation and worker application flags are exact opt-ins: `ALYOXA_AUDIT_CREATION_ENABLED=true` and `ALYOXA_AUDIT_WORKER_ENABLED=true`; missing/other values mean disabled. The database switches independently default false. `ALYOXA_AUDIT_BATCH_SIZE` is server-clamped to 1–2. No public Full Audit button was added.

The new scheduled function calls an internal secret-authenticated endpoint, with a 25-second dispatch bound. A batch has a 20-second budget and at most two items; each database operation has a two-second client deadline, and each fetch has an eight-second deadline. It reserves time before claiming more work. Uncertain database commits propagate; the worker does not issue a compensating second write. Leases and stable result tokens resolve retries.

Each work item makes at most one HTTP request. Uncached robots is its own durable outcome, followed by queued continuation after the applicable delay. Same-origin HTML redirects are persisted for a later invocation, capped at four. Every requested URL reuses existing public-DNS/IP checks and pinned HTTP lookup. Audit requests cannot leave the immutable origin, including HTTP-to-HTTPS or www redirects; submit the final origin for such sites. Redirected robots policies fail closed in this foundation.

Discovery resolves relative links and HTML base URLs before enforcing scope, removes fragments, preserves query/path distinctions, prioritizes nav/header links, and skips forms, downloads and obvious non-HTML assets. It examines at most 200 anchors, returns at most 100 candidates, and bounds URL payload bytes. Invalid/outside links are counted without being crawled. Depth is capped at three. XML/sitemap discovery and JavaScript rendering are intentionally deferred to Phase 2.

Robots disallow, access restrictions, unsafe destinations and unsupported content are explicit exclusions. 404/410 are terminal failures. Network failures/5xx are retryable, with three claims maximum for actual attempts. Policy/redirect continuation does not consume a content retry. 429 and Retry-After cause shared host backoff; delays over one hour are excluded rather than bypassed. Expired processing leases requeue with a new token or fail after exhaustion. A 24-hour lifetime bounds jobs that never become serviceable.

Audit host coordination spans audit tenants, and claims yield to observed processing Quick Scans. **Quick Scan does not participate in the new host lease**, so a Quick Scan starting after an audit claim can overlap. Strict cross-mode serialization requires a separately approved Quick Scan change; this phase does not claim that guarantee. Existing Quick Scan fetching, queue semantics and result format are preserved. Shared transport changes only export existing helpers and attach optional status/Retry-After to the same HTTP error message/type hierarchy.

## Observations and deterministic context

Per-page metadata includes actual evidence, fetched URL, HTTP result, bounded excerpt, coverage caveats, excluded-link counts, audit/page IDs and explicit AI-unavailable status. Repeated final URLs are recorded as aliases rather than duplicate analyzed observations. No page is invented to fill the five-page budget.

The summary uses retained observations to report missing title/description counts and completed-page denominators, with observation references. Its coverage always remains partial/navigation-only, even when the bounded job status is completed. Skipped page-limit candidates, blocked pages, depth/frontier truncation and retry failures prevent a clean completed status or appear as explicit limits.

The existing AI context mapper excludes `record_kind: audit_page`, retains Quick Scan contexts and consumes `audit_summary`. No AI-generated recommendations were added. Signal's existing persisted observation display can show page evidence and the summary. There is no new public audit UI in this phase.

## Local checks — no database or network needed

From the application directory:

```powershell
node node_modules/jest/bin/jest.js --runInBand --no-cache
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm.cmd run lint
node --check scripts/accept-five-page-audit.cjs
```

The five-page Jest test uses the real fixture files and extraction/discovery/worker code, with a deterministic repository/HTTP contract double. It is not a substitute for PostgreSQL tests. Existing safe-transport and Quick Scan tests remain in the full suite.

Recorded local results: **45 Jest suites / 230 tests passed**; TypeScript passed; acceptance CLI syntax check passed; ESLint had zero errors and three pre-existing warnings (`jest.config.js`, Overview page and OverviewSidebar); `git diff --check` passed. PostgreSQL/pgTAP/isolation tests and the database-backed HTTP acceptance CLI were not run.

## Database acceptance — only after review, disposable environment

1. Independently review the full draft, existing live definitions and effective grants. Provision a disposable/local Supabase database using only an approved baseline. Do not apply old malformed drafts or point tests at production.
2. The owner may separately apply the reviewed audit draft to that disposable database. This step was not performed here.
3. Run `supabase/tests/website_audit_phase1.sql` with pgTAP/Supabase's database test runner against that database. It tests explicit flags, owner creation, idempotency, denied browser writes/worker execution, tenant-isolated reads, immutable targets, source/workspace FKs, host spacing, recovered stale leases, duplicate completion, the five-page admission cap, retry exhaustion, accurate counters, and page-insert rollback, summary backoff/fairness, redirect loops/aliases, expired audit and exhausted page recovery, crash-safe long crawl delay and extractor-shaped aggregation. Fixtures/fault injection are wrapped in ROLLBACK.
4. Run `supabase/tests/isolation/website_audit_claims.spec` through PostgreSQL's `isolationtester` against a dedicated disposable database. It uses two independent sessions, asserts no double claim, tests two tenants on one host, persisted host leases after commit and release after rollback. Require all permutations to finish without ERROR/assertion exceptions. It has fixture teardown; do not use a shared database. PostgreSQL isolationtester is a developer prerequisite, not an application/paid dependency.
5. Only after these pass, proceed to real five-page HTTP acceptance below. None of the SQL suites has been executed in this session.

## Reproducible five-page HTTP acceptance

The controlled site is `tests/fixtures/website-audit/`: index, about, products, contact, policy and robots. About has one image without alt; Contact intentionally lacks a meta description. Serve the directory at the **root of a dedicated public HTTPS fixture hostname**. Use an operator-controlled staging/static host; no deployment was performed here. Local/private fixture URLs are deliberately rejected by production SSRF defenses. Do not add a local-network bypass to the worker.

Use a local app and local disposable Supabase project with a verified owner/admin session and workspace. After independent database approval, enable both database runtime switches in that local project and opt in to the local app's audit flags. Supply existing local credentials through the operator's environment; do not paste them into screenshots or command output.

The acceptance CLI requires:

- `AUDIT_ACCEPTANCE_SUPABASE_URL`: loopback Supabase API origin only.
- `AUDIT_ACCEPTANCE_APP_URL`: loopback application origin only.
- `AUDIT_ACCEPTANCE_PUBLIC_KEY`: local project's publishable/anon key.
- `AUDIT_ACCEPTANCE_ACCESS_TOKEN`: local authenticated owner's existing access token.
- `AUDIT_ACCEPTANCE_WORKSPACE_ID`: that owner's local workspace UUID.
- `AUDIT_ACCEPTANCE_FIXTURE_ORIGIN`: dedicated public HTTPS fixture origin, no subpath/query.
- `WEBSITE_SCAN_TRIGGER_SECRET`: the local worker's already configured secret.

Then run, only in the reviewed local setup:

```powershell
node scripts/accept-five-page-audit.cjs
```

The script refuses remote app/database URLs, sends an expected-project header that the local endpoint verifies before privileged work, calls the owner-authorized creation RPC, drives up to 40 bounded batch invocations, and reads results through authenticated RLS. It verifies five unique page observations, five expected requested paths, no failures, one retained summary pointer, denominator five and one missing description. It does not log credentials or call an LLM. It leaves local evidence available for inspection. No acceptance CLI was run here; only its syntax was checked. It exercises the database RPC directly because there is intentionally no public Full Audit button.

## Unresolved database review assumptions and rollout

- PostgreSQL 17-style security-invoker views and core SHA-256 functions are available; existing workspace helpers, canonicalizer, source/website/observation columns match the tracked contract.
- The reviewed function owner can register sources/websites and insert/read observations. Definer functions deliberately avoid granting worker-wide direct DML on new tables. Review that ownership and explicit privilege model before applying.
- Three supporting unique constraints are new DDL on existing tables; inspect existing equivalent keys/names and deployment lock implications first.
- Existing 92-character hostname/source-key capacity and standard-port restrictions remain inherited from the approved canonicalizer. This phase does not expand that contract or claim every public URL is supported.
- New audit FKs restrict deletion of referenced workspace/source/website/observation history. Retention/deletion policy needs review; no destructive cleanup API was invented.
- Database SQL compilation, actual RLS, concurrent claim behavior, and database-backed five-page persistence remain unverified until the supplied suites run in the approved disposable environment.
- Persistent database permission/schema errors can leave a job awaiting operator repair rather than fabricate a terminal summary. Logs identify the failed RPC; no guessed grants or automatic schema repair is attempted.
- No sitemap processing, public Full Audit control, AI recommendations, or strict cross-mode host locking is included.

Activation order: reviewed database draft, disabled application code, disposable SQL/integration acceptance, local five-page HTTP acceptance, then separately authorized five-page canary. Rollback disables creation and dispatch; preserve existing evidence/tables and allow fenced in-flight commits or lease expiry. No down-migration/drop is needed to keep Quick Scan operating.

## Complete Phase 1 changed-file inventory

Existing files changed in this phase:

- `src/lib/os/signal/websiteFetch.ts`
- `src/lib/os/signal/persistedWebsiteContexts.ts`

New implementation files:

- `supabase/migration-drafts/20261029001000_website_audit_phase1.sql`
- `src/actions/signal/submitWebsiteAudit.ts`
- `src/lib/os/signal/audit/contracts.ts`
- `src/lib/os/signal/audit/discovery.ts`
- `src/lib/os/signal/audit/transport.ts`
- `src/lib/os/signal/audit/repository.ts`
- `src/lib/os/signal/audit/processor.ts`
- `src/app/api/internal/website-audits/process-batch/route.ts`
- `netlify/functions/dispatch-website-audits.mts`

New verification files:

- `src/lib/os/signal/audit/__tests__/context.test.ts`
- `src/lib/os/signal/audit/__tests__/discovery.test.ts`
- `src/lib/os/signal/audit/__tests__/fivePageFixture.test.ts`
- `src/lib/os/signal/audit/__tests__/flagsAndEndpoint.test.ts`
- `src/lib/os/signal/audit/__tests__/migrationContract.test.ts`
- `src/lib/os/signal/audit/__tests__/processor.test.ts`
- `src/lib/os/signal/audit/__tests__/transport.test.ts`
- `supabase/tests/website_audit_phase1.sql`
- `supabase/tests/isolation/website_audit_claims.spec`
- `scripts/accept-five-page-audit.cjs`
- `tests/fixtures/website-audit/index.html`
- `tests/fixtures/website-audit/about.html`
- `tests/fixtures/website-audit/products.html`
- `tests/fixtures/website-audit/contact.html`
- `tests/fixtures/website-audit/policy.html`
- `tests/fixtures/website-audit/robots.txt`
- `docs/website-audit-phase1.md` (this document)

Pre-existing uncommitted observation-diagnostics changes, old migration drafts and the previous 42702 migration/test were left intact; they are not new Phase 1 changes.


## Hardening review (2026-10-29)

The full revised SQL remains in [the draft](../supabase/migration-drafts/20261029001000_website_audit_phase1.sql). It is not in the auto-applied migrations directory. No SQL or database tests were executed during this review.

Confirmed fixes:

- Summary insertion was atomic but a repeatedly failing oldest ready audit could monopolize finalization. A nested transaction now rolls back summary/status together, records only SQLSTATE and an attempt count, and schedules exponential backoff (60 seconds through a one-hour cap). Ready selection honors that deadline; newer ready jobs can proceed. Worker logs operation/audit/code. The progress view exposes retry state. Permanent storage failure stays visibly pending: it cannot truthfully become completed without a summary.
- Previously host spacing was written only after a successful finish RPC. A crash could bypass a cached crawl delay longer than the 120-second host lease. Claim now reserves lease duration plus crawl delay before I/O; successful finish resets spacing from completion time. Expired host leases are logically available after both expiry and next_allowed_at; a new token replaces them. Old tokens cannot finish recovered pages. There is no lease-deletion dependency.
- Redirects were bounded at four, but self/multi-hop loops used the entire allowance and known aliases required a redundant fetch. A bounded redirect history detects loops; already completed redirect targets are skipped. Discovery checks both original and retained final identities, and existing URL hashes deduplicate fragments/canonical duplicates.
- Completed-page constraints now require final URL and hash; immutable audit identity includes id and creation timestamp. Null result/token inputs are rejected explicitly.
- The five-page limit is an admission/attempt budget, not a guarantee of five successful results. Failed, blocked and alias targets consume slots without replacement. Summary metadata states this and distinguishes exhausted admission budget from candidates actually skipped due to that budget. Navigation-only coverage remains partial even for a completed bounded job.
- Missing-title/description predicates were correct for the actual extractor's array of id/value objects. Added measured-field denominators so absent measurement is not confused with a measured empty field. Tests cover display fallback titles with empty raw HTML title evidence.
- Migration now fails before DDL unless PostgreSQL >=15, executor is postgres with BYPASSRLS/superuser, required existing table privileges are present, and API roles cannot CREATE in public (including inherited/PUBLIC access). Newly created functions/tables therefore have the pinned postgres owner. This intentionally fails closed instead of silently changing global schema grants. Definer search paths put pg_catalog first and pg_temp last; relations/helpers remain schema-qualified. No new global grants, role creation, or existing RLS changes.

Recovery guarantees are conditional on continued dispatcher execution, enabled worker flags, available database writes and finite load. Page leases recover on claims; three exhausted attempts become failed. The 24-hour audit expiry sweep makes all pending pages terminal. Finalization then writes the summary before setting any terminal status. Persistent observation-write errors eventually exhaust page attempts; persistent summary-write errors remain visible and retry with bounded frequency. No design can guarantee terminal persistence while the database permanently rejects that persistence.

Review prerequisites and unresolved risks:

- PostgreSQL config specifies major version 17; actual target version, postgres ownership/BYPASSRLS, existing helper ownership/search paths/EXECUTE, table privileges, source-event unique index and observation contract still require disposable-database verification. Version 14 is deliberately unsupported; do not remove invoker-view semantics as a workaround.
- SECURITY DEFINER intentionally trusts the postgres owner and the service-role worker. Compromise of a service-role secret permits invoking cross-tenant worker contracts. Authenticated users have only explicitly authorized creation and RLS-filtered reads. No worker direct DML was granted on new tables. Operator-only runtime flags remain inaccessible through these RPCs.
- Quick Scan only participates through an observed-processing check. It does not acquire audit host leases and does not honor audit Retry-After reservations. A Quick Scan can start between the audit check and HTTP fetch. Strict cross-mode rate limiting remains a rollout blocker for a shared-host guarantee; it needs a separately reviewed integration in both claim paths. Quick Scan behavior was left unchanged in this review.
- Redirected robots.txt and cross-origin redirects fail closed; submit the final canonical origin. No sitemap or rendered-JavaScript coverage is claimed. Per-page extractor limitations remain intentionally conservative.
- No disposable database was explicitly configured. pgTAP/isolation tests are authored regression cases, not passing database results. Review and run both against a dedicated disposable PostgreSQL 15+ Supabase instance before activation. Tests inject faults and alter fixture state only inside their rollback transaction; never run against a populated/shared/production database.

Files changed specifically in this review: migration draft; audit repository; migrationContract, transport and new repository Jest tests; pgTAP test; this document. Existing concurrency specification remains unchanged and still needs execution. Application validation: 45 suites, 230 tests; TypeScript passes; lint zero errors and the same three pre-existing warnings. No migration, SQL test, HTTP acceptance, deployment, commit or push was performed.


## Follow-up review (2026-10-30)

Rechecked the current implementation and retained the earlier hardening. Additional changes:

- Fixed fractional robots crawl delays: the parser accepts values such as 2.0001 seconds, but a fractional delay_ms would fail the finish RPC's integer cast. The audit transport now rounds up to 2001 milliseconds, with a real-parser/transport regression test. Quick Scan is unchanged.
- Added explicit prerequisite EXECUTE checks for auth.uid, owner-side creation helpers and the authenticated membership helper used by invoker-view RLS. Existing helper functions/grants are not rewritten.
- Extended finalization's nested retry transaction to include aggregation reads, so failures before the summary INSERT also receive durable backoff when bookkeeping remains writable.
- Extended pgTAP cases to invoke the finish RPC under the actual service_role, exercise the rounded robots policy, assert browser/anonymous EXECUTE denial, and verify yielding/resuming around an already-processing Quick Scan. This does not prove race-free coordination.

Current validation: npx.cmd jest --runInBand: 45 suites / 231 tests passed. npx.cmd tsc --noEmit --incremental false: exit 0. npm.cmd run lint: exit 0, zero errors and the same three existing warnings. Database tests and the database-backed HTTP acceptance were not executed: no disposable database was explicitly configured. SQL remains an unexecuted review draft, not a verified database rollout.

Changes in this follow-up: migration draft; audit/transport.ts; audit/__tests__/transport.test.ts; audit/__tests__/migrationContract.test.ts; supabase/tests/website_audit_phase1.sql; this document. Earlier hardening files remain in the working tree.

Additional limitation: Retry-After values beyond one hour currently exclude the affected page rather than create a durable host reservation for the full advertised duration. Other queued pages/audits can still request that host. This needs a reviewed host-wide exclusion/backoff policy before claiming comprehensive rate-limit compliance. Shared-host Quick Scan coordination also remains unresolved. These are not guarantees of the current draft.
