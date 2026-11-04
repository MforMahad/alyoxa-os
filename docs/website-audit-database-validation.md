# Current implementation notice

The environment/test results below remain a historical validation record. The host-coordination and long-backoff proposals have now been implemented but not PostgreSQL-tested. Follow [the production release guide](website-audit-production-release.md) for the current contract and activation order. Disposable test suites now require `coordination_enabled=true` as well as the audit switches; defaults remain false.

# Phase 1 database validation — 2026-10-30

Release decision: **NO-GO for Full Audit activation**. No usable disposable database was found. No SQL was executed, no migration was applied, and no production connection was attempted.

## Observed environment

- Supabase CLI: installed, `2.117.0` (version command succeeded after permission to write its user-profile telemetry file).
- `docker`, `psql`, `pg_prove`, `isolationtester`, and global `supabase`: not found in PATH.
- No matching Docker/PostgreSQL service or process was returned by the local checks. Standard Docker/PostgreSQL installation directories were not found.
- TCP-only probes to `127.0.0.1:5432`, `:54321`, and `:54322`: all `ECONNREFUSED`. No SQL/authentication was sent.
- No explicitly named `AUDIT_DISPOSABLE_*`, `DISPOSABLE_DATABASE*`, or `TEST_DATABASE*` environment settings were present. Nonstandard installations/ports were not exhaustively searched.
- Repository configuration requests PostgreSQL 17; this is not evidence of a running server.
- `supabase/.temp` contains production-link metadata. Its credential/link file contents were not read or used. Do not copy that directory into the disposable project.

Database version/prerequisite inspection, draft compilation, pgTAP, concurrent isolation tests, and database-backed five-page acceptance: **NOT RUN**. The earlier 231 application tests do not substitute for any of these.

## Prepare a genuinely disposable instance

Install/start Docker Desktop with Linux containers (or a compatible local Docker runtime). Install PostgreSQL 17 client tools including `psql`. Supply PostgreSQL 17's `isolationtester` executable; it is a test utility, not normally included in basic client packages. A PostgreSQL 17 source build can produce it with `./configure`, `make`, then `make -C src/test/isolation isolationtester` after installing that release's build prerequisites. On Windows, use a matching native build or WSL with connectivity to the disposable loopback server; do not silently replace loopback with a remote address. Supabase's local stack supplies the Supabase schemas/roles and pgTAP support; vanilla PostgreSQL alone is insufficient.

The following PowerShell commands are **instructions, not commands executed during this investigation**. Use an unused directory and confirm the baseline inventory before starting containers. Run from the repository directory.

```powershell
$auditRepo = (Get-Location).Path
$auditCli = Join-Path $auditRepo 'node_modules/.bin/supabase.cmd'
$auditRoot = Join-Path $auditRepo '.disposable-website-audit-validation'
if (Test-Path -LiteralPath $auditRoot) { throw 'Choose a NEW disposable directory; do not reuse unknown data.' }
New-Item -ItemType Directory -Path $auditRoot | Out-Null
& $auditCli init --workdir $auditRoot
if ($LASTEXITCODE -ne 0) { throw 'Disposable init failed.' }
```

In **the newly generated** `$auditRoot/supabase/config.toml`, set `project_id = "alyoxa-phase1-validation"`, `[db] major_version = 17`, and `[db.seed] enabled = false`. Keep the local API/database ports `54321`/`54322`. Do not copy the repository config wholesale, `.env` files, auth secrets, `.temp`, or a live schema/data export. No login or project linking is needed.

Copy the historical baseline through `20261006000400` and the separately reviewed `20261029000100` 42702 fix. The two old drafts must not be copied. This is a repository-derived baseline, not a claim that production has identical schema/grants.

```powershell
$auditBaseline = Get-ChildItem -LiteralPath (Join-Path $auditRepo 'supabase/migrations') -File |
  Where-Object {
    $_.Name -match '^\d{14}_.+\.sql$' -and
    ($_.Name.Substring(0,14) -le '20261006000400' -or
     $_.Name -eq '20261029000100_fix_connect_website_signal_source_ambiguous_website_id.sql')
  } | Sort-Object Name
$auditBaseline | Select-Object -ExpandProperty Name
# REVIEW the displayed inventory before continuing.
New-Item -ItemType Directory -Path (Join-Path $auditRoot 'supabase/migrations') -Force | Out-Null
foreach ($auditMigration in $auditBaseline) {
  Copy-Item -LiteralPath $auditMigration.FullName -Destination (Join-Path $auditRoot 'supabase/migrations')
}
& $auditCli start --workdir $auditRoot
if ($LASTEXITCODE -ne 0) { throw 'Disposable baseline/start failed; inspect the FIRST SQL error.' }
```

Do not run `start`/`db reset` in the original linked repository: its migrations directory includes the old draft. The draft under `migration-drafts` is deliberately applied separately below.

## Inspect, then apply only on that instance

Confirm Docker has created `supabase_db_alyoxa-phase1-validation` for this scratch project, the container is newly created, and port 54322 belongs to it. Stop if the identity/volume provenance is uncertain. Use the fresh local default database password only; never substitute production credentials.

