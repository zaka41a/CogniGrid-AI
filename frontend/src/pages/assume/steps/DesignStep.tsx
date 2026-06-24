import { useMemo } from 'react'
import Editor from '@monaco-editor/react'
import { RotateCcw, FileCode2, Boxes } from 'lucide-react'
import { useStudio, DEFAULT_ASSUME_YAML } from '../studioStore'

const SECTIONS = [
  { key: 'general',     label: 'General',      desc: 'name, dates, time step' },
  { key: 'markets',     label: 'Markets',      desc: 'EOM, products, mechanism' },
  { key: 'units',       label: 'Units',        desc: 'plants, wind, storage' },
  { key: 'demand',      label: 'Demand',       desc: 'consumers' },
  { key: 'fuel_prices', label: 'Fuel prices',  desc: 'coal, gas, co2' },
]

export default function DesignStep() {
  const { scenarioName, setScenarioName, yaml, setYaml } = useStudio()
  const lines = useMemo(() => yaml.split('\n').length, [yaml])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-cg-txt mb-1">Design the scenario</h2>
        <p className="text-sm text-cg-muted">
          Define markets, units, demand and fuel prices. A visual node builder is coming next.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* meta + section guide */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-cg-muted mb-1.5">Scenario name</label>
            <input
              value={scenarioName}
              onChange={e => setScenarioName(e.target.value)}
              className="w-full bg-cg-bg border border-cg-border rounded-xl px-3 py-2 text-sm text-cg-txt focus:outline-none focus:border-cg-primary"
            />
          </div>
          <div className="rounded-xl border border-cg-border bg-cg-surface p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cg-muted mb-2">
              <Boxes size={13} className="text-cg-primary" /> Sections
            </div>
            <ul className="space-y-1.5">
              {SECTIONS.map(s => (
                <li key={s.key} className="text-[11px] leading-tight">
                  <span className="font-mono text-cg-txt">{s.key}</span>
                  <span className="text-cg-faint"> · {s.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Monaco YAML editor */}
        <div className="lg:col-span-3 rounded-xl border border-cg-border overflow-hidden bg-[#1e1e1e]">
          <div className="flex items-center justify-between px-3 h-10 border-b border-white/10 bg-[#252526]">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <FileCode2 size={14} className="text-cg-primary" />
              <span className="font-mono">{scenarioName || 'scenario'}.yaml</span>
              <span className="text-white/30">· {lines} lines</span>
            </div>
            <button onClick={() => setYaml(DEFAULT_ASSUME_YAML)}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/80 transition-colors">
              <RotateCcw size={11} /> Reset example
            </button>
          </div>
          <Editor
            height="60vh"
            language="yaml"
            theme="vs-dark"
            value={yaml}
            onChange={v => setYaml(v ?? '')}
            loading={<div className="p-4 text-xs text-white/40">Loading editor...</div>}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: 'all',
              smoothScrolling: true,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          />
        </div>
      </div>
    </div>
  )
}
