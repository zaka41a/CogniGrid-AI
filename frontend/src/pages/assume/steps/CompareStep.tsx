import { useState, useEffect } from 'react'
import { useStudio } from '../studioStore'
import { runnerApi, type RunInfo } from '../runner'

export default function CompareStep() {
  const { setSelectedRunId, setStep } = useStudio()
  const [runs, setRuns] = useState<RunInfo[]>([])

  useEffect(() => {
    let alive = true
    runnerApi.list().then(({ data }) => { if (alive) setRuns(data) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const completed = runs.filter(r => r.status === 'completed')

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-cg-txt mb-1">Compare runs</h2>
        <p className="text-sm text-cg-muted">Clearing price across your completed simulations.</p>
      </div>

      {completed.length === 0 ? (
        <div className="text-sm text-cg-faint">No completed runs to compare yet.</div>
      ) : (
        <div className="rounded-xl border border-cg-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cg-s2 text-cg-muted text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Scenario</th>
                <th className="text-right px-4 py-2 font-semibold">Mean</th>
                <th className="text-right px-4 py-2 font-semibold">Min</th>
                <th className="text-right px-4 py-2 font-semibold">Max</th>
                <th className="text-right px-4 py-2 font-semibold">Duration</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {completed.map(r => {
                const cp = r.results_summary?.clearing_price
                return (
                  <tr key={r.run_id} className="border-t border-cg-border hover:bg-cg-s2">
                    <td className="px-4 py-2 font-mono text-cg-txt">{r.scenario_name}</td>
                    <td className="px-4 py-2 text-right text-cg-txt">{cp?.mean ?? '-'}</td>
                    <td className="px-4 py-2 text-right text-cg-muted">{cp?.min ?? '-'}</td>
                    <td className="px-4 py-2 text-right text-cg-muted">{cp?.max ?? '-'}</td>
                    <td className="px-4 py-2 text-right text-cg-faint">{r.duration_s != null ? `${r.duration_s}s` : '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => { setSelectedRunId(r.run_id); setStep('results') }}
                        className="text-xs font-semibold text-cg-primary hover:underline">Open</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
