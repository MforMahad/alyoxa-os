/** Adapted from SEOCORE (MIT), Copyright (c) 2026 SEOCore contributors.
 * Source d8ecfec24d253964131423db6b4f100fca86069f:
 * packages/rules-core/src/{indexes/index.ts,metadata/title.ts,indexing.ts}.
 * Full notice: third-party/SEOCORE-LICENSE.txt. No upstream crawler or runtime.
 */
import type { WebsiteIssue } from './websiteIssues'

export interface SeoPage {
  url: string
  observationId: string
  auditId: string | null
  values: ReadonlyMap<string, unknown>
}
const definitions = [
  { ruleId: 'duplicate_title', title: 'Repeated page titles', severity: 'low' as const,
    recommendedFix: 'Review pages sharing a title. Give distinct pages descriptive, unique titles; intentional alternate versions may legitimately share one.' },
  { ruleId: 'duplicate_description', title: 'Repeated meta descriptions', severity: 'low' as const,
    recommendedFix: 'Review pages sharing a description. Write page-specific summaries for distinct pages; intentional alternate versions may legitimately share one.' },
  { ruleId: 'invalid_canonical', title: 'Invalid absolute canonical URL', severity: 'medium' as const,
    recommendedFix: 'Use a valid public HTTP or HTTPS URL without embedded credentials for the intended canonical page. Review the saved declaration before changing it.' },
  { ruleId: 'canonical_to_noindex', title: 'Canonical points to a page declaring noindex', severity: 'medium' as const,
    recommendedFix: 'Review the preferred-page intent. Choose an indexable canonical target, or revise indexing directives only if that page should appear in search. Keep intentional private pages excluded.' },
]
const limitations = [
  'Compared only completed retained pages in the same audit and origin; undiscovered or unavailable pages remain unknown.',
  'Duplicate text is a review finding, not proof of duplicate content or a ranking penalty. Canonical intent and Google indexing are not verified.',
]

// Adapted from SEOCORE normalizeTitle / normalizeMetaDesc and duplicate indexes.
function normalized(value: string) { return value.trim().toLowerCase().replace(/\s+/g, ' ') }
function text(page: SeoPage, key: string, cap: number): string | null {
  const value = page.values.get(key)
  // Existing extractors truncate at these caps without a completeness marker.
  // Equal prefixes at a cap cannot prove complete values are duplicates.
  return typeof value === 'string' && value.length < cap ? value : null
}
function absoluteCanonical(page: SeoPage) {
  const raw = text(page, 'canonical', 2048)
  // Relative declarations may depend on an unretained <base>. Never guess.
  if (!raw?.trim() || !/^[a-z][a-z0-9+.-]*:/i.test(raw.trim())) return null
  try {
    const url = new URL(raw.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return { raw, target: null }
    url.hash = ''
    return { raw, target: url.href }
  } catch { return { raw, target: null } }
}
function noindex(page: SeoPage) {
  const refs: WebsiteIssue['evidenceReferences'] = []
  const meta = text(page, 'robots_meta', 500), header = text(page, 'robots_header', 500)
  for (const [key, value] of [['robots_meta', meta], ['robots_header', header]] as const) {
    // Scoped headers need a crawler identity; only use unqualified directives.
    if (value !== null && !value.includes(':') && value.toLowerCase().split(/[\s,]+/).some(token => token === 'noindex' || token === 'none'))
      refs.push({ observationId: page.observationId, evidenceId: key, value })
  }
  return { refs, known: refs.length > 0 || (meta !== null && header !== null) }
}
export function buildSeoIssueGroups(pages: SeoPage[]) {
  const groups = definitions.map(definition => ({ ...definition, measuredPages: 0, unknownPages: pages.length,
    affectedUrls: [] as string[], issues: [] as WebsiteIssue[] }))
  const scoped = new Map<string, SeoPage[]>()
  for (const page of pages) if (page.auditId) {
    const key = JSON.stringify([page.auditId, new URL(page.url).origin])
    scoped.set(key, [...(scoped.get(key) ?? []), page])
  }
  function issue(index: number, page: SeoPage, refs: WebsiteIssue['evidenceReferences'], extra: string[] = []) {
    const group = groups[index]
    group.issues.push({ ruleId: group.ruleId, title: group.title, severity: group.severity, confidence: 'high',
      affectedUrl: page.url, evidenceReferences: refs, recommendedFix: group.recommendedFix, limitations: [...limitations, ...extra] })
  }
  for (const batch of scoped.values()) {
    for (const [index, key, cap] of [[0, 'title', 250], [1, 'description', 500]] as const) {
      const eligible = batch.filter(page => { const value = text(page, key, cap); return value !== null && normalized(value) !== '' })
      if (new Set(eligible.map(p => p.observationId)).size < 2) continue
      groups[index].measuredPages += eligible.length
      const buckets = new Map<string, SeoPage[]>()
      for (const page of eligible) {
        const value = normalized(text(page, key, cap)!)
        buckets.set(value, [...(buckets.get(value) ?? []), page])
      }
      for (const peers of buckets.values()) for (const page of peers) {
        const peer = peers.find(other => other.url !== page.url && other.observationId !== page.observationId)
        if (peer) issue(index, page, [page, peer].map(p => ({ observationId: p.observationId, evidenceId: key, value: text(p, key, cap)! })),
          ['Case and whitespace are normalized; capped measurements are excluded. Evidence includes a retained matching peer.'])
      }
    }
    // Adapted from SEOCORE CanonicalIssuesRule's retained target/noindex lookup.
    // Unlike upstream, a non-self or missing canonical alone is not a defect.
    const byUrl = new Map(batch.map(p => [p.url, p]))
    for (const page of batch) {
      const canonical = absoluteCanonical(page)
      if (!canonical?.target || canonical.target === page.url || noindex(page).refs.length) continue
      const target = byUrl.get(canonical.target)
      if (!target || target.observationId === page.observationId) continue
      const directive = noindex(target)
      if (!directive.known) continue
      groups[3].measuredPages++
      if (directive.refs.length) issue(3, page, [{ observationId: page.observationId, evidenceId: 'canonical', value: canonical.raw }, ...directive.refs],
        ['The first retained HTML canonical points to a measured target with an explicit noindex directive. No target request or search-engine index check was made.'])
    }
  }
  // Syntax-only check also works for a single saved Quick Scan.
  for (const page of pages) {
    const canonical = absoluteCanonical(page)
    if (!canonical) continue
    groups[2].measuredPages++
    if (!canonical.target) issue(2, page, [{ observationId: page.observationId, evidenceId: 'canonical', value: canonical.raw }],
      ['Only the first declared canonical was retained. Relative, absent and capped declarations are not assessed.'])
  }
  return groups.map(group => ({ ...group, unknownPages: pages.length - group.measuredPages,
    affectedUrls: group.issues.map(i => i.affectedUrl) }))
}
