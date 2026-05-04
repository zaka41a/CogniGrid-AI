import { useServiceHealth } from '../../hooks/useServiceHealth'
import { useNavigate } from 'react-router-dom'

/**
 * Compact global status indicator for the Sidebar footer.
 * - Open sidebar  → pill with text + offline count
 * - Closed sidebar → tiny dot only
 * Click navigates to the Dashboard where the full ServiceHealthCard lives.
 */
export function ServiceHealthBadge({ compact }: { compact: boolean }) {
  const { data } = useServiceHealth()
  const navigate = useNavigate()

  const overall = data?.overall ?? 'unknown'
  const offlineCount = data?.services.filter(s => s.status === 'offline').length ?? 0

  const dotColor =
    overall === 'healthy' ? 'bg-emerald-400' :
    overall === 'partial' ? 'bg-amber-400'   :
    overall === 'down'    ? 'bg-red-400'     :
    'bg-slate-500'

  const label =
    overall === 'healthy' ? 'All systems online' :
    overall === 'partial' ? `${offlineCount} service${offlineCount > 1 ? 's' : ''} offline` :
    overall === 'down'    ? 'Platform offline' :
    'Checking…'

  if (compact) {
    return (
      <button
        onClick={() => navigate('/app/dashboard')}
        title={label}
        className="flex items-center justify-center w-full py-1.5 rounded-lg hover:bg-white/8 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor} ${overall === 'healthy' ? 'animate-pulse' : ''}`} />
      </button>
    )
  }

  return (
    <button
      onClick={() => navigate('/app/dashboard')}
      title="Open Dashboard for details"
      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg hover:bg-white/8 transition-colors text-left"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${overall === 'healthy' ? 'animate-pulse' : ''}`} />
      <span className="text-[10px] font-medium text-white/60 truncate">{label}</span>
    </button>
  )
}
