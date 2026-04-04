import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}

export default function Card({ children, className = '', title, action }: Props) {
  return (
    <div className={`bg-cg-surface border border-cg-border rounded-xl shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-cg-border">
          {title && <h3 className="text-sm font-semibold text-cg-txt">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
