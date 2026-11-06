import type { buildWebsiteIssueReport } from '@/lib/os/signal/websiteIssues'

type Report = ReturnType<typeof buildWebsiteIssueReport>
const resourceStatus: Record<string, string> = {
  available: 'File retrieved', parsed: 'Sitemap structure recognized', missing: 'File not found',
  restricted: 'Access restricted', unavailable: 'Could not verify availability',
  unverified_cache: 'Previously cached; HTTP status not recorded', robots_restricted: 'Check excluded by robots rules',
  unrecognized_xml: 'Response was not a recognized sitemap', unsafe_xml_declaration: 'XML declaration excluded by scanner safety rules',
  size_limit: 'File exceeded the inspection size limit', element_limit: 'File exceeded the inspection structure limit',
  unsupported_encoding: 'File encoding is not supported by this scanner', outside_origin_redirect: 'Redirect left the permitted site',
  redirect_limit_or_loop: 'Redirect loop or scanner redirect limit reached', unsafe_destination: 'Destination excluded by scanner safety rules',
  unreadable: 'Robots rules could not be read', redirect_not_followed: 'Robots redirect was not followed',
  redirect: 'Redirect observed', unsafe_redirect: 'Redirect excluded by scanner safety rules',
  unsupported_crawl_delay: 'Requested crawl delay exceeds scanner support',
}

/** Presentation only: retained evidence and the deterministic report stay intact. */
export function WebsiteIssueSummary({ report }: { report: Report }) {
  const priority = { medium: 0, low: 1 }
  const detected = report.groups.filter(group => group.issues.length).sort((a, b) => priority[a.severity] - priority[b.severity])
  const other = report.groups.filter(group => !group.issues.length)
  const issueCount = detected.reduce((count, group) => count + group.issues.length, 0)
  const affectedPages = new Set(detected.flatMap(group => group.affectedUrls)).size
  const measured = report.groups.reduce((count, group) => count + group.measuredPages, 0)
  const unknown = report.groups.some(group => group.unknownPages > 0) || report.coverage.completedPages > report.coverage.analyzedPages
  return <section aria-label="Website issue intelligence" className="min-w-0 border border-[var(--border)] p-3 space-y-4">
    <h3>Website issues</h3>
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div><dt>Detected issues</dt><dd>{issueCount}</dd></div>
      <div><dt>Affected pages</dt><dd>{affectedPages}</dd></div>
      <div><dt>Analyzed pages</dt><dd>{report.coverage.analyzedPages}</dd></div>
    </dl>
    <p>Partial coverage: these results cover analyzed pages only. Other pages and unsupported checks may have issues.</p>
    {!issueCount && <p>{measured
      ? 'No issues detected. Supported checks with available measurements passed on the analyzed pages.'
      : 'No issues detected yet: there is not enough retained evidence to assess the supported checks.'}</p>}
    {unknown && <p>Some checks could not be assessed because retained measurements are missing or incomplete.</p>}
    {detected.map(group => <article key={group.ruleId} className="min-w-0 border-t pt-3 space-y-2">
      <h4>{group.title} <span className="inline-block border border-[var(--border)] px-2 py-1">{group.severity === 'medium' ? 'Medium priority' : 'Low priority'}</span></h4>
      <p>{group.affectedUrls.length} affected of {group.measuredPages} assessed pages.</p>
      <p><strong>Recommended fix:</strong> {group.recommendedFix}</p>
      <ul aria-label={`Affected pages: ${group.title}`} className="list-disc pl-5 space-y-1">
        {group.affectedUrls.map(url => <li key={url} className="break-words [overflow-wrap:anywhere]">{url}</li>)}
      </ul>
      <details><summary className="cursor-pointer">Evidence and limitations</summary>
        <ul className="space-y-2 pt-2">{group.issues.map(issue => <li key={issue.affectedUrl} className="break-words [overflow-wrap:anywhere]">
          <p>{issue.affectedUrl} · Measurement confidence: {issue.confidence}</p>
          <p>{issue.evidenceReferences.map(ref => `${ref.evidenceId}=${String(ref.value)} (${ref.observationId ?? `page ${ref.pageId ?? 'unavailable'}`})`).join('; ')}</p>
          {issue.limitations.map(text => <p key={text}>{text}</p>)}
        </li>)}</ul>
      </details>
    </article>)}
    {other.length > 0 && <details className="border-t pt-3"><summary className="cursor-pointer">Other checks ({other.length})</summary>
      <ul className="space-y-2 pt-2">{other.map(group => <li key={group.ruleId}>
        {group.title}: {group.measuredPages ? `passed on ${group.measuredPages} assessed pages` : 'not assessed'}; {group.unknownPages} pages with unknown measurements.
      </li>)}</ul>
    </details>}
    {report.resources.length > 0 && <details className="border-t pt-3"><summary className="cursor-pointer">robots.txt and sitemap checks</summary>
      <p className="pt-2">These files describe crawl rules and sitemap locations. A missing file is not automatically a website defect. Access restrictions and scanner limits may prevent verification.</p>
      <ul className="space-y-2 pt-2">{report.resources.map(resource => <li key={JSON.stringify(resource)} className="break-words [overflow-wrap:anywhere]">
        <p>{resource.kind === 'robots' ? 'Robots rules' : 'Sitemap'}: {resourceStatus[resource.status] ?? 'Result needs technical review'}.</p>
        <p>{resource.url}</p>
        <details><summary className="cursor-pointer">Technical result</summary><p>{resource.status}; HTTP {resource.httpStatus ?? 'not recorded'}</p></details>
      </li>)}</ul>
    </details>}
    <details className="border-t pt-3"><summary className="cursor-pointer">Coverage and technical limitations</summary>
      <p>{report.coverage.completedPages} completed page rows; {report.coverage.candidatePages} retained candidates; {report.coverage.pendingPages} pending; {report.coverage.failedPages} failed; {report.coverage.skippedPages} excluded.</p>
      <p>Detector version {report.version}. Priority suggests review order; it is not a health score. Confidence describes the HTML measurement, not business impact.</p>
      {report.limitations.map(text => <p key={text}>{text}</p>)}
    </details>
  </section>
}
