import { Network, AlertOctagon, Brain, Activity, AlertTriangle, Upload, Share2, UserCheck, CheckCircle } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import { useChartColors } from '../hooks/useChartColors'
import { mockIngestionTimeSeries, mockAnomalyBarData, mockActivityFeed } from '../mock'
import type { ActivityEvent } from '../types'

const ACTIVITY_ICONS: Record<ActivityEvent['icon'], typeof AlertOctagon> = {
  alert:  AlertTriangle,
  upload: Upload,
  graph:  Share2,
  ai:     Brain,
  user:   UserCheck,
  check:  CheckCircle,
}

const ACTIVITY_ICON_COLORS: Record<ActivityEvent['severity'] & string, string> = {
  critical: 'text-red-400 bg-red-500/10',
  warning:  'text-yellow-400 bg-yellow-500/10',
  info:     'text-green-400 bg-green-500/10',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Dashboard() {
  const anomalyCount = 3
  const { grid, tick, tooltip } = useChartColors()

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {anomalyCount > 2 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <span className="font-semibold">{anomalyCount} critical anomalies</span> detected across monitored systems. Immediate review recommended.
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Graph Nodes"
          value="24,812"
          change="+340 since yesterday"
          trend="up"
          icon={<Network size={18} className="text-blue-400" />}
          iconBg="bg-blue-500/15"
        />
        <StatCard
          label="Anomalies Detected"
          value="47"
          change="+12 in last 24h"
          trend="down"
          icon={<AlertOctagon size={18} className="text-red-400" />}
          iconBg="bg-red-500/15"
        />
        <StatCard
          label="Active Predictions"
          value="8"
          change="3 models running"
          trend="neutral"
          icon={<Brain size={18} className="text-blue-400" />}
          iconBg="bg-blue-500/15"
        />
        <StatCard
          label="System Uptime"
          value="99.7%"
          change="Last 30 days"
          trend="up"
          icon={<Activity size={18} className="text-green-400" />}
          iconBg="bg-green-500/15"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Line chart */}
        <Card title="Data Ingested — Last 30 Days" className="xl:col-span-3">
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mockIngestionTimeSeries} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: tick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltip.contentStyle}
                  labelStyle={tooltip.labelStyle}
                  itemStyle={{ color: '#4ADE80' }}
                />
                <Line
                  type="monotone" dataKey="value" stroke="url(#lineGradient)"
                  strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#22C55E' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Bar chart */}
        <Card title="Anomaly Score by System" className="xl:col-span-2">
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mockAnomalyBarData} margin={{ top: 4, right: 12, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="system" tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1]} tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltip.contentStyle}
                  labelStyle={tooltip.labelStyle}
                  formatter={(v: number) => [v.toFixed(2), 'Score']}
                />
                <Bar dataKey="score" fill="url(#barGradient)" radius={[4, 4, 0, 0]}
                  label={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Activity feed */}
      <Card title="Recent Activity">
        <div className="divide-y divide-cg-border">
          {mockActivityFeed.map((event) => {
            const Icon = ACTIVITY_ICONS[event.icon]
            const severity = event.severity ?? 'info'
            const colorClass = ACTIVITY_ICON_COLORS[severity]
            return (
              <div key={event.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-cg-s2 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cg-txt">{event.title}</p>
                  <p className="text-xs text-cg-muted mt-0.5">{event.description}</p>
                </div>
                <span className="text-[11px] text-cg-faint whitespace-nowrap mt-0.5">
                  {formatDate(event.timestamp)}
                </span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
