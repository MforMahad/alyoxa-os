export function SignalHeader({ sourceCount }: { sourceCount?: number }) {
  return <header className="border-b border-[var(--border)] px-6 py-4 flex justify-between text-xs font-mono">
    <span>SIGNAL // WORKSPACE OBSERVATIONS</span>
    <span>{sourceCount === undefined ? 'Sources unavailable' : sourceCount + ' persisted sources'} ? Ingestion rate not measured</span>
  </header>
}
