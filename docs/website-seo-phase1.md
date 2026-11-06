# Website SEO Phase 1 — saved evidence only

This change adapts selected MIT-licensed SEOCORE logic at commit `d8ecfec24d253964131423db6b4f100fca86069f`. It adds no dependency, crawler, network request, paid API, database migration or PDF layout change. Existing scan creation, workers, authorization and retained observations are unchanged. Existing report/UI consumers receive the extra groups through `buildWebsiteIssueReport` after their normal authorized reads.

## Adapted sources / MIT attribution

- [DuplicateTitleRule](https://github.com/codepurse/SEOCORE/blob/d8ecfec24d253964131423db6b4f100fca86069f/packages/rules-core/src/metadata/title.ts): repeated title lookup and per-page findings.
- [PageIndexRegistry](https://github.com/codepurse/SEOCORE/blob/d8ecfec24d253964131423db6b4f100fca86069f/packages/rules-core/src/indexes/index.ts): normalized title/description buckets (trim, lowercase, collapse whitespace) and duplicate-description lookup.
- [CanonicalIssuesRule](https://github.com/codepurse/SEOCORE/blob/d8ecfec24d253964131423db6b4f100fca86069f/packages/rules-core/src/indexing.ts): lookup of a retained canonical target and its noindex evidence. Absolute URL validation is the ALYOXA safety adaptation.
- Copyright (c) 2026 SEOCore contributors. Complete upstream MIT permission/disclaimer is preserved in [SEOCORE-LICENSE.txt](../third-party/SEOCORE-LICENSE.txt), with source attribution in `websiteSeoIssues.ts`. Keep both notices with distributions containing the adapted implementation. Upstream rule severities, fixed text-length advice, crawler, scores and blanket missing/non-self-canonical warnings were not adopted.

## Implemented findings

| Rule | Evidence required | Conservative interpretation |
| --- | --- | --- |
| `duplicate_title` | Nonempty complete title evidence on two distinct URLs/observations in the same audit and origin | Low-priority review of repeated normalized titles; not a content-duplication or ranking claim. |
| `duplicate_description` | Equivalent complete description evidence | Same scope/limitations as titles. |
| `invalid_canonical` | An explicit complete absolute canonical declaration | Medium-priority finding for malformed URLs, unsupported schemes or credentials. Does not fetch the URL. Works on Quick and Full results. |
| `canonical_to_noindex` | Absolute canonical plus a completed target in the same audit/origin with a retained unqualified noindex/none directive | Medium-priority review with exact source and target observation references. An already-noindex source or self-reference is not flagged. |

Only successfully completed pages with observation IDs and retained metadata enter these checks. Summary counts cannot substitute for page evidence. Missing/malformed/ambiguous evidence IDs stay unknown. Duplicate checks require `record_kind=audit_page` and the same retained `audit_id`; separate runs and Quick Scans are never combined to invent uniqueness findings. Redirect aliases collapse by final URL. A measured duplicate uses both observation links as proof; matching values do not prove the pages should be distinct.

The current extractor caps title/description/canonical measurements at 250/500/2048 UTF-16 string units without a truncation marker. Values at or above those caps are excluded from the new checks. Canonical lookup preserves path case, query and trailing-slash distinctions. Relative canonical declarations may depend on an unretained HTML base URL, so they are not resolved speculatively. Missing canonicals and ordinary non-self/cross-origin declarations alone are not classified as defects.

Issue report version is now **2**. The existing six-rule single-page detector remains version **1**. This isolated release excludes Monitoring V1 and its comparison compatibility edit from the original SEO commit. No monitoring code, migration, flag or schedule is included.

## Changed files

- `src/lib/os/signal/websiteSeoIssues.ts` — adapted pure SEO checks.
- `src/lib/os/signal/websiteIssues.ts` — existing findings pipeline integration and report version.
- `src/lib/os/signal/__tests__/websiteSeoIssues.test.ts` — positive/negative/unknown/scope/partial-coverage cases.
- `src/lib/os/signal/__tests__/websiteScanProcessor.test.ts` — legacy Quick persistence regression.
- `src/lib/os/signal/audit/__tests__/seoEvidence.test.ts` — coordinated Quick/Full extractor integration with transport doubles, no extra requests.
- This document and the upstream license notice.

## Remaining SEO features

Multiple canonical tags/counts, HTTP Link canonicals, HTML base resolution, canonical chains/loops, unseen/redirecting/error targets, rendered DOM differences, indexing status, search rankings, hreflang, broken-link graphs and validated structured data are not established by current retained measurements. They need separately approved evidence collection or integration. No whole-site completeness or ranking penalty is claimed. Live browser/production verification is separate from local application tests.

## Verification

Release validation runs from an isolated checkout based on `origin/main` at `1e6779c1d975d511525e90829cef523267f9cab6`. Only seven SEO files are changed relative to that baseline; the existing production PDF/report implementation is preserved. The original working tree and uncommitted work are untouched. No database/configuration changes, SQL execution or feature activation are included. Transport/database doubles are not live PostgreSQL or website validation.

- `npx.cmd jest --runInBand`: **64 suites / 415 tests passed**.
- `npx.cmd tsc --noEmit --incremental false`: exit 0.
- `npm.cmd run build`: exit 0; no monitoring worker endpoint is present.
- `npm.cmd run lint`: exit 0, one existing `jest.config.js` warning.
- Staged diff and allowlist checks passed. Monitoring migrations/functions and PDF/report changes are excluded.
