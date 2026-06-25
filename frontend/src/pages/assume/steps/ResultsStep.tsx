import { useState, useEffect } from 'react'
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell,
} from 'recharts'
import { useStudio } from '../studioStore'
import { runnerApi, type RunInfo, type RunTimeseries } from '../runner'

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#22D3EE', '#EC4899', '#84CC16', '#F97316', '#14B8A6']

function Kpi({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-2xl border border-cg-border bg-cg-bg p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cg-faint mb-1.5">{label}</p>
      <p className="text-2xl font-bold text-cg-txt leading-none">{value}<span className="text-xs text-cg-muted font-normal"> {unit}</span></p>
    </div>
  )
}

// "2024-01-01 00:00:00" → "01-01 00:00"
const fmtTime = (t: string) => (t.length >= 16 ? t.slice(5, 16) : t)

const tooltipStyle = { fontSize: 12, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }
const axisTick = { fontSize: 10, fill: '#94a3b8' }

export default function ResultsStep() {
  const { selectedRunId } = useStudio()
  const [run, setRun] = useState<RunInfo | null>(null)
  const [ts, setTs] = useState<RunTimeseries | null>(null)
  const [loadingTs, setLoadingTs] = useState(false)

  useEffect(() => {
    if (!selectedRunId) { setRun(null); setTs(null); return }
    let alive = true
    runnerApi.list().then(({ data }) => {
      if (alive) setRun(data.find(r => r.run_id === selectedRunId) ?? null)
    }).catch(() => {})
    return () => { alive = false }
  }, [selectedRunId])

  // Load the full time series once the run is completed
  useEffect(() => {
    if (!run || run.status !== 'completed') { setTs(null); return }
    let alive = true
    setLoadingTs(true)
    runnerApi.timeseries(run.run_id)
      .then(({ data }) => { if (alive) setTs(data) })
      .catch(() => { if (alive) setTs(null) })
      .finally(() => { if (alive) setLoadingTs(false) })
    return () => { alive = false }
  }, [run])

  if (!run) {
    return <div className="min-h-[260px] flex items-center justify-center text-sm text-cg-faint">
      Run a simulation, then select it to see results.
    </div>
  }

  const s = run.results_summary
  const cp = s?.clearing_price
  const summaryDispatch = s?.dispatch_mwh ?? s?.dispatch ?? {}
  const summaryDispatchData = Object.entries(summaryDispatch).map(([unit, v]) => ({ unit, v: Math.round(v) }))

  const priceData = ts?.price ?? []
  const dispatchRows = ts?.dispatch?.rows ?? []
  const dispatchUnits = ts?.dispatch?.units ?? []

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-bold text-cg-txt mb-1">Results</h2>
        <p className="text-sm text-cg-muted font-mono">{run.scenario_name} · {run.status}</p>
      </div>

      {!s || run.status !== 'completed' ? (
        <div className="text-sm text-cg-faint">No results yet for this run.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Mean clearing price" value={cp?.mean ?? '-'} unit="EUR/MWh" />
            <Kpi label="Min price" value={cp?.min ?? '-'} unit="EUR/MWh" />
            <Kpi label="Max price" value={cp?.max ?? '-'} unit="EUR/MWh" />
            <Kpi label="Periods" value={cp?.count ?? '-'} />
          </div>

          {/* Clearing price over time */}
          {priceData.length > 0 && (
            <div className="rounded-xl border border-cg-border bg-cg-surface p-4">
              <p className="text-sm font-bold text-cg-txt mb-3">Clearing price over time (EUR/MWh)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="t" tickFormatter={fmtTime} tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={48} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(v: unknown) => fmtTime(String(v))} />
                    <Line type="monotone" dataKey="price" stroke="#6366F1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Supply vs demand volume over time */}
          {priceData.some(p => p.supply || p.demand) && (
            <div className="rounded-xl border border-cg-border bg-cg-surface p-4">
              <p className="text-sm font-bold text-cg-txt mb-3">Supply vs demand volume (MW)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="t" tickFormatter={fmtTime} tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={48} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(v: unknown) => fmtTime(String(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="supply" name="Supply" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={1.5} />
                    <Area type="monotone" dataKey="demand" name="Demand" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.12} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Dispatch by unit over time (stacked) */}
          {dispatchRows.length > 0 && dispatchUnits.length > 0 ? (
            <div className="rounded-xl border border-cg-border bg-cg-surface p-4">
              <p className="text-sm font-bold text-cg-txt mb-3">Dispatch by unit over time (MW)</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dispatchRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="t" tickFormatter={fmtTime} tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={48} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(v: unknown) => fmtTime(String(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {dispatchUnits.map((u, i) => (
                      <Area key={u} type="monotone" dataKey={u} stackId="1"
                        stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.55} strokeWidth={1} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (!loadingTs && summaryDispatchData.length > 0) && (
            <div className="rounded-xl border border-cg-border bg-cg-surface p-4">
              <p className="text-sm font-bold text-cg-txt mb-3">Dispatch by unit (total MWh)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summaryDispatchData}>
                    <XAxis dataKey="unit" tick={axisTick} />
                    <YAxis tick={axisTick} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                      {summaryDispatchData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {loadingTs && (
            <div className="rounded-xl border border-cg-border bg-cg-surface p-8 flex items-center justify-center gap-2 text-sm text-cg-faint">
              <span className="w-4 h-4 border-2 border-cg-border border-t-cg-primary rounded-full animate-spin" /> Loading charts...
            </div>
          )}
          {!loadingTs && priceData.length === 0 && dispatchRows.length === 0 && (
            <p className="text-[11px] text-cg-faint">No time-series output found for this run (showing summary only).</p>
          )}
        </>
      )}
    </div>
  )
}
