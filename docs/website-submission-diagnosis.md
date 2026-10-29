# Website submission failure: evidence and operator checks

## What is proven

- The application calls `submit_website_analysis` with `p_workspace_id` (UUID string validated locally) and `p_website_url` (normalized HTTP(S) string). These match the repository function definition.
- The previously deployed message beginning `Analysis could not be queued` is returned only when Supabase returns an RPC error, after `auth.getUser()` succeeded and the capacity check passed. This inference assumes the deployed bundle is the code inspected here. It does not identify the database exception.
- The server client reads request cookies through `next/headers` and passes them to Supabase SSR. No service-role client is used for submission. Owner/admin authorization remains inside the SECURITY INVOKER RPC/RLS.
- Having an active owner membership somewhere does not prove the current session maps to that membership: `auth.users.id -> public.users.auth_id -> public.users.id -> workspace_memberships.user_id` must match for the failing workspace.
- The original action logged code/message but omitted details/hint/correlation. It now emits one whitelisted failure record per failed stage, without serializing auth/request objects. The browser receives a generic error and random request reference, never database diagnostics.
- The original UI selected the source label and connection badge using `savedUrl`, but scan status used the edited URL. This could mix two domains. Domain-only scan state also survived workspace changes. Both are corrected. Submission failure now sets the selected scan display to unavailable rather than leaving WAITING or a prior completed result. Superseded background restoration cannot overwrite the new submission result.
- A URL visible in an input is not evidence of a saved row. The input starts from the workspace prop and updates while typing. `savedUrl` changes only on prop synchronization or a successful action response. In the existing RPC definition, an exception in connection rolls back the preceding URL UPDATE. A returned empty result is a distinct case and may commit; the action refuses to label it success.
- Connection badges are attempt-local state, not an independently refreshed database source registry. NOT CONNECTED alone does not prove no source row exists.

## Unproven database cause

No live database or Netlify account was accessed. Existing RPC presence/EXECUTE findings are accepted. Internal DML may still fail due to effective table/column privileges, RLS, constraints/indexes, trigger functions, helper privileges, or drift in the deployed definitions.

