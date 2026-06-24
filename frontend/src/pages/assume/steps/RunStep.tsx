import { useState, useEffect, useRef } from 'react'
import { Play, Loader2, Trash2, BarChart3 } from 'lucide-react'
import { useStudio } from '../studioStore'
import { runnerApi, type RunInfo, STATUS_STYLE } from '../runner'

export default function RunStep() {
  const { yaml, scenarioName, pushGraph, setPushGraph, selectedRunId, setSelectedRunId, setStep } = useStudio()
  const [runs, setRuns] = useState<RunInfo[]>([])
  const [online, setOnline] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const { data } = await runnerApi.list()
        if (alive) { setRuns(data); setOnline(true) }
      } catch {
        if (alive) setOnline(false)
      }
    }
    poll()
    const id = setInterval(poll, 5_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const current = runs.find(r => r.run_id === selectedRunId) ?? null

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [current?.log_lines.length])

  const launch = async () => {
    if (!yaml.trim() || submitting) return
    setSubmitting(true)
    try {
      const { data } = await runnerApi.start({
        yaml_config: yaml, scenario_name: scenarioName, description: '', push_to_graph: pushGraph,
      })
      setRuns(prev => [data, ...prev])
      setSelectedRunId(data.run_id)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to start run')
    } finally {
      setSubmitting(false)
    }
  }

  const del = async (id: string) => {
    setRuns(prev => prev.filter(r => r.run_id !== id))
    if (selectedRunId === id) setSelectedRunId(null)
    try { await runnerApi.remove(id) } catch { /* UI already updated */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-cg-txt mb-1">Run simulation</h2>
          <p className="text-sm text-cg-muted">Execute the scenario and stream the ASSUME log.</p>
        </div>
        <button onClick={launch} disabled={submitting || online === false}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cg-primary text-white shadow-cg hover:opacity-90 disabled:opacity-40 transition-opacity">
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          Launch
        </button>
      </div>

      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
        online === null ? 'border-cg-border bg-cg-s2 text-cg-faint'
        : online ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
        : 'border-red-500/40 bg-red-500/10 text-red-400'}`}>
        <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        {online === null ? 'Checking ASSUME Runner...' : online ? 'ASSUME Runner online' : 'ASSUME Runner offline'}
      </div>

      <label className="flex items-center gap-2 text-xs text-cg-muted">
        <input type="checkbox" checked={pushGraph} onChange={e => setPushGraph(e.target.checked)} />
        Push results to the knowledge graph after the run
      </label>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* history */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-cg-muted">Run history ({runs.length})</p>
          {runs.length === 0 && <p className="text-xs text-cg-faint">No runs yet.</p>}
          {runs.map(r => (
            <button key={r.run_id} onClick={() => setSelectedRunId(r.run_id)}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${
                selectedRunId === r.run_id ? 'border-cg-primary bg-cg-primary-s' : 'border-cg-border hover:bg-cg-s2'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-cg-txt font-mono truncate">{r.scenario_name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[r.status]}`}>
                  {r.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-cg-faint font-mono">{r.run_id}{r.duration_s != null ? ` · ${r.duration_s}s` : ''}</span>
                <span onClick={e => { e.stopPropagation(); del(r.run_id) }} className="text-cg-faint hover:text-red-400">
                  <Trash2 size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* current run log */}
        <div className="lg:col-span-2">
          {!current ? (
            <div className="h-full min-h-[260px] flex items-center justify-center rounded-xl border border-cg-border text-sm text-cg-faint">
              Select or launch a run to see its log.
            </div>
          ) : (
            <div className="rounded-xl border border-cg-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-cg-border bg-cg-s2">
                <span className="text-sm font-bold text-cg-txt font-mono">{current.scenario_name}</span>
                {current.status === 'completed' && (
                  <button onClick={() => setStep('results')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-cg-primary hover:underline">
                    <BarChart3 size={13} /> View results
                  </button>
                )}
              </div>
              {current.error && <div className="px-4 py-2 text-xs text-red-400 bg-red-500/10">{current.error}</div>}
              <div ref={logRef} className="h-[340px] overflow-y-auto bg-cg-bg p-3 text-[11px] font-mono text-cg-muted whitespace-pre-wrap">
                {(current.log_lines || []).join('\n') || 'Waiting for output...'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
