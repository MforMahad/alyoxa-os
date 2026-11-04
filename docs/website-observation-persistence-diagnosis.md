# Website observation persistence failure

## Established path

The dispatcher POSTs the scan UUID to the internal processing route. That route awaits the processor and returns HTTP 502 when it returns `{ status: 'failed', scanId }`. It does not persist observations or turn a failed insert into success.

The processor creates one `createServiceRoleClient()` and uses it to load/claim the scan, resolve website/source, insert the observation, and complete/fail the scan. The client uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, has session persistence/refresh disabled, and does not import user cookies or override Authorization with a user session. Actual deployed values/project identity were not inspected.

Persistence is `.from('signal_observations').insert(payload).select('id, public_id, source_id, website_scan_id').single()`. This requests an inserted representation in the same operation, not a separate later SELECT. It requires effective SELECT on the returned columns in addition to INSERT on the supplied columns. PostgreSQL reference: https://www.postgresql.org/docs/17/sql-insert.html

The payload matches the tracked observation schema: generated public ID; source internal UUID; scan internal UUID; stable scan-derived source-event ID; low severity; website_content category; bounded title; description; JSON metadata; observed timestamp. Required ID/created timestamp defaults are database-owned. Source lookup is scoped to the website workspace and canonical source key. This establishes repository consistency, not live schema parity.

`The website observation could not be saved.` originates immediately after an insert/RETURNING error or failed returned-row verification. The outer catch writes a generic failed scan message and returns failure. Completion is never attempted after these failures. Already-failed scans are skipped; this patch does not retry or mutate production records.

## Diagnostic changes only

Previously the persistence branch logged code, message and details but omitted hint/operation and emitted undefined fields for a verification failure with no database error. Exceptions thrown while awaiting the insert reached an outer catch that logged no original exception details. These are confirmed observability gaps, not a proven database root cause.

The existing persistence log is now enriched once per failure with operation, scanId, code, message, details and hint, using the existing credential/URL redactor. Operations distinguish `signal_observations.insert_returning` from `signal_observations.verify_returned_row`. Verification failures have explicit application codes (`OBSERVATION_RESULT_MISSING` / `OBSERVATION_RESULT_MISMATCH`), never falsely attributed to PostgreSQL. Thrown insert exceptions are logged at their origin. No payload, client, environment values, request headers, cookies or keys are serialized. Browser/API responses remain generic.

The worker migration explicitly grants only INSERT on observations. No missing effective SELECT permission is proven: defaults, inherited grants or column grants may already provide it. Likewise RLS/foreign-key/uniqueness/schema errors remain hypotheses until the original log is inspected. No persistence check was removed, and no privileges/policies/migrations were changed.

## Immediate operator check

In Netlify's Next.js server/SSR function logs for the processing endpoint, search `[WebsiteScanProcessor] Failed persisting observation.` and each affected scan ID. The current production log already contains code/message/details; retrieve those before any release. The scheduled dispatcher log's HTTP 502 alone cannot identify the database rejection. The new hint/operation diagnostics are local until separately released; no deployment was performed here.

## SELECT-only Supabase checks

Run independently in the intended project's SQL editor. No INSERT/UPDATE/GRANT, role switching, JWT changes, or scanner/RPC invocation is required. Do not infer the worker's effective runtime role from the SQL editor's own `current_user`.

### 1. Effective service-role permissions, including RETURNING columns

```sql
SELECT rolname, rolbypassrls, rolinherit
FROM pg_roles WHERE rolname = 'service_role';

SELECT has_schema_privilege('service_role', 'public', 'USAGE') AS schema_usage,
       has_table_privilege('service_role', 'public.signal_observations', 'INSERT') AS table_insert,
       has_table_privilege('service_role', 'public.signal_observations', 'SELECT') AS table_select;

SELECT a.attname,
       has_column_privilege('service_role', a.attrelid, a.attnum, 'SELECT') AS can_select,
       has_column_privilege('service_role', a.attrelid, a.attnum, 'INSERT') AS can_insert
FROM pg_attribute AS a
WHERE a.attrelid = 'public.signal_observations'::regclass
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;
```