One specific repository suspect is `connect_website_signal_source`: its RETURNS TABLE includes `website_id`, and its new-scan INSERT uses `ON CONFLICT (website_id)`. This can conflict with PL/pgSQL output-variable name resolution; check whether the actual error is `42702`, its details/hint, and the live function definition before choosing a fix. No SQL change or global variable-conflict setting change was made. See [PostgreSQL variable resolution](https://www.postgresql.org/docs/17/plpgsql-implementation.html).

Historical completed scans with no observations are a separate downstream inconsistency. They do not identify the cause of a new submission's RPC failure. Fetching, scanner persistence, AI, and dispatcher behavior were not changed by this patch.

## Next Netlify check

1. Open the affected Netlify project, **Cloud compute -> Functions**, and select the Next.js server/SSR function handling the Overview POST. Use the published deploy matching the failing page. The generated function name depends on the adapter; do not select the scheduled `dispatch-website-scans` function for this submission failure.
2. Filter to the timestamp of an existing failed submission and search `[WebsiteSubmission] Atomic submission failed.` Current production code already logs `code` and `message`; retrieve these first. No new production submission or deployment is needed to inspect existing logs.
3. The local enhanced diagnostics are **not in production until separately authorized/released**. Once available, search `[WebsiteSubmission] Submission failed.` or the reference shown to the user. Capture operation, requestId, code, message, details, hint, workspaceId and authenticatedUserId. These UUIDs identify the exact membership to check; they are not bearer credentials. Do not share tokens, cookies, keys, or an unredacted network request.
4. Match `operation`: `auth.getUser`, `website_scans.capacity`, `submit_website_analysis`, or `submit_website_analysis.response`. Only the last two describe the RPC/response itself. Logs for the scanner endpoint are not a substitute.

Official navigation and filtering: [Netlify function logs](https://docs.netlify.com/build/functions/logs/).

## Read-only Supabase SQL

Run in the independently verified project SQL editor as an authorized database inspector. These queries are SELECT-only. They do not invoke the mutating submission/connection RPCs, set a role/JWT, change configuration, or create objects. Replace the two marked UUID placeholders before running query 2. Do not use `auth.uid()` in an administrator SQL-editor session as proof of the web user's identity; those sessions differ.

### 1. Retrieve live definitions, signatures, security mode and dependency EXECUTE

```sql
SELECT p.oid::regprocedure AS signature,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'submit_website_analysis', 'connect_website_signal_source',
    'canonicalize_website_url', 'has_workspace_role',
    'is_active_workspace_member', 'current_application_user_id'
  )
ORDER BY p.oid::regprocedure::text;
```

Inspect the actual body instead of relying on migration filenames. Look for output-variable collisions, differing RETURN signatures, canonicalization failures, missing helpers, and function-level settings. Database SQL-editor settings need not match cached PostgREST sessions.

### 2. Match the failing request's authenticated user to application membership

```sql
WITH request_identity AS (
  SELECT '<authenticatedUserId-from-server-log>'::uuid AS auth_id,
         '<workspaceId-from-server-log>'::uuid AS workspace_id
)
SELECT r.auth_id AS request_auth_user_id,
       u.id AS application_user_id,
       u.status AS application_user_status,
       w.id AS requested_workspace_id,
       w.owner_user_id,
       wm.user_id AS membership_application_user_id,
       wm.role, wm.status AS membership_status,
       (wm.status = 'active' AND wm.role IN ('owner', 'admin')) AS active_owner_or_admin
FROM request_identity AS r
LEFT JOIN public.users AS u ON u.auth_id = r.auth_id
LEFT JOIN public.workspaces AS w ON w.id = r.workspace_id
LEFT JOIN public.workspace_memberships AS wm
  ON wm.workspace_id = r.workspace_id AND wm.user_id = u.id;
```

If current logs lack the user UUID, obtain the auth subject UUID independently from the signed-in account's existing identity information; do not copy/share its token. Confirm it is the same session involved in the error. A row missing application_user_id or membership is material evidence; an unrelated owner's row is not.

### 3. Inspect effective table privileges, schema usage, and RLS policies

```sql
SELECT has_schema_privilege('authenticated', 'public', 'USAGE') AS public_schema_usage;

SELECT c.relname, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS can_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') AS can_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') AS can_update
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users', 'workspaces', 'workspace_memberships',
                   'signal_feed_sources', 'websites', 'website_scans')
ORDER BY c.relname;

SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'workspaces', 'workspace_memberships',
                    'signal_feed_sources', 'websites', 'website_scans')
ORDER BY tablename, policyname;
```

Expected internal operations include workspace SELECT/UPDATE, source and website SELECT/INSERT/UPDATE (upserts), and scan SELECT/INSERT. EXECUTE permission is not a substitute. If table privilege checks are false, inspect any column-specific grants before deciding a grant is missing. Do not add policies/grants merely from these results without comparing the actual error and security design.

### 4. Inspect actual constraints, indexes and write triggers

```sql
SELECT conrelid::regclass AS relation, conname,
       pg_get_constraintdef(oid, true) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.workspaces'::regclass,
                   'public.signal_feed_sources'::regclass,
                   'public.websites'::regclass,
                   'public.website_scans'::regclass)
ORDER BY conrelid::regclass::text, conname;

SELECT i.indrelid::regclass AS relation,
       i.indexrelid::regclass AS index_name,
       i.indisvalid, i.indisready, pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index AS i
WHERE i.indrelid IN ('public.signal_feed_sources'::regclass,
                    'public.websites'::regclass,
                    'public.website_scans'::regclass)
ORDER BY i.indrelid::regclass::text, i.indexrelid::regclass::text;

SELECT t.tgrelid::regclass AS relation, t.tgname,
       pg_get_triggerdef(t.oid, true) AS trigger_definition,
       pg_get_functiondef(t.tgfoid) AS trigger_function
FROM pg_trigger AS t
WHERE NOT t.tgisinternal
  AND t.tgrelid IN ('public.workspaces'::regclass,
                    'public.signal_feed_sources'::regclass,
                    'public.websites'::regclass,
                    'public.website_scans'::regclass)
ORDER BY t.tgrelid::regclass::text, t.tgname;
```

Use the failure to prioritize these results: `42501` for privilege/RLS, `42702` for ambiguity, `42P10` for an ON CONFLICT index mismatch, `23505` for uniqueness, `23503` for FK, `42883` for a missing/mismatched dependency, and `P0001` for an explicit function exception. Codes are investigative pointers, not diagnoses by themselves.

## Verification scope

Automated tests cover parameter mapping, failed/missing auth, RPC/transport/capacity errors, single safe diagnostic records, redaction, incomplete RPC response rejection, selected-domain badges, and workspace remount boundaries. The existing full test suite, TypeScript and lint are also run. These do not verify live auth cookies, deployed membership, effective RLS, or production RPC execution. No migration, deployment, push or commit is part of this patch.

Recorded results: **35 suites / 197 tests passed** using `node node_modules/jest/bin/jest.js --runInBand --no-cache`; `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed; `npm.cmd run lint` passed with zero errors and three pre-existing warnings; `git diff --check` passed. No browser or live database acceptance test was run.

Changed files:

- `src/actions/signal/submitWebsiteAnalysis.ts`
- `src/components/os/workspace/WorkspaceSignalEntry.tsx`
- `src/lib/os/signal/websiteSourceConnectionState.ts`
- `src/lib/os/signal/websiteSubmissionDiagnostics.ts` (new)
- `src/actions/signal/__tests__/submitWebsiteAnalysis.test.ts`
- `src/lib/os/signal/__tests__/websiteSourceConnectionState.test.ts`
- `src/lib/os/signal/__tests__/websiteSubmissionDiagnostics.test.ts` (new)
- `src/lib/os/signal/__tests__/websiteWorkspaceBoundary.test.ts` (new)
- `docs/website-submission-diagnosis.md` (this document)

The pre-existing untracked `00500.sql` and `.tmp` files were not modified. No new domain restriction or change to canonicalization, authorization policies, scanner, observation persistence, AI integration, or deployment configuration was introduced.
