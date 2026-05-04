import { Sparkles, Square } from 'lucide-react'

/**
 * Renders an in-flight LLM response: typing indicator + accumulated text + Stop button.
 */
interface Props {
  content: string
  onStop?: () => void
}

export function StreamingMessage({ content, onStop }: Props) {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 mt-0.5 shadow-cg">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="max-w-[72%] flex flex-col items-start gap-1.5">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-cg-surface border border-cg-border text-cg-txt text-sm leading-relaxed whitespace-pre-wrap min-w-[60px]">
          {content || <span className="inline-flex items-center gap-1.5">
            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cg-primary inline-block" />
            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cg-primary inline-block" />
            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cg-primary inline-block" />
          </span>}
          {content && <span className="ml-0.5 inline-block w-1.5 h-3 bg-cg-primary animate-pulse rounded-sm" />}
        </div>
        {onStop && (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Square size={9} fill="currentColor" /> Stop generating
          </button>
        )}
      </div>
    </div>
  )
}
