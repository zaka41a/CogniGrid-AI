import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench, Brain, Eye, Sparkles } from 'lucide-react'

/**
 * Parses a ReAct-style trace (THOUGHT/ACTION/ARGS/OBSERVATION blocks emitted by
 * the agent service) and renders a collapsible reasoning timeline.
 *
 * The trace lives inside the raw assistant message *before* `cleanAgentResponse`
 * strips it. Pass the raw text here and the cleaned text to <MessageBubble>.
 */
export interface TraceStep {
  kind: 'thought' | 'action' | 'args' | 'observation'
  content: string
}

export function parseTrace(raw: string): TraceStep[] {
  if (!raw) return []
  const steps: TraceStep[] = []
  const lines = raw.split('\n')
  let current: TraceStep | null = null
  for (const line of lines) {
    const m = line.match(/^(THOUGHT|ACTION|ARGS|OBSERVATION):\s*(.*)$/i)
    if (m) {
      if (current) steps.push(current)
      current = { kind: m[1].toLowerCase() as TraceStep['kind'], content: m[2] }
    } else if (current) {
      // Stop the current step on blank/separator/final-answer lines
      if (!line.trim() || /^FINAL ANSWER:/i.test(line)) {
        steps.push(current)
        current = null
      } else {
        current.content += (current.content ? '\n' : '') + line
      }
    }
  }
  if (current) steps.push(current)
  return steps
}

const KIND_META: Record<TraceStep['kind'], { icon: React.ReactNode; label: string; color: string }> = {
  thought:     { icon: <Brain size={11}/>,    label: 'Thinking',    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  action:      { icon: <Wrench size={11}/>,   label: 'Action',      color: 'text-cg-primary bg-cg-primary-s border-cg-primary/30' },
  args:        { icon: <Sparkles size={11}/>, label: 'Args',        color: 'text-amber-400  bg-amber-500/10  border-amber-500/20' },
  observation: { icon: <Eye size={11}/>,      label: 'Observation', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
}

interface Props {
  trace: TraceStep[]
  defaultOpen?: boolean
}

export function ToolTimeline({ trace, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  if (trace.length === 0) return null

  const toolCount = trace.filter(s => s.kind === 'action').length

  return (
    <div className="w-full mt-1">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <Wrench size={10} />
        <span>{toolCount} tool{toolCount !== 1 ? 's' : ''} · {trace.length} step{trace.length !== 1 ? 's' : ''}</span>
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5 ml-2 border-l-2 border-cg-border pl-3">
          {trace.map((step, i) => {
            const meta = KIND_META[step.kind]
            return (
              <li key={i} className="flex items-start gap-2 text-[11px]">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border shrink-0 ${meta.color}`}>
                  {meta.icon}
                  <span className="font-bold">{meta.label}</span>
                </span>
                <span className="text-cg-muted leading-snug whitespace-pre-wrap">
                  {step.content.length > 240 ? step.content.slice(0, 240) + '…' : step.content}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
