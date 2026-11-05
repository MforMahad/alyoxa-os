import Link from 'next/link'
import type { PersistedSignalFeedSource, PersistedSignalObservation } from '@/data/os/signal'
import { groupWebsiteResults, observationMetadata } from '@/lib/os/signal/websiteResultGroups'
import { buildWebsiteIssueReport } from '@/lib/os/signal/websiteIssues'

export function WebsiteOverview({ sources, observations, resultsAvailable }: { sources: PersistedSignalFeedSource[]; observations: PersistedSignalObservation[]; resultsAvailable: boolean }) {
  const groups = groupWebsiteResults(observations, sources).filter(group => sources.some(source => source.id === group.id && source.source_type === 'website'))
  return <section className="os-panel os-section-body"><div className="os-section-title"><div><h2>Your websites</h2><p>Start with the latest saved check for each website.</p></div><Link href="/app/signal?tab=sources" className="os-text-link">All websites</Link></div>
    {!groups.length ? <div className="os-empty-state"><h3>Add your first website</h3><p>A website check measures public pages and shows supported issues and recommended fixes.</p><a href="#website-checks" className="os-button os-button-teal">Add and check a website</a></div> : groups.map(group => {
      const run = group.runs[0]
      const pages = run?.observations.filter(o => o.category !== 'website_audit_summary').map(o => ({ url: String(observationMetadata(o.metadata).fetched_url ?? ''), status: 'completed', observation_id: o.id, metadata: o.metadata })) ?? []
      const report = buildWebsiteIssueReport(pages)
      const issues = report.groups.reduce((n, g) => n + g.issues.length, 0)
      const measured = report.groups.some(g => g.measuredPages > 0)
      const source = sources.find(s => s.id === group.id)!
      return <article key={group.id} className="os-website-row"><div className="min-w-0"><h3 className="break-words">{group.label}</h3><p>{!resultsAvailable ? 'Saved results could not be loaded.' : !run ? 'No saved check in the recent history. Start a check below.' : !measured ? 'Saved results exist, but supported issue measurements are unavailable.' : issues ? `${issues} supported findings in ${report.coverage.analyzedPages} loaded pages. Review the fixes next.` : `No supported issues found in ${report.coverage.analyzedPages} loaded pages. This does not verify the whole website.`}</p>
        {run && <p className="os-subtle">Latest loaded result: {new Date(run.timestamp).toLocaleString('en', { timeZone: 'UTC' })} UTC</p>}
        <details><summary>Technical details</summary><p>Connection record: {source.status}. This does not prove the website is reachable.</p><p>Findings use the most recent loaded result, within the latest 200 workspace measurements. Historical pages can be outside this window.</p></details>
      </div><Link href={'/app/ai?website=' + encodeURIComponent(group.id) + (run ? '&result=' + encodeURIComponent(run.id) : '')} className="os-button os-button-outline">{run ? 'View results & fixes' : 'View website'}</Link></article>
    })}
  </section>
}
