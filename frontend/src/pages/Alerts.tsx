import { useState } from 'react'
import { BellRing, Filter, ChevronDown, ChevronRight, CheckCircle, AlertTriangle, ShieldAlert, BellOff } from 'lucide-react'
import Card from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Badge, severityBadge, statusBadge } from '../components/ui/Badge'
import type { Severity, AlertStatus } from '../types'

interface Alert {
  id:        string
  system:    string
  type:      string
  severity:  Severity
  message:   string
  timestamp: string
  status:    AlertStatus
  timeline:  { time: string; event: string }[]
}

const SEVERITIES: Severity[] = ['Critical', 'Medium', 'Low']
const STATUSES: AlertStatus[] = ['Open', 'Acknowledged', 'Resolved']

export default function Alerts() {
  const [alerts, setAlerts]           = useState<Alert[]>([])
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All')
  const [statusFilter, setStatusFilter]     = useState<AlertStatus | 'All'>('All')
  const [expandedId, setExpandedId]         = useState<string | null>(null)

  const filtered = alerts.filter(a => {
    const matchSev = severityFilter === 'All' || a.severity === severityFilter
    const matchSta = statusFilter   === 'All' || a.status   === statusFilter
    return matchSev && matchSta
  })

  const total    = alerts.length
  const critical = alerts.filter(a => a.severity === 'Critical').length
  const warnings = alerts.filter(a => a.severity === 'Medium').length
  const resolved = alerts.filter(a => a.status === 'Resolved').length

  const acknowledge = (id: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'Acknowledged' as AlertStatus } : a
    ))
  }

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Alerts"   value={total}    icon={<BellRing      size={17}/>} iconColor="#6366F1" />
        <StatCard label="Critical"       value={critical} icon={<ShieldAlert   size={17}/>} iconColor="#EF4444" />
        <StatCard label="Warnings"       value={warnings} icon={<AlertTriangle size={17}/>} iconColor="#F59E0B" />
        <StatCard label="Resolved Today" value={resolved} icon={<CheckCircle  size={17}/>} iconColor="#10B981" />
      </div>

      {/* Table */}
      <Card title="Alerts Center">
        {/* Filters */}
        <div className="px-5 py-3.5 border-b border-cg-border flex flex-wrap gap-3 items-center">
          <Filter size={13} className="text-cg-muted shrink-0" />
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as Severity | 'All')}
            className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2
              focus:outline-none focus:border-cg-primary transition-all"
          >
            <option value="All">All Severities</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as AlertStatus | 'All')}
            className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2
              focus:outline-none focus:border-cg-primary transition-all"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="ml-auto text-xs text-cg-faint">{filtered.length} of {total} alerts</span>
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cg-s2 border border-cg-border flex items-center justify-center">
              <BellOff size={24} className="text-cg-faint" />
            </div>
            <p className="text-sm font-medium text-cg-muted">No alerts</p>
            <p className="text-xs text-cg-faint max-w-xs">
              Alerts will appear here once the monitoring backend is running and connected.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cg-border">
                  <th className="w-8" />
                  {['ID', 'System', 'Type', 'Severity', 'Message', 'Timestamp', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(alert => {
                  const expanded = expandedId === alert.id
                  return (
                    <>
                      <tr
                        key={alert.id}
                        onClick={() => setExpandedId(expanded ? null : alert.id)}
                        className="border-b border-cg-border/50 hover:bg-cg-s2 transition-colors cursor-pointer"
                      >
                        <td className="px-2 py-3.5 text-cg-faint">
                          {expanded
                            ? <ChevronDown  size={13} className="text-cg-primary" />
                            : <ChevronRight size={13} />
                          }
                        </td>
                        <td className="px-4 py-3.5 text-cg-muted font-mono text-xs whitespace-nowrap">{alert.id}</td>
                        <td className="px-4 py-3.5 text-cg-txt font-medium">{alert.system}</td>
                        <td className="px-4 py-3.5 text-cg-muted whitespace-nowrap text-xs">{alert.type}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={severityBadge(alert.severity)} dot>{alert.severity}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-cg-muted max-w-xs truncate text-xs">{alert.message}</td>
                        <td className="px-4 py-3.5 text-cg-muted whitespace-nowrap text-xs">{alert.timestamp}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={statusBadge(alert.status)}>{alert.status}</Badge>
                        </td>
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          {alert.status === 'Open' && (
                            <button
                              onClick={() => acknowledge(alert.id)}
                              className="px-2.5 py-1 text-[11px] font-medium bg-cg-primary-s text-cg-primary border border-cg-primary/30 rounded-lg hover:bg-cg-primary hover:text-white transition-all whitespace-nowrap"
                            >
                              Acknowledge
                            </button>
                          )}
                        </td>
                      </tr>

                      {expanded && (
                        <tr key={`${alert.id}-exp`} className="border-b border-cg-border/50">
                          <td colSpan={9} className="px-8 py-5 bg-cg-s2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <p className="text-[10px] font-semibold text-cg-muted uppercase tracking-wide mb-2">Full Message</p>
                                <p className="text-sm text-cg-txt leading-relaxed">{alert.message}</p>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-[10px] text-cg-faint uppercase tracking-wide">System</p>
                                    <p className="text-sm text-cg-txt font-medium mt-0.5">{alert.system}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-cg-faint uppercase tracking-wide">Type</p>
                                    <p className="text-sm text-cg-txt font-medium mt-0.5">{alert.type}</p>
                                  </div>
                                </div>
                              </div>
                              {alert.timeline.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-cg-muted uppercase tracking-wide mb-2">Timeline</p>
                                  <div className="space-y-2.5">
                                    {alert.timeline.map((evt, j) => (
                                      <div key={j} className="flex gap-3 text-xs">
                                        <span className="text-cg-primary font-mono whitespace-nowrap">{evt.time}</span>
                                        <div className="flex items-start gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-cg-primary mt-1 shrink-0" />
                                          <span className="text-cg-muted">{evt.event}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
                {filtered.length === 0 && total > 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-cg-faint text-sm">
                      No alerts match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
