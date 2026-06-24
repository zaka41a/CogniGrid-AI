import { RotateCcw } from 'lucide-react'
import { useStudio, DEFAULT_ASSUME_YAML } from '../studioStore'

export default function DesignStep() {
  const { scenarioName, setScenarioName, yaml, setYaml } = useStudio()
  const lines = yaml.split('\n').length

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-cg-txt mb-1">Design the scenario</h2>
        <p className="text-sm text-cg-muted">
          Define markets, units, demand and fuel prices as ASSUME YAML. A visual node builder is coming next.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-cg-muted mb-1.5">Scenario name</label>
        <input
          value={scenarioName}
          onChange={e => setScenarioName(e.target.value)}
          className="w-full bg-cg-bg border border-cg-border rounded-xl px-3 py-2 text-sm text-cg-txt focus:outline-none focus:border-cg-primary"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-cg-muted">YAML configuration ({lines} lines)</label>
          <button onClick={() => setYaml(DEFAULT_ASSUME_YAML)}
            className="flex items-center gap-1 text-xs text-cg-faint hover:text-cg-txt transition-colors">
            <RotateCcw size={12} /> Reset to example
          </button>
        </div>
        <textarea
          value={yaml}
          onChange={e => setYaml(e.target.value)}
          rows={22}
          spellCheck={false}
          className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-3 text-[12.5px] text-emerald-300 font-mono resize-y focus:outline-none focus:border-cg-primary"
        />
      </div>
    </div>
  )
}
