interface ProgressBarProps {
  value:    number   // 0–100
  max?:     number
  color?:   'primary' | 'secondary' | 'danger' | 'warning' | 'accent'
  size?:    'xs' | 'sm' | 'md'
  label?:   string
  showValue?: boolean
  className?: string
}

const colors = {
  primary:   'gradient-primary',
  secondary: 'gradient-emerald',
  danger:    'bg-cg-danger',
  warning:   'bg-cg-warning',
  accent:    'bg-cg-accent',
}

const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' }

export function ProgressBar({
  value, max = 100, color = 'primary', size = 'sm',
  label, showValue = false, className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-cg-muted">{label}</span>}
          {showValue && <span className="text-xs font-medium text-cg-txt">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`w-full bg-cg-s2 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`${heights[size]} rounded-full transition-all duration-500 ease-out ${colors[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
