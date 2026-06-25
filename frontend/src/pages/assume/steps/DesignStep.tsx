import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { RotateCcw, FileCode2, Workflow } from 'lucide-react'
import { useStudio, DEFAULT_ASSUME_YAML } from '../studioStore'
import VisualBuilder from '../VisualBuilder'

type Tab = 'visual' | 'yaml'

export default function DesignStep() {
  const { scenarioName, setScenarioName, yaml, setYaml } = useStudio()
  const [tab, setTab] = useState<Tab>('visual')
  const lines = useMemo(() => yaml.split('\n').length, [yaml])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-cg-txt mb-1">Design the scenario</h2>
          <p className="text-sm text-cg-muted">Build markets, units and demand visually, or edit the YAML directly. Both stay in sync.</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-cg-muted mb-1">Scenario name</label>
            <input
              value={scenarioName}
              onChange={e => setScenarioName(e.target.value)}
              className="bg-cg-bg border border-cg-border rounded-xl px-3 py-2 text-sm text-cg-txt focus:outline-none focus:border-cg-primary"
            />
          </div>
          <div className="flex rounded-xl border border-cg-border bg-cg-surface p-1 self-end">
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
