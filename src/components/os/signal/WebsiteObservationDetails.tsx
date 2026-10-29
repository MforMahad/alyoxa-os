/** Render stored evidence as text, never website HTML or model-generated markup. */
export function WebsiteObservationDetails({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== 'object') return <p>No structured evidence was retained for this historical observation.</p>
  const data = metadata as Record<string, unknown>
  const evidence = Array.isArray(data.evidence) ? data.evidence : []
  const ai = data.ai && typeof data.ai === 'object' ? data.ai as Record<string, unknown> : null
  return <div className="space-y-3 text-xs">
    <p>Fetched URL: {typeof data.fetched_url === 'string' ? data.fetched_url : 'Not recorded'}</p>
    <p>Coverage: {typeof data.coverage === 'string' ? data.coverage : 'Historical coverage unknown'}</p>
    {Array.isArray(data.limitations) && <ul className="list-disc pl-5">{data.limitations.filter(x => typeof x === 'string').map((x, i) => <li key={i}>{x}</li>)}</ul>}
    <dl className="grid gap-2 sm:grid-cols-2">{evidence.map((item, index) => {
      if (!item || typeof item !== 'object' || typeof item.label !== 'string' || !['string', 'number', 'boolean'].includes(typeof item.value)) return null
      return <div key={index} className="border border-[var(--border)] p-2"><dt>{item.label} [{String(item.id)}]</dt><dd className="break-words">{String(item.value) || '(absent)'}</dd></div>
    })}</dl>
    <p>AI recommendations: {ai && typeof ai.status === 'string' ? ai.status : 'Not generated for this observation'}</p>
    {typeof ai?.reason === 'string' && <p>{ai.reason}</p>}
    {typeof ai?.model === 'string' && <p>Model: {ai.model}. Suggestions require human review.</p>}
    {Array.isArray(ai?.recommendations) && ai.recommendations.map((item, index) => {
      if (!item || typeof item !== 'object' || typeof item.recommendation !== 'string') return null
      return <article key={index} className="border border-[var(--border)] p-3"><p>{item.recommendation}</p><p>Evidence: {Array.isArray(item.evidenceIds) ? item.evidenceIds.filter((x: unknown) => typeof x === 'string').join(', ') : 'Unavailable'}</p><p>{typeof item.caveat === 'string' ? item.caveat : ''}</p></article>
    })}
  </div>
}
