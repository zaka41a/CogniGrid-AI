type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'accent'

interface BadgeProps {
  variant?:   BadgeVariant
  children:   React.ReactNode
  dot?:       boolean
  className?: string
}

const styles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  danger:  'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  info:    'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  neutral: 'bg-cg-s2      text-cg-muted',
  primary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  accent:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
}

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
  neutral: 'bg-slate-400',
  primary: 'bg-indigo-500',
  accent:  'bg-violet-500',
}

export function Badge({ variant = 'neutral', children, dot = false, className = '' }: BadgeProps) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2 py-0.5',
      'rounded-full text-xs font-medium whitespace-nowrap',
      styles[variant],
      className,
    ].join(' ')}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}

export function statusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    completed: 'success', done: 'success', active: 'success', healthy: 'success', up: 'success',
    processing: 'primary', running: 'primary', indexing: 'primary',
    pending: 'warning', queued: 'warning',
    failed: 'danger', error: 'danger', down: 'danger',
    inactive: 'neutral', idle: 'neutral',
    info: 'info',
  }
  return map[status.toLowerCase()] ?? 'neutral'
}

export function severityBadge(sev: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    critical: 'danger', high: 'danger',
    warning: 'warning', medium: 'warning',
    info: 'info', low: 'info',
    success: 'success',
  }
  return map[sev.toLowerCase()] ?? 'neutral'
}

// Backwards-compatible aliases
export const severityVariant = severityBadge
export const statusVariant   = statusBadge
export default Badge
