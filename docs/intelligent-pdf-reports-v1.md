# Intelligent PDF Reports V1

Read-only exports of a selected retained Quick Scan or Full Website Audit. Download PDF appears on the Results tab for scan/audit entries; legacy observations without a run identity are not guessed into a report.

GET /api/reports/website/{scan|audit}/{run UUID} uses the signed Supabase session, verified user and revalidated active workspace. Every run/page/observation query is workspace-scoped; no service-role client, database mutations, scans, model calls, monitoring changes, public storage or external font fetches. Responses are private/no-store. In-progress or missing/ambiguous evidence returns 409; unknown/inaccessible runs return 404; oversized reports return 413; unexpected failures return a fixed 503 code. Export authorization never trusts UI history or a supplied workspace ID.

The loader pages run records and batches exact linked observations, independent of the 200-observation UI window. A failed/partial terminal run can be exported with explicit coverage outcomes. Completed pages missing their retained observation are rejected. Large exports fail rather than silently truncate evidence.

The typed builder reuses websiteIssues.ts versioned deterministic findings and fixes. Severity is review priority, not a score. Saved evidence-linked AI suggestions remain unverified, never regenerated. Navigation-only coverage is partial; missing measurements and failed/skipped pages are not clean results. Quick Scan origin-only historical limitations remain explicit.

Quick Scan and Full Audit retain distinct single-URL versus navigation-limited coverage language. Both use font-measured text blocks, bounded multi-line table fragments and content-based page packing; table introductions stay with their first rows and small final tails are rebalanced. Only the branded cover forces a page break. Full Audit groups the same rule/fix across affected URLs rather than repeating the fix per URL. Complete original URLs remain clickable and are printed in retained page evidence; finding references can use concise page labels.

Every retained measurement, additional measurement field, supporting reference, saved recommendation/caveat and resource provenance is preserved. Quick Scan no longer limits AI output to three excerpts. Typical concise scans remain short, but dense or long saved evidence can exceed three pages rather than being clipped or silently omitted. Raw page-level limitations are explicitly separated from aggregate audit coverage.

Rendering uses @react-pdf/renderer and existing local Satoshi fonts. next.config.ts explicitly includes these fonts in serverless output tracing. Latin Unicode typography is supported; unsupported glyphs are shown as explicit [U+...] codes, not silently omitted or translated. Broader script typography requires a separately reviewed licensed font. Links allow HTTP(S) only and reject embedded credentials. Reports contain private workspace evidence: share downloaded files carefully.

Offline verification:
- npx jest --runInBand
- node scripts/test-website-pdf.mjs
- node scripts/test-website-pdf-pagination.mjs
- python scripts/verify-website-pdf-pagination.py (optional local PyMuPDF required)
- npx tsc --noEmit --incremental false
- npm run lint
- npm run build

The renderer checks use synthetic historical evidence only. The pagination matrix covers 1/5/12/30/50 candidate URLs, sparse/dense measurements, long URLs and unbroken values, complete saved-AI fixtures, redirects, failed/skipped pages and structured values. It writes fixture PDFs and a complete-evidence manifest under preview-output/pdf-pagination. The independent optional Python audit extracts actual PDF text, checks every expected measurement/record/recommendation, checks full clickable URLs and page numbers, verifies A4/text bounds, and rasterizes representative boundaries. Font/layout tests do not establish browser download behavior, deployed packaging or actual Supabase RLS access. No database migration or monitoring activation is required.
