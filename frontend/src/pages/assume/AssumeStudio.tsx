import { useState, type ReactNode, type ComponentType } from 'react'
import { PencilRuler, LineChart, Play, BarChart3, GitCompare, Sparkles, Zap } from 'lucide-react'
import { useStudio, type StudioStep } from './studioStore'
import AdvisorPanel from './AdvisorPanel'
import DesignStep from './steps/DesignStep'
import TimeseriesStep from './steps/TimeseriesStep'
import RunStep from './steps/RunStep'
import ResultsStep from './steps/ResultsStep'
import CompareStep from './steps/CompareStep'

const STEPS: { id: StudioStep; label: string; icon: ReactNode }[] = [
  { id: 'design',     label: 'Design',     icon: <PencilRuler size={15} /> },
  { id: 'timeseries', label: 'Timeseries', icon: <LineChart size={15} /> },
  { id: 'run',        label: 'Run',        icon: <Play size={15} /> },
  { id: 'results',    label: 'Results',    icon: <BarChart3 size={15} /> },
  { id: 'compare',    label: 'Compare',    icon: <GitCompare size={15} /> },
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

  return (
    <div>
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <Zap size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-cg-txt leading-tight">ASSUME Studio</h1>
            <p className="text-xs text-cg-faint font-mono">{scenarioName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAdvisorOpen(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              advisorOpen ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' : 'border-cg-border text-cg-muted hover:text-cg-txt'}`}>
            <Sparkles size={15} /> Advisor
          </button>
          <button onClick={() => setStep('run')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cg-primary text-white shadow-cg hover:opacity-90 transition-opacity">
            <Play size={15} /> Run sim
          </button>
        </div>
      </div>

      {/* body */}
      <div className="flex gap-4 items-start">
        {/* step rail */}
        <nav className="w-44 shrink-0 space-y-1">
          {STEPS.map((s, i) => {
            const active = step === s.id
            return (
              <button key={s.id} onClick={() => setStep(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-cg-primary-s text-cg-primary' : 'text-cg-muted hover:text-cg-txt hover:bg-cg-s2'}`}>
                <span className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  active ? 'bg-cg-primary text-white' : 'bg-cg-s2 text-cg-faint'}`}>{i + 1}</span>
                {s.icon}
                {s.label}
              </button>
            )
          })}
        </nav>

        {/* step content */}
        <div className="flex-1 min-w-0">
          <StepView />
        </div>

        {/* advisor */}
        {advisorOpen && (
          <aside className="w-80 shrink-0 rounded-xl border border-cg-border bg-cg-surface overflow-hidden sticky top-2 h-[calc(100vh-9rem)]">
            <AdvisorPanel />
          </aside>
        )}
      </div>
    </div>
  )
}
