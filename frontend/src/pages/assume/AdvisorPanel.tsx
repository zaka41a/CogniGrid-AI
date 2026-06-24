import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ragHttp } from '../../lib/api'
import { ASSUME_SYSTEM } from './studioStore'

interface Msg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Configure a day ahead market with wind and gas',
  'Which bidding strategy for a battery storage unit?',
  'Explain NaiveSingleBidStrategy',
]

export default function AdvisorPanel() {
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

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-2 px-4 h-12 shrink-0 border-b border-cg-border bg-gradient-to-r from-cg-primary-s to-transparent">
        <div className="w-6 h-6 rounded-lg gradient-primary text-white flex items-center justify-center">
          <Sparkles size={13} />
        </div>
        <span className="text-sm font-bold text-cg-txt">Scenario Advisor</span>
        <span className="ml-auto text-[10px] text-cg-faint">Groq · GraphRAG</span>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-cg-muted px-1">Ask anything about ASSUME scenario design.</p>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="w-full text-left text-[12px] px-3 py-2 rounded-xl border border-cg-border text-cg-muted hover:text-cg-txt hover:border-cg-primary/40 hover:bg-cg-primary-s transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed shadow-cg-sm ${
              m.role === 'user'
                ? 'gradient-primary text-white rounded-br-md'
                : 'bg-cg-s2 text-cg-txt rounded-bl-md'}`}>
              {m.role === 'assistant'
                ? <div className="cg-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                : m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-cg-faint px-1">
            <Loader2 size={13} className="animate-spin" /> Thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* input */}
      <div className="p-3 border-t border-cg-border shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            rows={2}
            placeholder="Ask the advisor..."
            className="flex-1 bg-cg-bg border border-cg-border rounded-xl px-3 py-2 text-[13px] text-cg-txt resize-none focus:outline-none focus:border-cg-primary"
          />
          <button onClick={() => send(input)} disabled={busy || !input.trim()}
            className="p-2.5 rounded-xl gradient-primary text-white disabled:opacity-40 hover:opacity-90 transition-opacity shadow-cg">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
