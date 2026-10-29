# Website intelligence: implementation and acceptance

## Scope and remaining prerequisites

This change does not deploy, access Supabase, change secrets, or edit/apply migrations.
The full universal-URL requirement is **not yet achieved** under the existing database contract:

- `20261006000400` rewrites `websites.entry_url` to the origin. Scan rows have no submitted-URL snapshot column. The worker therefore records its actual origin coverage and never claims it analyzed the submitted path/query. Correct immutable page-specific scans require an approved database contract change, not an application-side encoding into an unrelated column.
- `20261006000300` and `source_key VARCHAR(100)` restrict hostnames to 92 characters. RPC canonicalization also disallows IP literals and nonstandard ports. Public URLs outside that contract cannot be queued. The worker continues to reject private/reserved addresses even if future SQL expands accepted inputs.
- The existing atomic `submit_website_analysis(UUID,TEXT)` RPC authorizes owners/admins. Regular members cannot change the primary website under current policy. No authorization bypass was added.
- The pre-existing untracked `00500.sql` and `.tmp` drafts are malformed and were left unchanged. Do not deploy them. The database owner must inspect the live RPC definition and migration state independently. The atomic submission action validates its returned result, but cannot roll back an RPC that silently commits with zero returned rows. Correct server-side nonempty-result enforcement remains a database prerequisite.
- The service-role worker must have `SELECT` as well as `INSERT` on `signal_observations` to use INSERT RETURNING. The historical worker migration explicitly grants INSERT only; effective defaults/live grants need independent verification. Failure is reported, not worked around with broader credentials or a new migration.
- The single-active-scan partial index and existing workspace RLS must be present. Local mocked tests do not prove live policies.

## Implemented flow

1. Overview validates dynamic input and calls one authenticated atomic submission action. No separate URL-saving call is made.
2. A best-effort workspace throttle allows fewer than five newly created scans per rolling minute. RLS scopes its count. This is not a transactionally enforced distributed quota; concurrent submissions or direct API callers need database-level enforcement if a strict quota is required. The existing unique index prevents two active scans for one website.
3. Existing Netlify schedule selects one queued scan per minute. Dispatch has a 45-second deadline.
4. Processor claims queued status conditionally and resolves website/source within the same workspace.
5. The bounded, DNS-pinned HTTP transport checks robots before content, including redirected destinations; no access controls are bypassed. A missing robots file (404/410) permits fetching; inaccessible/malformed robots responses fail closed. Crawl-delay is honored when within the eight-second fetch budget; larger delays produce an explicit unavailable result.
6. The scanner measures the returned HTML: transport, title, description, language, canonical declaration, viewport, headings, image alt attributes, links, scripts, JSON-LD presence, robots directives, text length, and CSP presence. Counts do not imply semantic quality, security, rankings, performance, or site-wide coverage.
7. Optional OpenAI recommendations use bounded evidence, no tools, structured output, an explicit configured model, and evidence-ID validation. Untrusted page text is data, not an instruction. Recommendations are suggestions requiring human review. Page noai/noindex/nosnippet/none directives conservatively exclude this step.
8. One observation retains measurements, fetched URL, extraction, coverage limits, and AI status/results in existing metadata JSON. The worker requires the inserted row to be returned with matching source/scan/public IDs before attempting completion.
9. Signal displays retained observations, evidence, recommendations, sources and up to 50 historical scans. AI displays up to 200 real contexts with the same evidence; fixture decisions/runs are no longer supplied. Cross-scan patterns are explicitly unavailable.
10. Historical completed rows lacking visible retained observations are presented as unverified. No historical row is modified or fabricated/backfilled.

## Configuration to verify independently

