import { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?:        ReactNode
  title:        string
  description?: string
  action?:      { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-cg-s2 border border-cg-border flex items-center justify-center text-cg-faint mb-4">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-cg-txt mb-1">{title}</p>
      {description && (
        <p className="text-xs text-cg-muted max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          <Button size="sm" onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  )
}
