# Robots and sitemap evidence upgrade

Review candidate only. No SQL has been executed, flags enabled, or code deployed.

The coordinated Quick and Full workers reuse their existing robots requests and
capture HTTP status, final response URL and bounded Sitemap declarations. They
then check `/sitemap.xml` and the first different, supported same-origin declaration
(at most two logical sitemap checks per origin). External declarations are reported
but never fetched. XML locations and sitemap indexes do not feed page discovery.
Quick HTML redirects retain the existing cross-origin behavior; each new origin
gets its own policy and resource checks. Sitemap redirects stay same-origin.

Each sitemap hop uses one existing fenced host permit and the pinned DNS/IP-safe
fetcher: eight-second fetch budget, four redirects, 256 KiB, at most 10,000 XML tag
openers, no compressed responses. DTD/entity declarations are rejected before XML
inspection. Only supported UTF-8/ASCII declarations are accepted. Structure/counts
are reported without claiming XML schema validation, URL availability, complete
coverage, or AI recommendations. At most ten URL references/8 KiB are retained per
resource; raw XML is discarded.

Optional sitemap 404/403/errors, invalid XML and robots exclusion become cached
findings, not page failures or content retry attempts. Robots verification still
fails closed under the existing access rules; unavailable policy is never treated
as permission to fetch content. These findings are retained in job state even if
content cannot be fetched. Successful Quick/page observations include `site_checks`
and primitive SEO evidence. The deterministic audit summary includes the job's
resource findings. Previously retained observations are untouched.

Fresh shared results are reused for 24 hours; job snapshots survive for the job's
lifetime so later audit pages do not repeat sitemap checks. Existing 15-minute
robots permission caching remains unchanged: policy may need re-verification on a
long audit. Imported legacy robots bodies have status `unverified_cache` and null
HTTP/final URL rather than an invented 200. Resource redirects survive invocations;
every hop reacquires the host lease and honors crawl delay and absolute Retry-After.
Long Retry-After can exhaust a job's existing lifetime honestly. Optional checks
add up to two steps plus redirects, so scheduled completion takes longer.

## Manual review requirements

Upgrade SQL: `supabase/migration-drafts/20261104001000_website_site_checks.sql`.
Requires the deployed, reviewed Phase 1 schema/functions. It adds one disabled
runtime switch and private JSONB caches/snapshots, replaces four existing RPC bodies
with the same algorithms plus two private hooks, and adds a NEW-observation trigger
for summary enrichment. Existing signatures, RLS, grants, host pacing, replay
fencing, page discovery, and finalization contracts remain. Helpers have no API-role
EXECUTE grants. No new environment variables or dependencies are required.

Before manual application, compare the four deployed RPC definitions to Phase 1;
stop on drift. Executor must be the trusted `postgres` owner with BYPASSRLS, and
API roles must lack public-schema CREATE. Review existing observation triggers.
ALTER TABLE takes strong locks, with a five-second acquisition timeout and
120-second statement timeout; apply during an approved quiet window. The upgrade
is a one-time transactional draft, not an idempotent rerun script.

Deploy compatible application code before separately authorizing activation of
`website_audit_runtime.site_checks_enabled`. Keep existing switches unchanged.
Sitemap collection requires the already coordinated Quick/Full pipeline; the old
uncoordinated Quick fallback only adds evidence from its existing robots request
and performs no new sitemap I/O. With the new switch false, coordinated RPCs keep
the existing behavior. Do not enable the switch while old worker instances remain:
they do not understand `site_resource` claims. Disabling only the new switch stops
new checks; leases/retries recover through existing contracts. Preserve caches and
observations rather than dropping objects during rollback.

## Verification

Application tests include parser limits/declarations, robots metadata, resource
HTTP errors, redirect/Retry-After, private-address refusal, robots exclusions and
page evidence without duplicate requests. Migration source-contract tests compare
each replaced RPC algorithm against Phase 1; these are not database validation.

`supabase/tests/website_site_checks.sql` is a real pgTAP suite for a separately
configured **disposable local** database with baseline, Phase 1 and this upgrade
applied. It covers ordered/bounded resource selection, stale leases, redirects,
host deadlines, replay, cache reuse across pages and modes, and retained summary
and Quick observations. It changes test clocks/creates fixtures and rolls back;
never run it against production. Existing Phase 1 isolation suites must also pass.
SQL compilation, transaction/RLS behavior and live workers remain unverified until
those PostgreSQL tests and a separately approved canary run.