No environment values were read or modified by the smoke test. Database-backed runtime prerequisites:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the app.
- `SUPABASE_SERVICE_ROLE_KEY` and `WEBSITE_SCAN_TRIGGER_SECRET` for the worker endpoint and scheduled dispatcher.
- `ALYOXA_SCAN_APP_URL` (or Netlify `URL`) must target the intended deployment. Verify the dispatcher, endpoint, UI, and inspected database identify the same project; matching variable names alone are insufficient.
- Optional server-only `OPENAI_API_KEY` and `OPENAI_WEBSITE_MODEL`. Neither has a hardcoded fallback. Select a model supporting Responses structured output in your account. Evidence is sent to OpenAI only when both are configured and page directives allow it. `store: false` is requested. Provider billing, account access, retention policy, and deployment timeout remain operator responsibilities.

No paid inference call was made in this implementation session. Provider behavior was tested using mocked responses. API shape follows [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Reproducible local verification (no database)

From the application directory:

```powershell
node node_modules/jest/bin/jest.js --runInBand --no-cache
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm.cmd run lint
node scripts/check-public-websites.cjs https://example.com/ https://www.w3.org/TR/WCAG22/ https://www.wikipedia.org/ https://httpbin.org/status/403 https://httpbin.org/deny 'https://httpbin.org/redirect-to?url=https%3A%2F%2Fexample.com%2F'
```

The smoke script transpiles only scanner helpers in memory, performs safe public fetch/extraction, and prints JSON. It does not import Supabase, read configuration secrets, invoke AI, or persist anything. URLs are CLI arguments, never production branches. Public responses may change over time.

Observed on 2026-10-29:

| Input | Outcome |
| --- | --- |
| Example Domain | HTTP 200; sparse HTML explicitly flagged as limited coverage |
| W3C WCAG 2.2 document | HTTP 200; technical/content/SEO evidence extracted |
| Wikipedia portal | HTTP 200; different HTML structure measured by identical code |
| httpbin `/status/403` | Explicit HTTP 403 failure |
| httpbin `/deny` | Robots disallow; target content not fetched |
| httpbin redirect to Example Domain | Followed public redirect and checked destination robots |

Initial sandbox-network failures were not interpreted as website behavior; these results came from the approved network-enabled run. JavaScript-shell, private-network, malformed provider, insert failure, and missing returned-row cases are deterministic automated tests, not claims about these live domains.

## End-to-end acceptance: owner-operated nonproduction environment

The following exercise writes scans/observations and may incur AI charges. It was **not executed** here. Use a disposable/staging project only after the owner verifies the prerequisites above. Do not point acceptance tests at production.

1. Start the app using the existing project scripts and owner-provided staging configuration. Verify project identity independently. Sign in as workspace A owner/admin.
2. Submit a supported public origin. Capture returned scan UUID. Confirm the form does not save separately before connection; errors must not be presented as successful analysis.
3. Let the existing scheduled function dispatch, or use the staging endpoint with the operator's existing trigger secret. Do not put secrets in command history or screenshots.
4. Open Signal. Match the scan UUID to a retained observation and its fetched URL. Confirm actual title/evidence differ between two independently chosen websites. Coverage must say partial and explain origin scope. Open AI and locate the exact observation public ID. No example contexts should appear in a new empty workspace.
5. Without AI configuration, require `unavailable`, no invented recommendations. With authorized staging AI configuration, require a retained model identifier and recommendations referencing stored evidence IDs, or an explicit excluded/error result. AI failure must not erase measured evidence.
6. Repeat after a terminal scan. Require a new scan/observation preserving earlier history. Double-submit while active; require reuse or a clear throttle response, not duplicate active rows.
7. Submit restricted/unavailable input. Require failed status and a specific reason, with no invented measurements or completion. An inaccessible robots policy must prevent fetching the target page.
8. Switch to workspace B. Require no workspace A observations, sources, or scan history. Test anonymous access and regular-member submission separately; current policy must reject unauthorized operations.
9. Using a staging fault harness, reject observation insertion or return no inserted row. Require failure and no completion attempt. Interrupt completion after insertion; retained evidence may remain, but the scan must not claim success.
10. Inspect existing completed-without-evidence rows read-only. They must be labeled unverified. Running a new scan must not overwrite those historical records.
11. Treat path/query-specific immutable scans, long hostnames, nonstandard ports, and additional user roles as **not passed** until the database contract is reviewed and updated. The public smoke script's ability to fetch a path does not establish queueing support for that path.

## Reliability limits

Insertion and completion remain separate database transactions; a later deletion cannot be prevented by application-side verification. No historical cause for the live empty table has been proven or repaired retrospectively. No stale-processing lease recovery or transactional finalization RPC was invented. Dispatcher failures retain the existing fail-fast behavior rather than introducing automatic retries. One queued scan is dispatched per scheduled invocation. Broader crawl, rendered JavaScript, PDFs, non-UTF8 conversion, decompression, and site-wide analysis are not implemented. Non-HTML and compressed responses are explicitly rejected. Strict quotas and race-proof completion invariants require database design review.

## Recorded automated results

- Jest: **33 suites, 188 tests passed**, including persistence verification/failure, historical evidence checks, atomic submission, tenant scoping, robots/crawl-delay, SSRF redirects/DNS, extraction, AI configuration/provider validation, and escaped results rendering.
- TypeScript: `tsc --noEmit --incremental false` passed.
- ESLint: zero errors; three pre-existing warnings in `jest.config.js`, `src/app/app/page.tsx`, and `src/components/os/OverviewSidebar.tsx`.
- `git diff --check` passed.
- Six public smoke cases passed their expected fetched/unavailable outcomes. These are transport/extraction tests, not database end-to-end proof.

## Changed-file inventory

Application/orchestration:

- `src/actions/signal/submitWebsiteAnalysis.ts` (new)
- `src/actions/signal/listWorkspaceWebsiteScans.ts` (new)
- `src/actions/signal/listWorkspaceObservations.ts`
- `src/actions/signal/getWebsiteScanStatus.ts`
- `src/actions/signal/getLatestWebsiteScanStatus.ts`
- `src/components/os/workspace/WorkspaceSignalEntry.tsx`
- `src/lib/os/signal/websiteScanProcessor.ts`
- `src/lib/os/signal/websiteScanDispatcher.ts`
- `src/lib/os/signal/websiteFetch.ts` (new; extracted and hardened transport)
- `src/lib/os/signal/websiteIntelligence.ts` (new)
- `src/lib/os/signal/websiteRecommendations.ts` (new)
- `src/lib/os/signal/retainedScanStatus.ts` (new)
- `src/lib/os/signal/persistedWebsiteContexts.ts` (new)

Product views:

- `src/app/app/signal/page.tsx`
- `src/app/app/ai/page.tsx`
- `src/components/os/signal/SignalHeader.tsx`
- `src/components/os/signal/PersistedSignalWorkspace.tsx`
- `src/components/os/signal/WebsiteObservationDetails.tsx` (new)
- `src/components/os/ai/AICoreHeader.tsx`

Verification and documentation:

- `src/actions/signal/__tests__/submitWebsiteAnalysis.test.ts` (new)
- `src/actions/signal/__tests__/listWorkspaceObservations.test.ts`
- `src/actions/signal/__tests__/websiteScanLifecycleActions.test.ts`
- `src/lib/os/signal/__tests__/websiteScanDispatcher.test.ts`
- `src/lib/os/signal/__tests__/websiteScanProcessor.test.ts` (new)
- `src/lib/os/signal/__tests__/websiteFetch.test.ts` (new)
- `src/lib/os/signal/__tests__/websiteIntelligence.test.ts` (new)
- `src/lib/os/signal/__tests__/websiteRecommendations.test.ts` (new)
- `src/lib/os/signal/__tests__/retainedScanStatus.test.ts` (new)
- `src/lib/os/signal/__tests__/websiteResults.test.ts` (new)
- `scripts/check-public-websites.cjs` (new)
- `docs/website-intelligence-acceptance.md` (this document)

The endpoint, Netlify scheduled-function wrapper, SQL migrations, configuration, package manifests, and secrets were not modified. The pre-existing two untracked migration drafts are not part of this change.
