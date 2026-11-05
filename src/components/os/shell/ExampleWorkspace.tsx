import type { ReactNode } from 'react'
export function ExampleWorkspace({ purpose, children }: { purpose: string; children: ReactNode }) {
  return <section className="os-panel os-example-workspace"><h2>Explore an example</h2><p>{purpose}</p><p className="os-notice">These are demonstration records, not activity from your business. Selecting an item lets you inspect it; this page does not run work or send messages.</p>
    <details className="os-technical"><summary>Browse example records and technical details</summary><div className="os-legacy-content">{children}</div></details>
  </section>
}
