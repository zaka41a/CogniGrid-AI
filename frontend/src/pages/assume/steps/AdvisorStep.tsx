import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Loader2, Wand2 } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ragHttp } from '../../lib/api'
import { ASSUME_SYSTEM } from '../studioStore'

interface Msg { role: 'user' | 'assistant'; content: string }

const EXAMPLES = [
  'Configure a day ahead market with wind and gas units',
  'What bidding strategy should I use for a battery storage unit?',
  'Explain the NaiveSingleBidStrategy and when to use it',
  'Generate a YAML config for a 3-unit day ahead market',
]

const MD: Components = {
  p:  ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
  h1: ({ children }) => <h1 className="text-lg font-bold text-cg-txt mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold text-cg-txt mt-4 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold text-cg-txt mt-3 mb-1.5">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a:  ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-cg-primary underline">{children}</a>,
  strong: ({ children }) => <strong className="font-semibold text-cg-txt">{children}</strong>,
  pre: ({ children }) => (
    <pre className="my-3 rounded-xl bg-slate-950 text-slate-200 p-4 overflow-x-auto text-[12.5px] font-mono leading-relaxed">{children}</pre>
  ),
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className || '')
    return isBlock
      ? <code className="font-mono">{children}</code>
      : <code className="px-1.5 py-0.5 rounded bg-cg-s2 text-cg-primary font-mono text-[0.85em]">{children}</code>
  },
}

export default function AdvisorStep() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setBusy(true)
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const { data } = await ragHttp.post<{ answer: string }>('/api/rag/chat', {
        query: `${ASSUME_SYSTEM}\n\nUser: ${q}`,
        llm_provider: 'groq',
        llm_model: 'llama-3.3-70b-versatile',
        history,
        use_graph_context: true,
        scope: 'assume',
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'No answer.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The advisor is unavailable right now.' }])
    } finally {
      setBusy(false)
    }
  }

  const empty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)]">
      {/* conversation */}
      <div className="flex-1 overflow-y-auto">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl gradient-primary text-white flex items-center justify-center shadow-cg mb-4">
              <Wand2 size={26} />
            </div>
            <h2 className="text-xl font-bold text-cg-txt mb-1">ASSUME Scenario Advisor</h2>
            <p className="text-sm text-cg-muted mb-6 max-w-md">
              Your assistant for electricity market simulation design. Ask about scenarios,
              strategies, market configuration or the ASSUME Python API.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {EXAMPLES.map(e => (
                <button key={e} onClick={() => send(e)}
                  className="text-left text-[13px] px-4 py-3 rounded-xl border border-cg-border bg-cg-surface hover:border-cg-primary/40 hover:bg-cg-primary-s transition-colors text-cg-txt">
                  {e}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-1 py-2 space-y-5">
            {messages.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] gradient-primary text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm shadow-cg-sm">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-xl gradient-primary text-white flex items-center justify-center">
                    <Sparkles size={15} />
                  </div>
                  <div className="flex-1 min-w-0 text-sm text-cg-txt2 pt-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{m.content}</ReactMarkdown>
                  </div>
                </div>
              )
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-sm text-cg-faint">
                <Loader2 size={15} className="animate-spin" /> Thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* composer */}
      <div className="pt-3 max-w-3xl mx-auto w-full">
        <div className="flex items-end gap-2 rounded-2xl border border-cg-border bg-cg-surface shadow-cg p-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            rows={1}
            placeholder="Ask about ASSUME scenarios, markets, bidding strategies..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-cg-txt resize-none focus:outline-none max-h-40"
          />
          <button onClick={() => send(input)} disabled={busy || !input.trim()}
            className="p-2.5 rounded-xl gradient-primary text-white disabled:opacity-40 hover:opacity-90 transition-opacity shadow-cg">
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-[10px] text-cg-faint mt-1.5">Powered by GraphRAG over the ASSUME knowledge base · Groq Llama 3.3 70B</p>
      </div>
    </div>
  )
}
