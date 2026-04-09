import { ReactNode } from 'react'

interface PageHeaderProps {
  title:        string
  description?: string
  icon?:        ReactNode
  actions?:     ReactNode
  badge?:       { label: string; color?: string }
}

export function PageHeader({ title, description, icon, actions, badge }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-cg-txt">{title}</h1>
            {badge && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: badge.color ? `${badge.color}20` : 'var(--cg-primary-s)', color: badge.color || 'var(--cg-primary)' }}
              >
                {badge.label}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-cg-muted mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
