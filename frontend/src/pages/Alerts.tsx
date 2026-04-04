import { useState } from 'react'
import { BellRing, Filter, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import Badge, { severityVariant, statusVariant } from '../components/ui/Badge'
import { mockAlerts } from '../mock'
import type { Severity, AlertStatus } from '../types'

const SEVERITIES: Severity[] = ['Critical', 'Medium', 'Low']
const STATUSES: AlertStatus[] = ['Open', 'Acknowledged', 'Resolved']

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'All'>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = mockAlerts.filter((a) => {
    const matchSev = severityFilter === 'All' || a.severity === severityFilter
    const matchSta = statusFilter === 'All' || a.status === statusFilter
    return matchSev && matchSta
  })

  const total    = mockAlerts.length
  const critical = mockAlerts.filter((a) => a.severity === 'Critical').length
  const warnings = mockAlerts.filter((a) => a.severity === 'Medium').length
  const resolved = mockAlerts.filter((a) => a.status === 'Resolved').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Alerts"     value={total}    icon={<BellRing size={16} className="text-blue-400" />}    iconBg="bg-blue-500/15" />
        <StatCard label="Critical"         value={critical} icon={<BellRing size={16} className="text-red-400" />}     iconBg="bg-red-500/15" />
        <StatCard label="Warnings"         value={warnings} icon={<BellRing size={16} className="text-yellow-400" />}  iconBg="bg-yellow-500/15" />
        <StatCard label="Resolved Today"   value={resolved} icon={<CheckCircle size={16} className="text-green-400" />} iconBg="bg-green-500/15" />
      </div>

      {/* Table */}
      <Card title="Alerts Center">
        {/* Filters */}
        <div className="px-5 py-3 border-b border-cg-border flex flex-wrap gap-3 items-center">
          <Filter size={14} className="text-cg-muted" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | 'All')}
            className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Severities</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'All')}
            className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="ml-auto text-xs text-cg-faint">{filtered.length} of {total} alerts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-border">
                <th className="w-8" />
                {['ID', 'System', 'Type', 'Severity', 'Message', 'Timestamp', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((alert, i) => {
                const expanded = expandedId === alert.id
                return (
                  <>
                    <tr
                      key={alert.id}
                      className={`border-b border-cg-border/50 hover:bg-cg-s2 transition-colors cursor-pointer ${i % 2 ? 'bg-cg-stripe' : ''}`}
                      onClick={() => setExpandedId(expanded ? null : alert.id)}
                    >
                      <td className="px-2 py-3.5 text-cg-faint">
                        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </td>
                      <td className="px-4 py-3.5 text-cg-muted font-mono text-xs whitespace-nowrap">{alert.id}</td>
                      <td className="px-4 py-3.5 text-cg-txt">{alert.system}</td>
                      <td className="px-4 py-3.5 text-cg-muted whitespace-nowrap">{alert.type}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-cg-muted max-w-xs truncate">{alert.message}</td>
                      <td className="px-4 py-3.5 text-cg-muted whitespace-nowrap text-xs">{alert.timestamp}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusVariant(alert.status)}>{alert.status}</Badge>
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        {alert.status === 'Open' && (
                          <button className="px-2.5 py-1 text-[11px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/25 transition-colors whitespace-nowrap">
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expanded && (
                      <tr key={`${alert.id}-expanded`} className="border-b border-cg-border/50">
                        <td colSpan={9} className="px-8 py-5 bg-cg-s2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide mb-2">Full Message</p>
                              <p className="text-sm text-cg-muted">{alert.message}</p>
                              <div className="mt-4 grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-cg-faint">System</p>
                                  <p className="text-sm text-cg-txt">{alert.system}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-cg-faint">Type</p>
                                  <p className="text-sm text-cg-txt">{alert.type}</p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide mb-2">Timeline</p>
                              <div className="space-y-2">
                                {alert.timeline.map((evt, j) => (
                                  <div key={j} className="flex gap-3 text-xs">
                                    <span className="text-blue-400 font-mono whitespace-nowrap">{evt.time}</span>
                                    <div className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                                      <span className="text-cg-muted">{evt.event}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-cg-faint text-sm">
                    No alerts match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
