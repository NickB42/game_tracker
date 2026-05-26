import Link from 'next/link'
import { ReactNode } from 'react'

interface StatItem {
  label: string
  value: string | number
}

interface ListItemCardProps {
  title: string
  subtitle?: string
  stats?: StatItem[]
  actions?: ReactNode
  href?: string
  badge?: {
    label: string
    variant?: 'default' | 'success' | 'warning' | 'danger'
  }
}

export function ListItemCard({
  title,
  subtitle,
  stats,
  actions,
  href,
  badge,
}: ListItemCardProps) {
  const Wrapper = href ? Link : 'div'
  const wrapperProps = href ? { href } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className="app-card group cursor-pointer active:scale-95 transition-transform active:duration-75"
    >
      {/* Header: title, badge, actions */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{title}</h3>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
        {badge && (
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
              badge.variant === 'success'
                ? 'bg-[var(--success)]/15 text-[var(--success)]'
                : badge.variant === 'warning'
                  ? 'bg-[var(--warning)]/15 text-[var(--warning)]'
                  : badge.variant === 'danger'
                    ? 'bg-[var(--danger)]/15 text-[var(--danger)]'
                    : 'bg-text-muted/15 text-text-secondary'
            }`}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Stats grid */}
      {stats && stats.length > 0 && (
        <div
          className={`grid gap-3 pt-3 border-t border-text-muted/20 ${
            stats.length >= 4 ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {stats.map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-text-secondary">{label}</div>
              <div className="font-semibold text-text-primary text-sm">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {actions && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-text-muted/20">
          {actions}
        </div>
      )}
    </Wrapper>
  )
}
