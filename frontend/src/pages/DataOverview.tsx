import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Database, GitBranch, FileText, Network,
  TrendingUp, Layers, Activity, Hash,
} from 'lucide-react'
import Card from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { useChartColors } from '../hooks/useChartColors'
import { graphHttp, ingestHttp } from '../lib/api'

// 8 s max-wait for stats — avoids the infinite "…" when services are starting up
const STATS_TIMEOUT = 8_000

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0D9488', '#EC4899', '#3B82F6']

interface NodeTypeStat { name: string; count: number }
interface RelTypeStat  { name: string; count: number }

export default function DataOverview() {
  const { grid, tick, tooltip } = useChartColors()
  const [graphStats, setGraphStats] = useState<{
    nodeCount: number; edgeCount: number; rdfTriples: number; documentCount: number
  } | null>(null)
  const [nodeTypes, setNodeTypes]   = useState<NodeTypeStat[]>([])
  const [relTypes,  setRelTypes]    = useState<RelTypeStat[]>([])
  const [jobStats,  setJobStats]    = useState({ total: 0, completed: 0, failed: 0, processing: 0 })
  const [loading,   setLoading]     = useState(true)

  useEffect(() => {
    Promise.allSettled([
      graphHttp.get<{
        total_nodes: number
        total_relationships: number
        node_labels: Record<string, number>
        relationship_types: Record<string, number>
      }>('/api/graph/stats', { timeout: STATS_TIMEOUT }),
      ingestHttp.get<{ jobs: { status: string }[]; total: number }>('/api/ingestion/jobs', { timeout: STATS_TIMEOUT }),
    ]).then(([gRes, jRes]) => {
      if (gRes.status === 'fulfilled') {
        const raw = gRes.value.data
        setGraphStats({
          nodeCount:     raw.total_nodes          ?? 0,
          edgeCount:     raw.total_relationships  ?? 0,
          rdfTriples:    (raw.total_nodes ?? 0) + (raw.total_relationships ?? 0),
          documentCount: raw.node_labels?.Document ?? 0,
        })
        const labels: Record<string, number> = raw.node_labels ?? {}
        setNodeTypes(
          Object.entries(labels)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }))
        )
        const rels: Record<string, number> = raw.relationship_types ?? {}
        setRelTypes(
          Object.entries(rels)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => ({ name, count }))
        )
      }
      if (jRes.status === 'fulfilled') {
        const jobs = jRes.value.data.jobs ?? []
        setJobStats({
          total:      jobs.length,
          completed:  jobs.filter(j => j.status === 'completed').length,
          failed:     jobs.filter(j => j.status === 'failed').length,
          processing: jobs.filter(j => j.status === 'processing' || j.status === 'pending').length,
        })
      }
      setLoading(false)
    })
  }, [])

  const fmtNum = (n: number) => n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(n)

  const completionRate = jobStats.total > 0
    ? Math.round((jobStats.completed / jobStats.total) * 100)
    : 0

  const pieData = nodeTypes.slice(0, 6).map(n => ({ name: n.name, value: n.count }))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-cg-txt">Data Overview</h1>
        <p className="text-xs text-cg-muted">General overview of all data in your knowledge graph</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Nodes"     value={loading ? '…' : fmtNum(graphStats?.nodeCount  ?? 0)} icon={<Network   size={17}/>} iconColor="#6366F1" />
        <StatCard label="Total Edges"     value={loading ? '…' : fmtNum(graphStats?.edgeCount  ?? 0)} icon={<GitBranch size={17}/>} iconColor="#10B981" />
        <StatCard label="Documents"       value={loading ? '…' : String(graphStats?.documentCount ?? 0)} icon={<FileText  size={17}/>} iconColor="#F59E0B" />
        <StatCard label="Ingestion Jobs"  value={loading ? '…' : String(jobStats.total)}          icon={<Database  size={17}/>} iconColor="#8B5CF6" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Node type bar chart */}
        <Card title="Node Distribution by Type" action={
          <span className="text-xs text-cg-faint flex items-center gap-1"><Layers size={11}/> top 10</span>
        }>
          <div className="px-4 pb-5">
            {nodeTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={nodeTypes} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={tooltip.contentStyle} labelStyle={tooltip.labelStyle} />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-cg-faint text-sm">
                {loading ? 'Loading…' : 'No graph data yet'}
              </div>
            )}
          </div>
        </Card>

        {/* Pie chart of node types */}
        <Card title="Node Type Share" action={
          <span className="text-xs text-cg-faint flex items-center gap-1"><Hash size={11}/> proportion</span>
        }>
          <div className="px-4 pb-5">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltip.contentStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: tick }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-cg-faint text-sm">
                {loading ? 'Loading…' : 'No graph data yet'}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Relationship types + ingestion summary */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Relationship types */}
        <Card title="Relationship Types" action={
          <span className="text-xs text-cg-faint flex items-center gap-1"><TrendingUp size={11}/> edges</span>
        }>
          <div className="px-4 pb-4">
            {relTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={relTypes} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: tick, fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltip.contentStyle} />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-cg-faint text-sm">
                {loading ? 'Loading…' : 'No relationships yet'}
              </div>
            )}
          </div>
        </Card>

        {/* Ingestion summary */}
        <Card title="Ingestion Summary" action={
          <span className="text-xs text-cg-faint flex items-center gap-1"><Activity size={11}/> jobs</span>
        }>
          <div className="p-5 space-y-4">
            {/* Completion rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-cg-muted">Success rate</span>
                <span className="text-cg-txt font-semibold">{loading ? '…' : `${completionRate}%`}</span>
              </div>
              <div className="h-2 bg-cg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: loading ? '0%' : `${completionRate}%` }} />
              </div>
            </div>

            {/* Stats list */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total jobs',  value: jobStats.total,      color: 'text-cg-txt'       },
                { label: 'Completed',   value: jobStats.completed,  color: 'text-emerald-500'  },
                { label: 'Failed',      value: jobStats.failed,     color: 'text-red-500'      },
                { label: 'In progress', value: jobStats.processing, color: 'text-amber-500'    },
              ].map(s => (
                <div key={s.label} className="bg-cg-s2 rounded-xl p-3 border border-cg-border">
                  <p className={`text-xl font-bold ${s.color}`}>{loading ? '…' : s.value}</p>
                  <p className="text-[10px] text-cg-faint mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Graph density */}
            <div className="pt-1 border-t border-cg-border space-y-2">
              <p className="text-[10px] font-semibold text-cg-muted uppercase tracking-wide">Graph metrics</p>
              {[
                { label: 'Avg edges / node', value: graphStats && graphStats.nodeCount > 0
                    ? (graphStats.edgeCount / graphStats.nodeCount).toFixed(2) : '—' },
                { label: 'RDF triples',      value: fmtNum(graphStats?.rdfTriples ?? 0) },
              ].map(m => (
                <div key={m.label} className="flex justify-between text-xs">
                  <span className="text-cg-muted">{m.label}</span>
                  <span className="text-cg-txt font-semibold">{loading ? '…' : m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
