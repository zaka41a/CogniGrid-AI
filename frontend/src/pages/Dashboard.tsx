import { useEffect, useState, useCallback, useMemo } from 'react'
import { Network, Brain, Activity, AlertTriangle, Upload, CheckCircle, TrendingUp, Trash2, RefreshCw, Layers } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { StatCard } from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useChartColors } from '../hooks/useChartColors'
import { graphApi, graphHttp, ingestHttp } from '../lib/api'
import { ServiceHealthCard } from '../components/shared/ServiceHealthCard'
import { DateRangeSelector, rangeToDays, type DateRange } from '../components/shared/DateRangeSelector'

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0D9488', '#EC4899', '#3B82F6']


interface DashStats {
  nodeCount: number
  edgeCount: number
  rdfTriples: number
  documentCount: number
}

interface JobPoint { date: string; value: number }

export default function Dashboard() {
  const { grid, tick, tooltip } = useChartColors()
  const [stats, setStats]         = useState<DashStats | null>(null)
  const [jobSeries, setJobSeries] = useState<JobPoint[]>([])
  const [recentJobs, setRecentJobs] = useState<{ id: string; file_name: string; status: string; created_at?: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [clearing, setClearing]   = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [range, setRange] = useState<DateRange>('14d')
  const [nodeTypes, setNodeTypes] = useState<{ name: string; value: number }[]>([])

  // Derived sparklines for KPI cards: subsample the job series to last 7 buckets
  const sparkValues = useMemo(() => {
    if (jobSeries.length === 0) return []
    return jobSeries.slice(-7).map(p => p.value)
  }, [jobSeries])

  const clearAllData = async () => {
    setClearing(true)
    try {
      await Promise.allSettled([graphApi.clearAll(), ingestHttp.delete('/api/ingestion/jobs')])
      setStats({ nodeCount: 0, edgeCount: 0, rdfTriples: 0, documentCount: 0 })
      setRecentJobs([])
      setJobSeries(prev => prev.map(p => ({ ...p, value: 0 })))
    } finally {
      setClearing(false)
      setConfirmClear(false)
    }
  }

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const [statsRes, jobsRes, nodeLabelsRes] = await Promise.allSettled([
      graphApi.stats(),
      ingestHttp.get<{ jobs: { id: string; file_name: string; status: string; created_at?: string }[]; total: number }>('/api/ingestion/jobs', { timeout: 8_000 }),
      graphHttp.get<{ node_labels?: Record<string, number> }>('/api/graph/stats', { timeout: 8_000 }),
    ])

    if (nodeLabelsRes.status === 'fulfilled') {
      const labels = nodeLabelsRes.value.data.node_labels ?? {}
      setNodeTypes(
        Object.entries(labels)
          .filter(([k]) => k !== 'Document')
          .sort(([, a], [, b]) => b - a)
          .slice(0, 6)
          .map(([name, count]) => ({ name, value: count }))
      )
    }

    if (jobsRes.status === 'fulfilled') {
      const jobs = jobsRes.value.data.jobs ?? []
      setRecentJobs(jobs.slice(0, 6))

      // Only show graph stats if this user has completed jobs (avoid cross-user leakage)
      const hasCompletedJobs = jobs.some((j: { status: string }) => j.status === 'completed')
      if (statsRes.status === 'fulfilled' && hasCompletedJobs) {
        setStats(statsRes.value.data)
      } else {
        setStats({ nodeCount: 0, edgeCount: 0, rdfTriples: 0, documentCount: 0 })
      }

      const dayMap: Record<string, number> = {}
      const today = new Date()
      const days = rangeToDays(range)
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        dayMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0
      }
      ;(jobs as Array<{ created_at?: string }>).forEach(job => {
        const key = job.created_at
          ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (key in dayMap) dayMap[key]++
      })
      setJobSeries(Object.entries(dayMap).map(([date, value]) => ({ date, value })))
    }

    setLoading(false)
    setRefreshing(false)
  }, [range])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 15s while any job is still processing
  useEffect(() => {
    const hasProcessing = recentJobs.some(j => j.status === 'processing' || j.status === 'pending')
    if (!hasProcessing) return
    const id = setInterval(() => fetchData(true), 15_000)
    return () => clearInterval(id)
  }, [recentJobs, fetchData])

  const fmtNum = (n: number) => n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(n)

  return (
    <div className="space-y-6">

      {/* Confirm clear modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cg-txt">Clear all platform data?</p>
                <p className="text-xs text-cg-muted">This deletes the entire knowledge graph and all ingestion jobs. Irreversible.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmClear(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-cg-border text-sm text-cg-muted hover:bg-cg-s2 transition-colors">
                Cancel
              </button>
              <button onClick={clearAllData} disabled={clearing}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors">
                {clearing ? 'Clearing…' : 'Clear everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-cg-txt">Dashboard</h1>
          <p className="text-xs text-cg-muted">Platform overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-cg-border text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-500 text-sm
              hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={14} />
            Clear all data
          </button>
        </div>
      </div>

      {/* Service Health */}
      <ServiceHealthCard />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Graph Nodes"
          value={loading ? '…' : fmtNum(stats?.nodeCount ?? 0)}
          icon={<Network size={17} />}
          iconColor="#6366F1"
          trendLabel="knowledge graph"
          spark={sparkValues}
        />
        <StatCard
          label="Graph Edges"
          value={loading ? '…' : fmtNum(stats?.edgeCount ?? 0)}
          icon={<TrendingUp size={17} />}
          iconColor="#10B981"
          trendLabel="relationships"
          spark={sparkValues.map(v => Math.round(v * 1.2))}
        />
        <StatCard
          label="RDF Triples"
          value={loading ? '…' : fmtNum(stats?.rdfTriples ?? 0)}
          icon={<Activity size={17} />}
          iconColor="#8B5CF6"
          trendLabel="semantic data"
        />
        <StatCard
          label="Documents"
          value={loading ? '…' : String(stats?.documentCount ?? 0)}
          icon={<Brain size={17} />}
          iconColor="#F59E0B"
          trendLabel="indexed"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Area chart */}
        <Card title={`Ingestion Jobs · ${range === '24h' ? 'Last 24h' : `Last ${rangeToDays(range)} days`}`} action={
          <div className="flex items-center gap-2">
            <DateRangeSelector value={range} onChange={setRange} options={['24h','7d','14d','30d','90d']} />
            <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
              <TrendingUp size={12} /> live
            </span>
          </div>
        } className="xl:col-span-3">
          <div className="px-5 pb-5">
            {jobSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={jobSeries} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltip.contentStyle} labelStyle={tooltip.labelStyle} />
                  <Area
                    type="monotone" dataKey="value"
                    stroke="#6366F1" strokeWidth={2}
                    fill="url(#areaGrad)"
                    dot={false} activeDot={{ r: 4, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[210px] text-cg-faint text-sm">
                {loading ? 'Loading…' : 'No ingestion data yet'}
              </div>
            )}
          </div>
        </Card>

        {/* Top entity types pie */}
        <Card title="Top Entity Types" className="xl:col-span-2" action={
          <span className="text-xs text-cg-faint flex items-center gap-1"><Layers size={11}/> top 6</span>
        }>
          <div className="px-4 pb-4">
            {nodeTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={nodeTypes}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {nodeTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltip.contentStyle} labelStyle={tooltip.labelStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[210px] text-cg-faint text-sm">
                {loading ? 'Loading…' : 'No graph data yet'}
              </div>
            )}
            {nodeTypes.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[10px]">
                {nodeTypes.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-cg-muted truncate">{t.name}</span>
                    <span className="ml-auto font-semibold text-cg-txt">{t.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent ingestion jobs */}
      <Card title="Recent Ingestion Jobs">
        <div className="divide-y divide-cg-border">
          {recentJobs.length === 0 && !loading && (
            <div className="px-5 py-10 text-center text-cg-faint text-sm">
              No ingestion jobs yet. Upload a document to get started.
            </div>
          )}
          {loading && (
            <div className="px-5 py-10 text-center text-cg-faint text-sm">Loading…</div>
          )}
          {recentJobs.map(job => {
            const statusColor: Record<string, { icon: string; bg: string }> = {
              completed:  { icon: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              processing: { icon: 'text-amber-500',   bg: 'bg-amber-500/10' },
              pending:    { icon: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
              failed:     { icon: 'text-red-500',     bg: 'bg-red-500/10' },
            }
            const { icon: iconCls, bg } = statusColor[job.status] ?? statusColor.pending
            const Icon = job.status === 'completed' ? CheckCircle
              : job.status === 'failed' ? AlertTriangle
              : job.status === 'processing' ? Activity
              : Upload
            return (
              <div key={job.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-cg-s2 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                  <Icon size={13} className={iconCls} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cg-txt leading-snug truncate">{job.file_name}</p>
                  <p className="text-xs text-cg-muted mt-0.5">Job {job.id.slice(0, 8)}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="mt-1">
                    <Badge variant={
                      job.status === 'completed' ? 'success' : job.status === 'failed' ? 'danger' : 'warning'
                    } dot>{job.status}</Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t border-cg-border">
          <button className="text-xs text-cg-primary hover:underline font-medium" onClick={() => window.location.href = '/app/ingestion'}>
            View all jobs
          </button>
        </div>
      </Card>
    </div>
  )
}