The four returned columns are id, public_id, source_id, website_scan_id. RLS bypass does not replace SQL table/column privileges. If deployed credentials are not actually a service-role credential, the role inspected here will not describe the failing request; independently verify configuration without sharing the key.

### 2. Live schema, constraints, indexes, RLS and triggers

```sql
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'signal_observations'
ORDER BY ordinal_position;

SELECT conname, pg_get_constraintdef(oid, true) AS definition
FROM pg_constraint
WHERE conrelid = 'public.signal_observations'::regclass;

SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'signal_observations';

SELECT relrowsecurity, relforcerowsecurity
FROM pg_class WHERE oid = 'public.signal_observations'::regclass;

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'signal_observations';

SELECT t.tgname, pg_get_triggerdef(t.oid, true) AS trigger_definition,
       pg_get_functiondef(t.tgfoid) AS trigger_function
FROM pg_trigger AS t
WHERE t.tgrelid = 'public.signal_observations'::regclass AND NOT t.tgisinternal;
```

### 3. Affected scans, resolved sources and any retained/deduplicated observations

```sql
SELECT scan.id AS scan_id, scan.public_id AS scan_public_id,
       scan.status, scan.error_message, scan.started_at, scan.completed_at,
       website.id AS website_id, website.workspace_id,
       source.id AS expected_source_id,
       (SELECT count(*) FROM public.signal_observations AS observation
        WHERE observation.website_scan_id = scan.id) AS observations_for_scan,
       (SELECT count(*) FROM public.signal_observations AS observation
        WHERE observation.source_id = source.id
          AND observation.source_event_id = 'website_scan:' || scan.public_id)
         AS observations_for_deduplication_key
FROM public.website_scans AS scan
LEFT JOIN public.websites AS website ON website.id = scan.website_id
LEFT JOIN public.signal_feed_sources AS source
  ON source.workspace_id = website.workspace_id
 AND source.source_type = 'website'
 AND source.source_key = 'website:' || website.normalized_domain
WHERE scan.id IN (
  '998578ff-72ea-4fd3-b024-e7b55e6b46bb'::uuid,
  '92414920-1b58-4cf2-bf46-70ada4fc5ade'::uuid,
  'ee6fd32a-f3b7-4542-aed7-8dd4b22db5a2'::uuid
)
ORDER BY scan.id;
```

Prioritize checks using the real error: 42501 = inspect privilege/RLS text; 23503 = FK; 23505 = uniqueness/deduplication; 23502 = NOT NULL; 23514 = CHECK; 22001 = string limit; PostgREST schema/representation errors = inspect exact code and details. No code by itself establishes a particular fix. A retained row can coexist with later completion failure; absence of a retained row does not prove INSERT-only versus RETURNING rejection.

## Changed files and verification

- `src/lib/os/signal/websiteScanProcessor.ts`: enrich existing log, separate database errors from verification failures, retain thrown insert diagnostics.
- `src/lib/os/signal/websiteSubmissionDiagnostics.ts`: export the existing redactor for reuse; submission behavior unchanged.
- `src/lib/os/signal/__tests__/websiteScanProcessor.test.ts`: original error/hint, redaction, verification and thrown-error regression coverage; preserve persistence-before-completion checks.
- `src/lib/os/signal/__tests__/websiteScanRoute.test.ts`: HTTP 502 remains generic.
- `docs/website-observation-persistence-diagnosis.md`: this guide and SELECT-only checks.

All database behavior remains subject to independent live verification. No SQL, deployment, commit or push was executed.

Recorded checks: 37 Jest suites / 205 tests passed; TypeScript `--noEmit --incremental false` passed; lint passed with zero errors and three pre-existing warnings; `git diff --check` passed. No live database or browser acceptance run was performed.
