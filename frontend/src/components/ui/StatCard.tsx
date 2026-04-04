import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: ReactNode
  iconBg?: string
}

export default function StatCard({ label, value, change, trend = 'neutral', icon, iconBg = 'bg-blue-500/20' }: Props) {
  return (
    <div className="bg-cg-surface border border-cg-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-cg-muted font-medium">{label}</p>
        <p className="text-2xl font-bold text-cg-txt mt-0.5 leading-none">{value}</p>
        {change && (
          <div className="flex items-center gap-1 mt-1.5">
            {trend === 'up'      && <TrendingUp size={12} className="text-green-400" />}
            {trend === 'down'    && <TrendingDown size={12} className="text-red-400" />}
            {trend === 'neutral' && <Minus size={12} className="text-cg-muted" />}
            <span className={`text-[11px] font-medium ${
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-cg-muted'
            }`}>{change}</span>
          </div>
        )}
      </div>
    </div>
  )
}
