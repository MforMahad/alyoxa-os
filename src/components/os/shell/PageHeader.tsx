import type { ReactNode } from 'react'
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="os-page-heading">
    <div>{eyebrow && <p className="os-eyebrow">{eyebrow}</p>}<h1>{title}</h1><p className="os-page-description">{description}</p></div>
    {action && <div className="os-page-actions">{action}</div>}
  </div>
}
