import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStudio } from '../studioStore'
import { runnerApi, type RunInfo } from '../runner'

function Kpi({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-2xl border border-cg-border bg-cg-bg p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cg-faint mb-1.5">{label}</p>
      <p className="text-2xl font-bold text-cg-txt leading-none">{value}<span className="text-xs text-cg-muted font-normal"> {unit}</span></p>
    </div>
  )
}

export default function ResultsStep() {
  const { selectedRunId } = useStudio()
  const [run, setRun] = useState<RunInfo | null>(null)

  useEffect(() => {
    if (!selectedRunId) { setRun(null); return }
    let alive = true
    runnerApi.list().then(({ data }) => {
      if (alive) setRun(data.find(r => r.run_id === selectedRunId) ?? null)
    }).catch(() => {})
    return () => { alive = false }
  }, [selectedRunId])

  if (!run) {
    return <div className="min-h-[260px] flex items-center justify-center text-sm text-cg-faint">
      Run a simulation, then select it to see results.
    </div>
  }

  const s = run.results_summary
  const cp = s?.clearing_price
  const dispatch = s?.dispatch_mwh ?? s?.dispatch ?? {}
  const dispatchData = Object.entries(dispatch).map(([unit, v]) => ({ unit, v: Math.round(v) }))
  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#22D3EE', '#EC4899', '#84CC16']

  return (
    <div className="space-y-5 max-w-4xl">
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

          {dispatchData.length > 0 && (
            <div className="rounded-xl border border-cg-border bg-cg-surface p-4">
              <p className="text-sm font-bold text-cg-txt mb-3">Dispatch by unit (MWh)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dispatchData}>
                    <XAxis dataKey="unit" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ fontSize: 12, background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                    <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                      {dispatchData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <p className="text-[11px] text-cg-faint">
            Richer time-series charts (price curve, stacked dispatch over time) are the next step of the rollout.
          </p>
        </>
      )}
    </div>
  )
}
