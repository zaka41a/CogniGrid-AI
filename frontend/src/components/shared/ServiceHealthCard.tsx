import { useServiceHealth, type ServiceStatus } from '../../hooks/useServiceHealth'
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import Card from '../ui/Card'

const STATUS_TEXT: Record<ServiceStatus, string> = {
  online:   'online',
  degraded: 'degraded',
  offline:  'offline',
  unknown:  'unknown',
}

const STATUS_DOT: Record<ServiceStatus, string> = {
  online:   'bg-emerald-400',
  degraded: 'bg-amber-400',
  offline:  'bg-red-400',
  unknown:  'bg-slate-400',
}

const STATUS_TEXT_CLR: Record<ServiceStatus, string> = {
  online:   'text-emerald-500',
  degraded: 'text-amber-500',
  offline:  'text-red-500',
  unknown:  'text-cg-faint',
}

const SERVICE_LABELS: Record<string, string> = {
  ingestion:       'Ingestion',
  graph:           'Graph',
  'ai-engine':     'AI Engine',
  graphrag:        'GraphRAG',
  agent:           'Agent',
  'assume-runner': 'ASSUME Runner',
  postgres:        'Postgres',
  gateway:         'Gateway',
}

export function ServiceHealthCard() {
  const { data, loading, refresh } = useServiceHealth()

  const overallBadge = (() => {
    if (!data) return { txt: 'Checking…', cls: 'text-cg-muted bg-cg-s2 border-cg-border', icon: <Activity size={11}/> }
    if (data.overall === 'healthy') return { txt: 'All Systems Online', cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 size={11}/> }
    if (data.overall === 'partial') return { txt: 'Partial Outage',     cls: 'text-amber-500   bg-amber-500/10  border-amber-500/30',  icon: <AlertTriangle size={11}/> }
    return { txt: 'System Down', cls: 'text-red-500 bg-red-500/10 border-red-500/30', icon: <XCircle size={11}/> }
  })()

  return (
    <Card title="System Health" action={
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border ${overallBadge.cls}`}>
          {overallBadge.icon} {overallBadge.txt}
        </span>
        <button
          onClick={refresh}
          className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    }>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {(data?.services ?? []).map(s => {
          const status = (s.status as ServiceStatus) ?? 'unknown'
          return (
            <div
              key={s.name}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-cg-border/60 bg-cg-bg"
              title={s.error ?? undefined}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]} ${status === 'online' ? 'animate-pulse' : ''}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-cg-txt leading-none truncate">
                  {SERVICE_LABELS[s.name] ?? s.name}
                </p>
                <p className={`text-[10px] mt-0.5 font-mono truncate ${STATUS_TEXT_CLR[status]}`}>
                  {STATUS_TEXT[status]}{s.latency_ms != null ? ` · ${s.latency_ms}ms` : ''}
                </p>
              </div>
            </div>
          )
        })}
        {!data && (
          <div className="col-span-full text-center text-xs text-cg-faint py-4">Loading…</div>
        )}
      </div>
    </Card>
  )
}
