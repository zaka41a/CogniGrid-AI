import { useEffect, useState } from 'react'
import { Network, Brain, Activity, AlertTriangle, Upload, CheckCircle, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { StatCard } from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useChartColors } from '../hooks/useChartColors'
import { graphApi, ingestionApi } from '../lib/api'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

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
  const [recentJobs, setRecentJobs] = useState<{ jobId: string; filename: string; status: string; createdAt: string }[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.allSettled([
      graphApi.stats(),
      ingestionApi.jobs(),
    ]).then(([statsRes, jobsRes]) => {
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data)
      }
      if (jobsRes.status === 'fulfilled') {
        const jobs = jobsRes.value.data
        setRecentJobs(jobs.slice(0, 6))

        // Build a simple area chart: count jobs per day over the last 14 days
        const dayMap: Record<string, number> = {}
        const today = new Date()
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          dayMap[key] = 0
        }
        jobs.forEach(j => {
          const key = new Date(j.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (key in dayMap) dayMap[key]++
        })
        setJobSeries(Object.entries(dayMap).map(([date, value]) => ({ date, value })))
      }
      setLoading(false)
    })
  }, [])

  const fmtNum = (n: number) => n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(n)

  return (
    <div className="space-y-6">

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Graph Nodes"
          value={loading ? '…' : fmtNum(stats?.nodeCount ?? 0)}
          icon={<Network size={17} />}
          iconColor="#6366F1"
          trendLabel="knowledge graph"
        />
        <StatCard
          label="Graph Edges"
          value={loading ? '…' : fmtNum(stats?.edgeCount ?? 0)}
          icon={<TrendingUp size={17} />}
          iconColor="#10B981"
          trendLabel="relationships"
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
        <Card title="Ingestion Jobs · Last 14 Days" action={
          <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
            <TrendingUp size={12} /> live
          </span>
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

        {/* Graph health */}
        <Card title="Graph Health" className="xl:col-span-2">
          <div className="p-5 space-y-4">
            {[
              { label: 'Node coverage',     value: stats ? Math.min(100, Math.round((stats.nodeCount / 100) * 10)) : 0,  color: 'bg-indigo-500' },
              { label: 'Edge density',      value: stats ? Math.min(100, Math.round((stats.edgeCount  / stats.nodeCount || 0) * 5)) : 0, color: 'bg-violet-500' },
              { label: 'Triple richness',   value: stats ? Math.min(100, Math.round((stats.rdfTriples / (stats.nodeCount || 1)) / 2)) : 0, color: 'bg-emerald-500' },
              { label: 'Documents indexed', value: stats ? Math.min(100, stats.documentCount * 5) : 0, color: 'bg-amber-500' },
            ].map(s => (
              <div key={s.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-cg-muted">{s.label}</span>
                  <span className="text-cg-txt font-semibold">{loading ? '…' : `${s.value}%`}</span>
                </div>
                <div className="h-1.5 bg-cg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${s.color}`}
                    style={{ width: loading ? '0%' : `${s.value}%` }}
                  />
                </div>
              </div>
            ))}
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
              done:       { icon: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              processing: { icon: 'text-amber-500',   bg: 'bg-amber-500/10' },
              queued:     { icon: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
              error:      { icon: 'text-red-500',     bg: 'bg-red-500/10' },
            }
            const { icon: iconCls, bg } = statusColor[job.status] ?? statusColor.queued
            const Icon = job.status === 'done' ? CheckCircle
              : job.status === 'error' ? AlertTriangle
              : job.status === 'processing' ? Activity
              : Upload
            return (
              <div key={job.jobId} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-cg-s2 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                  <Icon size={13} className={iconCls} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cg-txt leading-snug truncate">{job.filename}</p>
                  <p className="text-xs text-cg-muted mt-0.5">Job {job.jobId.slice(0, 8)}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-cg-faint">{formatDate(job.createdAt)}</span>
                  <div className="mt-1">
                    <Badge variant={
                      job.status === 'done' ? 'success' : job.status === 'error' ? 'danger' : 'warning'
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
