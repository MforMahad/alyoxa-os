# Intelligent PDF Reports V1

Read-only exports of a selected retained Quick Scan or Full Website Audit. Download PDF appears on the Results tab for scan/audit entries; legacy observations without a run identity are not guessed into a report.

GET /api/reports/website/{scan|audit}/{run UUID} uses the signed Supabase session, verified user and revalidated active workspace. Every run/page/observation query is workspace-scoped; no service-role client, database mutations, scans, model calls, monitoring changes, public storage or external font fetches. Responses are private/no-store. In-progress or missing/ambiguous evidence returns 409; unknown/inaccessible runs return 404; oversized reports return 413; unexpected failures return a fixed 503 code. Export authorization never trusts UI history or a supplied workspace ID.

The loader pages run records and batches exact linked observations, independent of the 200-observation UI window. A failed/partial terminal run can be exported with explicit coverage outcomes. Completed pages missing their retained observation are rejected. Large exports fail rather than silently truncate evidence.

The typed builder reuses websiteIssues.ts versioned deterministic findings and fixes. Severity is review priority, not a score. Saved evidence-linked AI suggestions remain unverified, never regenerated. Navigation-only coverage is partial; missing measurements and failed/skipped pages are not clean results. Quick Scan origin-only historical limitations remain explicit.

Quick Scan has three concise sections (overview, compact fixes, evidence), with at most three explicitly labeled AI excerpts. Full Audit has executive summary, coverage, action plan, URL-level findings, resource checks, optional saved suggestions and expanding technical appendices. Pagination grows with actual content. Pathological long retained content can require additional pages; evidence is not silently dropped to meet a page target.

Rendering uses @react-pdf/renderer and existing local Satoshi fonts. next.config.ts explicitly includes these fonts in serverless output tracing. Latin Unicode typography is supported; unsupported glyphs are shown as explicit [U+...] codes, not silently omitted or translated. Broader script typography requires a separately reviewed licensed font. Links allow HTTP(S) only and reject embedded credentials. Reports contain private workspace evidence: share downloaded files carefully.

Offline verification:
- npx jest --runInBand
- node scripts/test-website-pdf.mjs
- npx tsc --noEmit --incremental false
- npm run lint
- npm run build

The renderer check uses synthetic historical evidence, embeds local fonts, validates safe link annotations and exercises one/max-six Quick findings plus 1/12/50-URL Full Audits. It creates and removes only temporary compiled files in node_modules/.cache. It does not access Supabase or call external services. Runtime/browser download behavior, actual Supabase RLS access and deployed function packaging still need controlled verification. No database migration or monitoring activation is required.
