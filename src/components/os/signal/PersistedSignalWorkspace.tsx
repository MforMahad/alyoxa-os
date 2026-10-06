import type {
  PersistedSignalFeedSource,
  PersistedSignalObservation,
} from '@/data/os/signal'

interface PersistedSignalWorkspaceProps {
  activeTab: 'live_stream' | 'sources'
  observations: PersistedSignalObservation[]
  sources: PersistedSignalFeedSource[]
  observationError?: string
  sourceError?: string
}

export function PersistedSignalWorkspace({
  activeTab,
  observations,
  sources,
  observationError,
  sourceError,
}: PersistedSignalWorkspaceProps) {
  if (activeTab === 'sources') {
    return (
      <section className="border border-[var(--border)] bg-[var(--surface)]/10 font-mono text-xs">
        <div className="border-b border-[var(--border)]/40 bg-[var(--surface)]/30 px-4 py-2 text-[10px] uppercase tracking-widest text-[var(--muted)]">
          Persisted Workspace Sources ({sourceError ? 'UNAVAILABLE' : sources.length})
        </div>
        {sourceError ? (
          <div className="p-8 text-center text-[var(--muted)]">Signal sources are unavailable.</div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center text-[var(--muted)]">No persisted Signal sources for this workspace.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]/40">
            {sources.map((source) => (
              <article key={source.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h2 className="font-bold text-[var(--foreground)]">{source.name}</h2>
                  <p className="text-[10px] uppercase text-[var(--muted)]">
                    {source.source_type}{source.source_key ? ` // ${source.source_key}` : ''}
                  </p>
                  {source.description && <p className="text-[11px] text-[var(--muted)]">{source.description}</p>}
                </div>
                <div className="text-[10px] text-[var(--muted)] sm:text-right">
                  <div>RECORDED STATUS: {source.status}</div>
                  <time dateTime={source.created_at}>CREATED: {source.created_at}</time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    )
  }

  const sourceNames = new Map(sources.map((source) => [source.id, source.name]))

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)]/10 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[var(--border)]/40 bg-[var(--surface)]/30 px-4 py-2 text-[10px] uppercase tracking-widest text-[var(--muted)]">
        <span>Persisted Website Observations ({observationError ? 'UNAVAILABLE' : observations.length})</span>
        <span>OBSERVED AT</span>
      </div>
      {observationError ? (
        <div className="p-8 text-center text-[var(--muted)]">Persisted Signal observations are unavailable.</div>
      ) : observations.length === 0 ? (
        <div className="space-y-1 p-8 text-center text-[var(--muted)]">
          <div>No persisted website observations yet.</div>
          <div className="text-[10px]">Observations will appear here after a workspace website scan is recorded.</div>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]/40">
          {observations.map((observation) => (
            <article key={observation.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                    {observation.severity.toUpperCase()}
                  </span>
                  <span className="text-[10px] uppercase text-[var(--muted)]">
                    {sourceNames.get(observation.source_id) ?? 'Persisted Signal source'} {'//'} {observation.category}
                  </span>
                </div>
                <time className="text-[10px] text-[var(--muted)]" dateTime={observation.observed_at}>
                  {observation.observed_at}
                </time>
              </div>
              <h2 className="font-bold text-[var(--foreground)]">{observation.title}</h2>
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">{observation.description}</p>
            </article>
          ))}
        </div>
      )}
      <div className="border-t border-[var(--border)]/40 px-4 py-2 text-[10px] text-[var(--muted)]">
        SOURCE: PERSISTED WORKSPACE RECORDS
      </div>
    </section>
  )
}