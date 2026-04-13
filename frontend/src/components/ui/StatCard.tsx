import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  label:       string
  value:       string | number
  icon?:       ReactNode
  // New API: hex color for icon container background
  iconColor?:  string
  // Old API: CSS class for icon container (backwards compat)
  iconBg?:     string
  // New API: number (percentage, positive=up, negative=down)
  trend?:      number | 'up' | 'down' | 'neutral'
  trendLabel?: string
  // Old API: text shown below value (backwards compat)
  change?:     string
  suffix?:     string
  className?:  string
}

export function StatCard({ label, value, icon, iconColor, iconBg, trend, trendLabel, change, suffix, className = '' }: StatCardProps) {
  const trendNum  = typeof trend === 'number' ? trend : undefined
  const trendStr  = typeof trend === 'string'  ? trend : undefined
  const up        = trendNum !== undefined ? trendNum > 0 : trendStr === 'up'
  const down      = trendNum !== undefined ? trendNum < 0 : trendStr === 'down'
  const hasTrend  = trendNum !== undefined || trendStr !== undefined
  const iconStyle = iconBg
    ? undefined
    : iconColor
      ? { background: `${iconColor}18`, color: iconColor }
      : { background: 'var(--cg-primary-s)', color: 'var(--cg-primary)' }

  // Border always uses the logo blue regardless of icon color
  const LOGO_BLUE = '#3B82F6'

  return (
    <div
      className={`card card-hover p-4 relative overflow-hidden ${className}`}
      style={{
        border: `1.5px solid ${LOGO_BLUE}30`,
        borderTop: `3px solid ${LOGO_BLUE}`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-cg-muted uppercase tracking-wide">{label}</p>
        {icon && (
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg ?? ''}`}
            style={iconStyle}
          >
            {icon}
          </div>
        )}
      </div>

      <p className="text-2xl font-bold text-cg-txt tabular-nums">
        {value}
        {suffix && <span className="text-base font-medium text-cg-muted ml-1">{suffix}</span>}
      </p>

      {hasTrend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${up ? 'text-emerald-600' : down ? 'text-red-500' : 'text-cg-muted'}`}>
          {up   && <TrendingUp   size={13} />}
          {down && <TrendingDown size={13} />}
          {!up && !down && <Minus size={13} />}
          {trendNum !== undefined && <span>{up ? '+' : ''}{trendNum}%</span>}
          {trendLabel && <span className="text-cg-faint font-normal ml-1">{trendLabel}</span>}
        </div>
      )}

      {change && !hasTrend && (
        <p className="text-xs text-cg-faint mt-2">{change}</p>
      )}
    </div>
  )
}

export default StatCard
