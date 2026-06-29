import { useMemo, useState, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { parse } from 'yaml'
import { RotateCcw, FileCode2, Workflow, Download, Upload, LayoutTemplate } from 'lucide-react'
import { useStudio, DEFAULT_ASSUME_YAML } from '../studioStore'
import VisualBuilder from '../VisualBuilder'
import { useToast } from '../../../components/ui/Toast'

type Tab = 'visual' | 'yaml'

const STORAGE_PRESET = `${DEFAULT_ASSUME_YAML}storage_units:
  battery_1:
    technology: storage
    unit_operator: storage_op
    max_power_charge: 100
    max_power_discharge: 100
    max_soc: 400
    efficiency_charge: 0.95
    efficiency_discharge: 0.95
    additional_cost: 1
    bidding_strategies:
      EOM: flexable_eom_storage
`

const RENEWABLES_PRESET = `general:
  scenario_name: "renewables_heavy"
  start_date: "2019-01-01"
  end_date: "2019-01-02"
  time_step: "1h"

markets:
  EOM:
    operator: EOM
    product: "simple_dayahead_auction"
    opening_time: "0h"
    closing_time: "-1h"
    products:
      - duration: "1h"
        count: 24
        first_delivery: "0h"

units:
  wind_1:
    technology: power_plant
    unit_operator: green_co
    fuel_type: wind
    emission_factor: 0.0
    max_power: 350
    min_power: 0
    efficiency: 1.0
    bidding_strategies:
      EOM: NaiveSingleBidStrategy
  solar_1:
    technology: power_plant
    unit_operator: green_co
    fuel_type: solar
    emission_factor: 0.0
    max_power: 250
    min_power: 0
    efficiency: 1.0
    bidding_strategies:
      EOM: NaiveSingleBidStrategy
  gas_backup:
    technology: power_plant
    unit_operator: peaker_co
    fuel_type: natural_gas
    emission_factor: 0.45
    max_power: 120
    min_power: 20
    efficiency: 0.5
    bidding_strategies:
      EOM: NaiveSingleBidStrategy

demand:
  demand_1:
    technology: demand
    unit_operator: consumer
    max_power: 500
    min_power: 250

fuel_prices:
  natural_gas: 40.0
  co2: 30.0
`

const PRESETS: { name: string; yaml: string; scenario: string }[] = [
  { name: 'Day-ahead (simple)',   yaml: DEFAULT_ASSUME_YAML, scenario: 'day_ahead_example' },
  { name: 'With battery storage', yaml: STORAGE_PRESET,       scenario: 'day_ahead_storage' },
  { name: 'Renewables heavy',     yaml: RENEWABLES_PRESET,    scenario: 'renewables_heavy' },
]

export default function DesignStep() {
  const { scenarioName, setScenarioName, yaml, setYaml } = useStudio()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('visual')
  const [presetsOpen, setPresetsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const lines = useMemo(() => yaml.split('\n').length, [yaml])

  const onExport = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${scenarioName || 'scenario'}.yaml`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Scenario exported', `${scenarioName || 'scenario'}.yaml`)
  }

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      try {
        const doc = parse(text)
        if (!doc || typeof doc !== 'object') throw new Error('not an object')
        setYaml(text)
        const name = doc?.general?.scenario_name
        if (typeof name === 'string' && name.trim()) setScenarioName(name.trim())
        toast.success('Scenario imported', file.name)
      } catch {
        toast.error('Invalid file', 'This file is not a valid YAML scenario.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const applyPreset = (p: typeof PRESETS[number]) => {
    setYaml(p.yaml)
    setScenarioName(p.scenario)
    setPresetsOpen(false)
    toast.info('Preset loaded', p.name)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-cg-txt mb-1">Design the scenario</h2>
          <p className="text-sm text-cg-muted">Build markets, units and demand visually, or edit the YAML directly. Both stay in sync.</p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-cg-muted mb-1">Scenario name</label>
            <input
              value={scenarioName}
              onChange={e => setScenarioName(e.target.value)}
              className="bg-cg-bg border border-cg-border rounded-xl px-3 py-2 text-sm text-cg-txt focus:outline-none focus:border-cg-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setPresetsOpen(o => !o)} onBlur={() => setTimeout(() => setPresetsOpen(false), 150)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cg-border bg-cg-surface text-sm text-cg-txt hover:bg-cg-s2 transition-colors">
                <LayoutTemplate size={14} /> Presets
              </button>
              {presetsOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-xl border border-cg-border bg-cg-surface shadow-cg-lg z-20 overflow-hidden">
                  {PRESETS.map(p => (
                    <button key={p.name} onMouseDown={() => applyPreset(p)}
                      className="block w-full text-left px-3 py-2 text-sm text-cg-txt hover:bg-cg-primary-s transition-colors">
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cg-border bg-cg-surface text-sm text-cg-txt hover:bg-cg-s2 transition-colors">
              <Upload size={14} /> Import
            </button>
            <input ref={fileRef} type="file" accept=".yaml,.yml" className="hidden" onChange={onImport} />
            <button onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cg-border bg-cg-surface text-sm text-cg-txt hover:bg-cg-s2 transition-colors">
              <Download size={14} /> Export
            </button>
          </div>

          <div className="flex rounded-xl border border-cg-border bg-cg-surface p-1">
            <TabBtn active={tab === 'visual'} onClick={() => setTab('visual')} icon={<Workflow size={13} />} label="Visual" />
            <TabBtn active={tab === 'yaml'} onClick={() => setTab('yaml')} icon={<FileCode2 size={13} />} label="YAML" />
          </div>
        </div>
      </div>

      {tab === 'visual' ? (
        <VisualBuilder yaml={yaml} onChange={setYaml} />
      ) : (
        <div className="rounded-xl border border-cg-border overflow-hidden bg-[#1e1e1e]">
          <div className="flex items-center justify-between px-3 h-10 border-b border-white/10 bg-[#252526]">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <FileCode2 size={14} className="text-cg-primary" />
              <span className="font-mono">{scenarioName || 'scenario'}.yaml</span>
              <span className="text-white/30">· {lines} lines</span>
            </div>
            <button onClick={() => setYaml(DEFAULT_ASSUME_YAML)} className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/80 transition-colors">
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
      )}
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active ? 'bg-cg-primary text-white shadow-cg-sm' : 'text-cg-muted hover:text-cg-txt'
      }`}
    >
      {icon}{label}
    </button>
  )
}
