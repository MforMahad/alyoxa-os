export default function WorkspaceLoading() {
  return <div className="os-app-shell"><div className="os-workspace"><div className="os-content" role="status" aria-live="polite" aria-busy="true">
    <p className="os-eyebrow">ALYOXA OS</p><h1 className="mt-3 text-2xl font-semibold">Loading your workspace…</h1>
    <p className="mt-2 text-sm text-[var(--muted)]">Getting your website activity and available tools.</p>
    <div aria-hidden="true" className="mt-8 space-y-5 animate-pulse"><div className="h-56 rounded-2xl bg-[var(--surface-elevated)]" /><div className="h-24 rounded-xl bg-[var(--surface)]" /><div className="h-64 rounded-2xl bg-[var(--surface)]" /></div>
  </div></div></div>
}
