import { Network, AlertOctagon, Brain, Activity, AlertTriangle, Upload, Share2, UserCheck, CheckCircle, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { StatCard } from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import { Badge, severityBadge } from '../components/ui/Badge'
import { useChartColors } from '../hooks/useChartColors'
import { mockIngestionTimeSeries, mockAnomalyBarData, mockActivityFeed } from '../mock'
import type { ActivityEvent } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTIVITY_ICONS: Record<ActivityEvent['icon'], any> = {
  alert:  AlertTriangle,
  upload: Upload,
  graph:  Share2,
  ai:     Brain,
  user:   UserCheck,
  check:  CheckCircle,
}

const ACTIVITY_COLORS: Record<string, { icon: string; bg: string }> = {
  critical: { icon: 'text-red-500',     bg: 'bg-red-500/10' },
  warning:  { icon: 'text-amber-500',   bg: 'bg-amber-500/10' },
  info:     { icon: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Dashboard() {
  const { grid, tick, tooltip } = useChartColors()

  return (
    <div className="space-y-6">

      {/* Alert banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl anim-fade-in">
        <AlertTriangle size={15} className="text-amber-500 shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <span className="font-semibold">3 critical anomalies</span> detected across monitored systems — immediate review recommended.
        </p>
        <button className="ml-auto text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline whitespace-nowrap">
          View alerts
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Graph Nodes"
          value="24,812"
          icon={<Network size={17} />}
          iconColor="#6366F1"
          trend={1.4}
          trendLabel="since yesterday"
        />
        <StatCard
          label="Anomalies Detected"
          value="47"
          icon={<AlertOctagon size={17} />}
          iconColor="#EF4444"
          trend={-8}
          trendLabel="vs last 24h"
        />
        <StatCard
          label="Active AI Models"
          value="8"
          icon={<Brain size={17} />}
          iconColor="#8B5CF6"
          trend={0}
          trendLabel="3 running"
        />
        <StatCard
          label="System Uptime"
          value="99.7%"
          suffix=""
          icon={<Activity size={17} />}
          iconColor="#10B981"
          trend={0.2}
          trendLabel="last 30 days"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Area chart */}
        <Card title="Data Ingested — Last 30 Days" action={
          <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
            <TrendingUp size={12} /> +18%
          </span>
        } className="xl:col-span-3">
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={mockIngestionTimeSeries} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} interval={5} />
                <YAxis tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltip.contentStyle} labelStyle={tooltip.labelStyle} />
                <Area
                  type="monotone" dataKey="value"
                  stroke="#6366F1" strokeWidth={2}
                  fill="url(#areaGrad)"
                  dot={false} activeDot={{ r: 4, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Bar chart */}
        <Card title="Anomaly Score by System" className="xl:col-span-2">
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={mockAnomalyBarData} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="system" tick={{ fill: tick, fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1]} tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltip.contentStyle}
                  labelStyle={tooltip.labelStyle}
                  formatter={(v: number) => [v.toFixed(2), 'Score']}
                />
                <Bar dataKey="score" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Activity feed */}
        <Card title="Recent Activity" className="xl:col-span-2">
          <div className="divide-y divide-cg-border">
            {mockActivityFeed.slice(0, 6).map((event) => {
              const Icon = ACTIVITY_ICONS[event.icon]
              const sev = event.severity ?? 'info'
              const { icon: iconCls, bg } = ACTIVITY_COLORS[sev]
              return (
                <div key={event.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-cg-s2 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                    <Icon size={13} className={iconCls} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cg-txt leading-snug">{event.title}</p>
                    <p className="text-xs text-cg-muted mt-0.5 truncate">{event.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-cg-faint">{formatDate(event.timestamp)}</span>
                    {sev !== 'info' && (
                      <div className="mt-1">
                        <Badge variant={severityBadge(sev)} dot>{sev}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-5 py-3 border-t border-cg-border">
            <button className="text-xs text-cg-primary hover:underline font-medium">View all activity</button>
          </div>
        </Card>

        {/* Quick stats */}
        <div className="space-y-4">
          <Card title="Knowledge Graph Health">
            <div className="p-5 space-y-4">
              {[
                { label: 'Graph completeness',   value: 87, color: 'bg-indigo-500' },
                { label: 'Embedding coverage',   value: 72, color: 'bg-violet-500' },
                { label: 'Alert resolution rate', value: 94, color: 'bg-emerald-500' },
                { label: 'Model accuracy (avg)',  value: 91, color: 'bg-amber-500' },
              ].map(s => (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-cg-muted">{s.label}</span>
                    <span className="text-cg-txt font-semibold">{s.value}%</span>
                  </div>
                  <div className="h-1.5 bg-cg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${s.color}`}
                      style={{ width: `${s.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Top Systems">
            <div className="divide-y divide-cg-border">
              {[
                { name: 'Energy Grid',  score: 0.87, sev: 'Critical' },
                { name: 'Telemetry',    score: 0.74, sev: 'Medium'   },
                { name: 'Sensors',      score: 0.61, sev: 'Medium'   },
                { name: 'Network',      score: 0.42, sev: 'Low'      },
              ].map(s => (
                <div key={s.name} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-cg-txt">{s.name}</p>
                  </div>
                  <Badge variant={severityBadge(s.sev)}>{s.sev}</Badge>
                  <span className="text-xs font-mono text-cg-muted w-8 text-right">{s.score}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
