import { useState, useEffect, useMemo, useRef } from 'react'
import {
  BellRing, Filter, ChevronDown, ChevronRight, CheckCircle, AlertTriangle,
  ShieldAlert, BellOff, RefreshCw, Search, ArrowUp, ArrowDown, Clock, X,
} from 'lucide-react'
import Card from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Badge, severityBadge, statusBadge } from '../components/ui/Badge'
import type { Severity, AlertStatus } from '../types'
import { graphHttp } from '../lib/api'
import { useLocalStorageState } from '../hooks/useLocalStorageState'

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

type SortKey = 'severity' | 'status' | 'timestamp' | 'system' | 'type'
const SEV_WEIGHT:    Record<Severity, number>      = { Critical: 3, Medium: 2, Low: 1 }
const STATUS_WEIGHT: Record<AlertStatus, number>   = { Open: 3, Acknowledged: 2, Resolved: 1 }

const SNOOZE_DURATIONS: { label: string; ms: number }[] = [
  { label: '1h',  ms:      60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '7d',  ms:  7 * 24 * 60 * 60 * 1000 },
]

export default function Alerts() {
  const [alerts, setAlerts]                 = useState<Alert[]>([])
  const [loading, setLoading]               = useState(true)
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All')
  const [statusFilter, setStatusFilter]     = useState<AlertStatus | 'All'>('All')
  const [search, setSearch]                 = useState('')
  const [showSnoozed, setShowSnoozed]       = useState(false)
  const [sort, setSort]                     = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'severity', dir: 'desc' })
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [snoozedUntil, setSnoozedUntil]     = useLocalStorageState<Record<string, number>>('cg.alerts.snoozed', {})
  const [snoozeMenuId, setSnoozeMenuId]     = useState<string | null>(null)
  // Tick every 60s so that snoozed alerts auto-resurface when their wake time passes
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const { data } = await graphHttp.get<Alert[]>('/api/graph/alerts', { timeout: 8_000 })
      setAlerts(data)
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAlerts() }, [])

  // Drop snooze entries whose wake time has elapsed (keeps the map small)
  useEffect(() => {
    const now = Date.now()
    const expired = Object.entries(snoozedUntil).filter(([, t]) => t <= now)
    if (expired.length === 0) return
    setSnoozedUntil(prev => {
      const next = { ...prev }
      expired.forEach(([id]) => delete next[id])
      return next
    })
  }, [snoozedUntil, setSnoozedUntil])

  const toggleSort = (key: SortKey) => {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'system' || key === 'type' ? 'asc' : 'desc' })
  }

  const filtered = useMemo(() => {
    const now = Date.now()
    const q = search.trim().toLowerCase()
    const matches = alerts.filter(a => {
      const isSnoozed = (snoozedUntil[a.id] ?? 0) > now
      if (showSnoozed ? !isSnoozed : isSnoozed) return false
      if (severityFilter !== 'All' && a.severity !== severityFilter) return false
      if (statusFilter   !== 'All' && a.status   !== statusFilter)   return false
      if (q && !(
        a.id.toLowerCase().includes(q)       ||
        a.system.toLowerCase().includes(q)   ||
        a.type.toLowerCase().includes(q)     ||
        a.message.toLowerCase().includes(q)
      )) return false
      return true
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    matches.sort((a, b) => {
      switch (sort.key) {
        case 'severity':  return dir * (SEV_WEIGHT[a.severity]    - SEV_WEIGHT[b.severity])
        case 'status':    return dir * (STATUS_WEIGHT[a.status]   - STATUS_WEIGHT[b.status])
        case 'timestamp': return dir * (Date.parse(a.timestamp || '0') - Date.parse(b.timestamp || '0'))
        case 'system':    return dir * a.system.localeCompare(b.system)
        case 'type':      return dir * a.type.localeCompare(b.type)
      }
    })
    return matches
  }, [alerts, search, severityFilter, statusFilter, showSnoozed, snoozedUntil, sort])

  const total    = alerts.length
  const critical = alerts.filter(a => a.severity === 'Critical').length
  const warnings = alerts.filter(a => a.severity === 'Medium').length
  const resolved = alerts.filter(a => a.status === 'Resolved').length
  const snoozedCount = useMemo(() => {
    const now = Date.now()
    return alerts.filter(a => (snoozedUntil[a.id] ?? 0) > now).length
  }, [alerts, snoozedUntil])

  const acknowledge = (id: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'Acknowledged' as AlertStatus } : a
    ))
  }

  const acknowledgeMany = (ids: string[]) => {
    const set = new Set(ids)
    setAlerts(prev => prev.map(a =>
      set.has(a.id) ? { ...a, status: 'Acknowledged' as AlertStatus } : a
    ))
    setSelected(prev => {
      const n = new Set(prev)
      ids.forEach(id => n.delete(id))
      return n
    })
  }

  const snooze = (id: string, ms: number) => {
    setSnoozedUntil(prev => ({ ...prev, [id]: Date.now() + ms }))
    setSnoozeMenuId(null)
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const unsnooze = (id: string) => {
    setSnoozedUntil(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const allChecked = filtered.length > 0 && filtered.every(a => selected.has(a.id))
  const toggleAll = () => {
    setSelected(prev => {
      if (allChecked) {
        const n = new Set(prev); filtered.forEach(a => n.delete(a.id)); return n
      }
      const n = new Set(prev); filtered.forEach(a => n.add(a.id)); return n
    })
  }

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className="text-left px-4 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap cursor-pointer hover:text-cg-txt transition-colors select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sort.key === k && (sort.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
      </span>
    </th>
  )

  const fmtRemaining = (untilMs: number) => {
    const ms = untilMs - Date.now()
    if (ms <= 0) return ''
    const m = Math.floor(ms / 60_000)
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Alerts"   value={loading ? '…' : total}    icon={<BellRing      size={17}/>} iconColor="#6366F1" />
        <StatCard label="Critical"       value={loading ? '…' : critical} icon={<ShieldAlert   size={17}/>} iconColor="#EF4444" />
        <StatCard label="Warnings"       value={loading ? '…' : warnings} icon={<AlertTriangle size={17}/>} iconColor="#F59E0B" />
        <StatCard label="Resolved Today" value={loading ? '…' : resolved} icon={<CheckCircle  size={17}/>} iconColor="#10B981" />
      </div>

      {/* Table */}
      <Card title="Alerts Center" action={
        <button onClick={loadAlerts} className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors" title="Refresh">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      }>
        {/* Filters + search */}
        <div className="px-5 py-3.5 border-b border-cg-border flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-faint pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search id, system, type, or message…"
              className="w-full pl-9 pr-8 py-2 bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt placeholder:text-cg-faint focus:outline-none focus:border-cg-primary transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cg-faint hover:text-cg-txt"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <Filter size={13} className="text-cg-muted shrink-0" />
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as Severity | 'All')}
            className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2 focus:outline-none focus:border-cg-primary transition-all"
          >
            <option value="All">All Severities</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as AlertStatus | 'All')}
            className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2 focus:outline-none focus:border-cg-primary transition-all"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setShowSnoozed(v => !v)}
            disabled={snoozedCount === 0 && !showSnoozed}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
              showSnoozed
                ? 'bg-cg-primary text-white border-cg-primary'
                : 'bg-cg-bg text-cg-muted border-cg-border hover:text-cg-txt'
            }`}
            title={showSnoozed ? 'Show active alerts' : 'Show snoozed alerts'}
          >
            <Clock size={12} />
            Snoozed {snoozedCount > 0 && <span className="font-mono">({snoozedCount})</span>}
          </button>
          <span className="ml-auto text-xs text-cg-faint">{filtered.length} of {total} alerts</span>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="px-5 py-2.5 border-b border-cg-border bg-cg-primary-s/30 flex items-center gap-3 text-xs">
            <span className="text-cg-txt font-semibold">{selected.size} selected</span>
            <button
              onClick={() => acknowledgeMany(Array.from(selected))}
              className="px-3 py-1.5 rounded-lg bg-cg-primary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Acknowledge {selected.size}
            </button>
            <button
              onClick={() => {
                Array.from(selected).forEach(id => snooze(id, 24 * 60 * 60 * 1000))
              }}
              className="px-3 py-1.5 rounded-lg border border-cg-border text-cg-muted hover:text-cg-txt hover:border-cg-primary transition-colors"
            >
              Snooze 24h
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-cg-faint hover:text-cg-txt transition-colors"
            >
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-cg-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cg-s2 border border-cg-border flex items-center justify-center">
              <BellOff size={24} className="text-cg-faint" />
            </div>
            <p className="text-sm font-semibold text-cg-txt">No alerts detected</p>
            <p className="text-xs text-cg-muted max-w-xs leading-relaxed">
              Alerts are generated automatically from CIM power grid topology analysis.<br />
              Upload a <span className="font-semibold">CIM/RDF XML</span> file via Data Ingestion to populate the grid model.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cg-border">
                  <th className="px-3 py-3 w-9">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="cursor-pointer accent-cg-primary"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="w-8" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">ID</th>
                  <SortHeader k="system"    label="System" />
                  <SortHeader k="type"      label="Type" />
                  <SortHeader k="severity"  label="Severity" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">Message</th>
                  <SortHeader k="status"    label="Status" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(alert => {
                  const expanded   = expandedId === alert.id
                  const isSelected = selected.has(alert.id)
                  const snoozeAt   = snoozedUntil[alert.id]
                  const isSnoozed  = snoozeAt && snoozeAt > Date.now()
                  const menuOpen   = snoozeMenuId === alert.id
                  return (
                    <SnoozeRow key={alert.id}>
                      <tr
                        onClick={() => setExpandedId(expanded ? null : alert.id)}
                        className={`border-b border-cg-border/50 hover:bg-cg-s2 transition-colors cursor-pointer ${isSelected ? 'bg-cg-primary-s/20' : ''}`}
                      >
                        <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => setSelected(prev => {
                              const n = new Set(prev)
                              if (n.has(alert.id)) n.delete(alert.id); else n.add(alert.id)
                              return n
                            })}
                            className="cursor-pointer accent-cg-primary"
                          />
                        </td>
                        <td className="px-2 py-3.5 text-cg-faint">
                          {expanded
                            ? <ChevronDown  size={13} className="text-cg-primary" />
                            : <ChevronRight size={13} />}
                        </td>
                        <td className="px-4 py-3.5 text-cg-muted font-mono text-xs whitespace-nowrap">{alert.id.slice(0, 8)}</td>
                        <td className="px-4 py-3.5 text-cg-txt font-medium max-w-[120px] truncate">{alert.system}</td>
                        <td className="px-4 py-3.5 text-cg-muted whitespace-nowrap text-xs">{alert.type}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={severityBadge(alert.severity)} dot>{alert.severity}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-cg-muted max-w-xs truncate text-xs">{alert.message}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={statusBadge(alert.status)}>{alert.status}</Badge>
                            {isSnoozed && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-cg-faint" title={`Wakes in ${fmtRemaining(snoozeAt!)}`}>
                                <Clock size={10} />
                                {fmtRemaining(snoozeAt!)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 relative" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            {alert.status === 'Open' && !isSnoozed && (
                              <button
                                onClick={() => acknowledge(alert.id)}
                                className="px-2.5 py-1 text-[11px] font-medium bg-cg-primary-s text-cg-primary border border-cg-primary/30 rounded-lg hover:bg-cg-primary hover:text-white transition-all"
                              >
                                Acknowledge
                              </button>
                            )}
                            {isSnoozed ? (
                              <button
                                onClick={() => unsnooze(alert.id)}
                                className="px-2.5 py-1 text-[11px] font-medium text-cg-muted border border-cg-border rounded-lg hover:text-cg-txt hover:border-cg-primary transition-all"
                                title="Wake now"
                              >
                                Wake
                              </button>
                            ) : (
                              <button
                                onClick={() => setSnoozeMenuId(menuOpen ? null : alert.id)}
                                className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
                                title="Snooze"
                              >
                                <Clock size={13} />
                              </button>
                            )}
                            {menuOpen && (
                              <SnoozeMenu
                                onPick={ms => snooze(alert.id, ms)}
                                onClose={() => setSnoozeMenuId(null)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>

                      {expanded && (
                        <tr className="border-b border-cg-border/50">
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
                    </SnoozeRow>
                  )
                })}
                {filtered.length === 0 && total > 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-cg-faint text-sm">
                      {showSnoozed ? 'No snoozed alerts.' : 'No alerts match your filters.'}
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

// React refuses fragments as direct <tbody> children with keyed rows, so we
// inline two <tr>s here. The wrapper is purely a typing helper.
function SnoozeRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SnoozeMenu({ onPick, onClose }: { onPick: (ms: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [onClose])
  return (
    <div
      ref={ref}
      className="absolute right-2 top-full mt-1 z-20 bg-cg-bg border border-cg-border rounded-lg shadow-lg py-1 min-w-[100px]"
    >
      {SNOOZE_DURATIONS.map(d => (
        <button
          key={d.label}
          onClick={() => onPick(d.ms)}
          className="block w-full text-left px-3 py-1.5 text-xs text-cg-txt hover:bg-cg-s2 transition-colors"
        >
          Snooze {d.label}
        </button>
      ))}
    </div>
  )
}
