import type { ReactNode } from 'react'

type StatCardProps = { label: string; value: string; detail: string; icon?: ReactNode; trend?: string }
export function StatCard({ label, value, detail, icon, trend }: StatCardProps) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span>{icon && <div className="stat-icon">{icon}</div>}</div><strong>{value}</strong><div className="stat-meta"><small>{detail}</small>{trend && <b>{trend}</b>}</div></article>
}
