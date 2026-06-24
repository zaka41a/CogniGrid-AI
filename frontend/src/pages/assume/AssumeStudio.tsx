import { useState, type ReactNode, type ComponentType } from 'react'
import { PencilRuler, LineChart, Play, BarChart3, GitCompare, Sparkles, Zap, Check } from 'lucide-react'
import { useStudio, type StudioStep } from './studioStore'
import AdvisorPanel from './AdvisorPanel'
import DesignStep from './steps/DesignStep'
import TimeseriesStep from './steps/TimeseriesStep'
import RunStep from './steps/RunStep'
import ResultsStep from './steps/ResultsStep'
import CompareStep from './steps/CompareStep'

const STEPS: { id: StudioStep; label: string; desc: string; icon: ReactNode }[] = [
  { id: 'design',     label: 'Design',     desc: 'markets & units',   icon: <PencilRuler size={15} /> },
  { id: 'timeseries', label: 'Timeseries', desc: 'demand & prices',   icon: <LineChart size={15} /> },
  { id: 'run',        label: 'Run',        desc: 'execute',           icon: <Play size={15} /> },
  { id: 'results',    label: 'Results',    desc: 'analyse',           icon: <BarChart3 size={15} /> },
  { id: 'compare',    label: 'Compare',    desc: 'benchmark',         icon: <GitCompare size={15} /> },
]

const STEP_VIEWS: Record<StudioStep, ComponentType> = {
  design: DesignStep,
  timeseries: TimeseriesStep,
  run: RunStep,
  results: ResultsStep,
  compare: CompareStep,
}

export default function AssumeStudio() {
  const { step, setStep, scenarioName } = useStudio()
  const [advisorOpen, setAdvisorOpen] = useState(true)
  const StepView = STEP_VIEWS[step]
  const activeIdx = STEPS.findIndex(s => s.id === step)

  return (
    <div className="space-y-5">
      {/* ── Hero header ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-cg-border bg-cg-surface shadow-cg">
        <div className="absolute inset-0 opacity-[0.05] bg-gradient-to-br from-cg-primary to-cg-accent" />
        <div className="relative flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl gradient-primary text-white flex items-center justify-center shadow-cg">
              <Zap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-cg-txt tracking-tight leading-none">ASSUME Studio</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-cg-muted">Electricity market simulation</span>
                <span className="w-1 h-1 rounded-full bg-cg-border" />
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-cg-primary bg-cg-primary-s px-2 py-0.5 rounded-md">
                  {scenarioName || 'scenario'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAdvisorOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                advisorOpen
                  ? 'border-cg-primary/40 text-cg-primary bg-cg-primary-s'
                  : 'border-cg-border text-cg-muted hover:text-cg-txt hover:bg-cg-s2'}`}>
              <Sparkles size={15} /> Advisor
            </button>
            <button onClick={() => setStep('run')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold gradient-primary text-white shadow-cg hover:shadow-cg-md hover:-translate-y-px transition-all">
              <Play size={15} /> Run simulation
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex gap-5 items-start">
        {/* stepper rail */}
        <nav className="w-52 shrink-0">
          <div className="rounded-2xl border border-cg-border bg-cg-surface shadow-cg p-2 space-y-0.5">
            {STEPS.map((s, i) => {
              const active = step === s.id
              const done = i < activeIdx
              return (
                <button key={s.id} onClick={() => setStep(s.id)}
                  className={`relative w-full flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-xl text-left transition-all ${
                    active ? 'bg-cg-primary-s' : 'hover:bg-cg-s2'}`}>
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full gradient-primary" />}
                  <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    active ? 'gradient-primary text-white shadow-cg'
                    : done ? 'bg-cg-primary-s text-cg-primary'
                    : 'bg-cg-s2 text-cg-faint'}`}>
                    {done ? <Check size={14} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`flex items-center gap-1.5 text-sm font-semibold leading-tight ${active ? 'text-cg-primary' : 'text-cg-txt'}`}>
                      {s.icon}{s.label}
                    </span>
                    <span className="block text-[11px] text-cg-faint leading-tight mt-0.5">{s.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* step content */}
        <div className="flex-1 min-w-0 rounded-2xl border border-cg-border bg-cg-surface shadow-cg p-5">
          <StepView />
        </div>

        {/* advisor */}
        {advisorOpen && (
          <aside className="w-80 shrink-0 rounded-2xl border border-cg-border bg-cg-surface shadow-cg overflow-hidden sticky top-2 h-[calc(100vh-9rem)]">
            <AdvisorPanel />
          </aside>
        )}
      </div>
    </div>
  )
}