```powershell
docker ps --filter 'name=supabase_db_alyoxa-phase1-validation' --format '{{.Names}} {{.Ports}}'
$auditDb = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?hostaddr=127.0.0.1&connect_timeout=5'
psql -X --dbname $auditDb --set=ON_ERROR_STOP=1 -c "SELECT version(),current_user,inet_server_addr(),inet_server_port(); SELECT rolname,rolsuper,rolbypassrls FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role'); SELECT name,default_version FROM pg_available_extensions WHERE name='pgtap';"
if ($LASTEXITCODE -ne 0) { throw 'Disposable prerequisite inspection failed.' }
psql -X --dbname $auditDb --set=ON_ERROR_STOP=1 -f (Join-Path $auditRepo 'supabase/migration-drafts/20261029001000_website_audit_phase1.sql')
if ($LASTEXITCODE -ne 0) { throw 'Draft compilation/prerequisite failure: STOP; do not bypass its guards.' }
```

The draft additionally checks PostgreSQL >=15, trusted postgres/BYPASSRLS ownership, trusted public schema, existing table privileges and helper EXECUTE permissions. Successful creation alone does not prove worker authorization or RLS; those require the tests.

## Run real SQL integration tests

```powershell
New-Item -ItemType Directory -Path (Join-Path $auditRoot 'supabase/tests') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $auditRepo 'supabase/tests/website_audit_phase1.sql') -Destination (Join-Path $auditRoot 'supabase/tests')
& $auditCli test db --local --workdir $auditRoot
if ($LASTEXITCODE -ne 0) { throw 'pgTAP failed.' }
```

Require pgTAP `Result: PASS`, no `not ok`, and no setup/SQL errors. `psql` exit 0 alone is not a pgTAP pass. The SQL suite rolls back its fixtures, including fault injection. It covers tenant reads/writes, grants, fencing, recovery, summary failure fairness, redirects, admission, and an actual five-page database retention scenario. That new scenario submits synthetic measured outcomes through the RPCs and requires five page observations plus exactly one summary despite replayed completions. It does not test HTTP fetching/extraction.

## Run concurrent claims with PostgreSQL isolationtester

Run against the same dedicated empty disposable project after pgTAP rolls back. Resolve the exact installed executable; do not guess a production connection string.

```powershell
$auditIsolationTester = (Get-Command isolationtester -ErrorAction Stop).Source
$auditIsolationOutput = Get-Content -LiteralPath (Join-Path $auditRepo 'supabase/tests/isolation/website_audit_claims.spec') -Raw |
  & $auditIsolationTester $auditDb 2>&1
$auditIsolationExit = $LASTEXITCODE
$auditIsolationOutput
if ($auditIsolationExit -ne 0 -or ($auditIsolationOutput -match '(?i)ERROR:|FATAL:|PANIC:|deadlock detected|timed out')) {
  throw 'Isolation test failed; retain the complete output.'
}
```

Require both declared permutations to complete: no duplicate page claim, no simultaneous cross-tenant host ownership, persisted host exclusion after commit, and claimability after rollback. The runner can print server errors as expected-style output, so inspect output as well as exit status. Fixtures are committed between sessions and cleaned by teardown; never run on a shared database. If using WSL's executable, run the equivalent stdin redirection and the same explicit loopback connection string in WSL; first establish that this loopback port reaches the disposable container.

Finally run the existing loopback-only `scripts/accept-five-page-audit.cjs` following `docs/website-audit-phase1.md`, with only disposable credentials, a local application process, and the five controlled public fixture pages. This separately validates real safe fetch/extraction -> PostgreSQL -> progress/context. It has not run here. Keep audit flags disabled in every deployed environment.

## Minimal release-blocker proposals (not implemented)

**Shared host coordination:** both Quick Scan and audit must atomically acquire the same host-row lease before network I/O. A second SELECT/preflight check cannot close the race. Add fenced Quick Scan claim/release/recovery RPCs, route its processor through them, and make unavailable permits defer queued scans rather than fail them. Keep Quick Scan's public submission/result contracts. Renew or bound leases to all network work, reserve crash-safe spacing, and fence completion as well as release; a timed-out old worker must not complete a reclaimed scan. Test both claim orderings, different tenants, rollback, expired leases and late completions. This is a small shared-claim integration, but still requires reviewed SQL and coordinated worker rollout; no draft here claims it is fixed.

**Long Retry-After:** persist a dedicated host-wide `not_before` deadline, separate from ordinary crawl spacing/lease expiry, and gate both claim paths on it. Preserve the parsed full deadline on retry/terminal page results; never clamp it to one hour or erase it during release/recovery. If the deadline exceeds the audit lifetime, exclude/defer that audit's remaining work honestly while retaining host suppression for other jobs. Handle unrepresentable/overflowing delays with a durable blocked state requiring review rather than immediate retry. Apply the same conservative handling to unsupported robots delays. Test a two-hour delay, HTTP-date form, exhausted page retries, new audits, other tenants and Quick Scan. No paid service is needed.

## Required release evidence

1. Reviewed disposable baseline and recorded PostgreSQL version/effective grants.
2. Draft applies successfully without relaxing prerequisite guards.
3. Complete pgTAP output passes, including five pages / one summary.
4. Both real concurrent-claim permutations pass.
5. Database-backed five-page HTTP acceptance passes.
6. Shared-host and long-backoff fixes are reviewed, implemented and verified before enabling Full Audit.

Until these are met: **NO-GO**. The absence of a local database is a validation blocker, not evidence of a migration defect or success.

References: [Supabase local CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started), [local pgTAP CLI](https://supabase.com/docs/reference/cli/supabase-test-db), [PostgreSQL 17 isolation test instructions](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/test/isolation/README).
