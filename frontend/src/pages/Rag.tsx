import { useState, useRef, useEffect } from 'react'
import { Send, BookOpen, Network, Cpu, Sparkles, ChevronRight, Trash2, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react'
import { ragApi, ragHttp } from '../lib/api'
import { useAppStore } from '../store'
import type { ChatMessage } from '../types'
import { StreamingMessage } from '../components/chat/StreamingMessage'

const RAG_URL = (import.meta.env.VITE_RAG_URL as string | undefined) ?? 'http://localhost:8004'

// Per-million-token costs (US$). Rough indicative values used for the estimate
// shown to the user — actual provider invoices are authoritative.
const COST_PER_MTOKEN: Record<string, number> = {
  groq:      0.59,   // llama-3.3-70b-versatile blended
  openai:    0.30,   // gpt-4o-mini blended
  anthropic: 1.20,   // claude-haiku-4-5 blended
  ollama:    0,      // local
}

function estimateCost(provider: string, tokens: number): string {
  const rate = COST_PER_MTOKEN[provider] ?? 0
  const dollars = (tokens / 1_000_000) * rate
  if (dollars < 0.0001) return '< $0.0001'
  return `$${dollars.toFixed(4)}`
}

const ragHistoryKey = (email?: string) => `cg_rag_history_${email ?? 'guest'}`

type ProviderStatus = 'active' | 'quota' | 'error' | 'unconfigured' | 'offline' | 'no_models' | 'loading'

interface ProviderInfo {
  id: string
  label: string
  sub: string
  model: string
  color: string
  status: ProviderStatus
}

const LLM_PROVIDERS_BASE: Omit<ProviderInfo, 'status'>[] = [
  { id: 'groq',      label: 'Groq',    sub: 'Llama 3.3 70B',          model: 'llama-3.3-70b-versatile', color: 'text-orange-500  bg-orange-500/10  border-orange-500/30'  },
  { id: 'openai',    label: 'OpenAI',  sub: 'GPT-4o mini',            model: 'gpt-4o-mini',             color: 'text-blue-500    bg-blue-500/10    border-blue-500/30'    },
  { id: 'anthropic', label: 'Claude',  sub: 'claude-haiku-4-5',       model: 'claude-haiku-4-5-20251001',color: 'text-violet-500  bg-violet-500/10  border-violet-500/30'  },
  { id: 'ollama',    label: 'Ollama',  sub: 'Local model',            model: '',                        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
]

function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  if (status === 'loading') return <span className="text-[9px] text-cg-faint">…</span>
  if (status === 'active')  return <span className="flex items-center gap-0.5 text-[9px] text-emerald-500 font-bold"><CheckCircle2 size={8} />Active</span>
  if (status === 'quota')   return <span className="flex items-center gap-0.5 text-[9px] text-amber-500 font-bold"><AlertCircle size={8} />Quota</span>
  if (status === 'no_models') return <span className="flex items-center gap-0.5 text-[9px] text-amber-500 font-bold"><Clock size={8} />No model</span>
  if (status === 'offline') return <span className="flex items-center gap-0.5 text-[9px] text-cg-faint font-bold"><AlertCircle size={8} />Offline</span>
  return null
}

const EXAMPLE_QUERIES = [
  'What entities are connected to Substation A?',
  'Summarize the anomalies in the energy grid',
  'Which sensors have the highest fault probability?',
  'Explain the relationship between SCADA-03 and Grid Zone 1',
]

function SourceChip({ title, chunk }: { title: string; chunk: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-cg-bg border border-cg-border rounded-lg text-xs">
      <BookOpen size={11} className="text-cg-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-cg-txt truncate">{title}</p>
        <p className="text-cg-faint truncate mt-0.5">{chunk}</p>
      </div>
    </div>
  )
}

/** Replace [N] / [N,M] / [N-M] markers with anchor-style spans the user can click */
function renderWithCitations(text: string, onCite: (idx: number) => void): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const re = /\[(\d+(?:\s*[-,]\s*\d+)*)\]/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const numbers = match[1].split(/[-,]/).map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n))
    parts.push(
      <span key={`cite-${key++}`}>
        {numbers.map((n, i) => (
          <button
            key={`${n}-${i}`}
            onClick={() => onCite(n)}
            className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 mx-0.5 rounded text-[10px] font-bold bg-cg-primary-s text-cg-primary border border-cg-primary/30 hover:bg-cg-primary hover:text-white transition-colors align-baseline"
            title={`Source ${n}`}
          >
            {n}
          </button>
        ))}
      </span>
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function MessageBubble({ msg, onCite }: { msg: ChatMessage; onCite: (idx: number) => void }) {
  const isUser = msg.role === 'user'
  const showSources = !isUser && msg.tools && msg.tools.length > 0
  const currentUser = useAppStore(s => s.currentUser)
  const initials = currentUser.name
    ? currentUser.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 mt-0.5 shadow-cg">
          <Sparkles size={14} className="text-white" />
        </div>
      )}

      <div className={`max-w-[72%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={[
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'gradient-primary text-white rounded-tr-sm'
            : 'bg-cg-surface border border-cg-border text-cg-txt rounded-tl-sm',
        ].join(' ')}>
          {msg.content.split('\n').map((line, i) => {
            if (!line) return <br key={i} />
            if (line.startsWith('**') && line.endsWith('**'))
              return <p key={i} className="font-semibold">{isUser ? line.replace(/\*\*/g, '') : renderWithCitations(line.replace(/\*\*/g, ''), onCite)}</p>
            if (line.startsWith('- '))
              return <p key={i} className="ml-3 flex items-start gap-1.5"><span className="text-cg-primary mt-1">•</span><span>{isUser ? line.slice(2) : renderWithCitations(line.slice(2), onCite)}</span></p>
            return <p key={i}>{isUser ? line : renderWithCitations(line, onCite)}</p>
          })}
        </div>

        {showSources && msg.sources && msg.sources.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-[10px] text-cg-faint font-medium uppercase tracking-wide px-1">Sources</p>
            {msg.sources.map((s, i) => (
              <div key={i} id={`${msg.id}-source-${i + 1}`} className="scroll-mt-32">
                <SourceChip {...s} />
              </div>
            ))}
          </div>
        )}

        <p className={`text-[10px] text-cg-faint px-1 flex gap-2 items-center ${isUser ? 'flex-row-reverse' : ''}`}>
          <span>{msg.timestamp}</span>
          {!isUser && msg.tokens != null && msg.tokens > 0 && (
            <span className="inline-flex items-center gap-1 text-cg-faint">
              <Zap size={9} /> {msg.tokens.toLocaleString()} tok
            </span>
          )}
        </p>
      </div>

      {isUser && (
        currentUser.avatar
          ? <img src={currentUser.avatar} alt="avatar" className="w-8 h-8 rounded-xl object-cover shrink-0 mt-0.5 border border-cg-border" />
          : <div className="w-8 h-8 rounded-xl bg-cg-s2 border border-cg-border flex items-center justify-center text-xs font-bold text-cg-txt shrink-0 mt-0.5">{initials}</div>
      )}
    </div>
  )
}

export default function Rag() {
  const currentUser = useAppStore(s => s.currentUser)
  const ragKey = ragHistoryKey(currentUser.email)

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const email = useAppStore.getState().currentUser.email
      const saved = localStorage.getItem(ragHistoryKey(email))
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [provider, setProvider] = useState('groq')
  const streamAbortRef = useRef<AbortController | null>(null)
  const [graphStats, setGraphStats] = useState<{ nodeCount: number; documentCount: number } | null>(null)
  const [providers, setProviders] = useState<ProviderInfo[]>(
    LLM_PROVIDERS_BASE.map(p => ({ ...p, status: 'loading' as ProviderStatus }))
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  // Persist messages to localStorage on every change (per-user key)
  useEffect(() => {
    localStorage.setItem(ragKey, JSON.stringify(messages))
  }, [messages, ragKey])

  useEffect(() => {
    import('../lib/api').then(({ graphApi }) => {
      graphApi.stats().then(({ data }) => setGraphStats(data)).catch(() => {})
    })
    // Load provider statuses
    ragHttp.get('/api/rag/providers').then(({ data }) => {
      const statusMap: Record<string, ProviderStatus> = {}
      for (const p of data.providers ?? []) statusMap[p.id] = p.status
      setProviders(LLM_PROVIDERS_BASE.map(p => ({ ...p, status: statusMap[p.id] ?? 'unconfigured' })))
    }).catch(() => {
      setProviders(LLM_PROVIDERS_BASE.map(p => ({ ...p, status: 'error' as ProviderStatus })))
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem(ragKey)
  }

  const stopGeneration = () => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), timestamp: ts }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)
    setStreamingContent('')

    const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))

    // Try streaming first; on any error, fall back to the existing sync endpoint
    let streamed = ''
    let streamingSources: { title: string; chunk: string }[] = []
    let streamingTokens = 0
    let streamSucceeded = false

    try {
      const ctrl = new AbortController()
      streamAbortRef.current = ctrl
      const token = localStorage.getItem('cg_token') ?? ''
      const resp = await fetch(`${RAG_URL}/api/rag/chat/stream`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: text.trim(),
          llm_provider: provider,
          history,
          use_graph_context: true,
        }),
      })
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`)

      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const raw of parts) {
          const eventName = raw.match(/^event:\s*(.+)$/m)?.[1] ?? 'message'
          const dataLine = raw.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('\n')
          if (!dataLine) continue
          let payload: Record<string, unknown> = {}
          try { payload = JSON.parse(dataLine) as Record<string, unknown> } catch { continue }

          if (eventName === 'token') {
            const delta = String(payload.delta ?? '')
            streamed += delta
            setStreamingContent(streamed)
          } else if (eventName === 'sources') {
            const arr = (payload.sources as Array<{ doc_id?: string; file_name?: string; text?: string }>) ?? []
            streamingSources = arr.map(s => ({
              title: s.file_name ?? s.doc_id ?? 'Document',
              chunk: s.text ? (s.text.slice(0, 100) + (s.text.length > 100 ? '…' : '')) : '',
            }))
          } else if (eventName === 'usage') {
            streamingTokens = Number(payload.tokens ?? 0)
          } else if (eventName === 'error') {
            throw new Error(String(payload.message ?? 'stream error'))
          } else if (eventName === 'done') {
            streamSucceeded = true
          }
        }
      }
    } catch (err: unknown) {
      const aborted = (err as { name?: string }).name === 'AbortError'
      if (aborted && streamed) {
        // User pressed Stop — keep what we have
        streamSucceeded = true
      } else if (aborted) {
        setThinking(false)
        setStreamingContent('')
        return
      }
      // else: fall through to sync fallback below
    } finally {
      streamAbortRef.current = null
    }

    if (streamSucceeded && streamed) {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: streamed,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        tools: ['qdrant_search', 'neo4j_query'],
        sources: streamingSources,
        tokens: streamingTokens,
      }])
      setStreamingContent('')
      setThinking(false)
      return
    }

    // Sync fallback (older /chat endpoint, identical to pre-streaming behaviour)
    try {
      const { data } = await ragApi.chat({ query: text.trim(), llm_provider: provider, history, use_graph_context: true })
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        tools: ['qdrant_search', 'neo4j_query'],
        sources: data.sources?.map((s: { doc_id?: string; file_name?: string; text?: string }) => ({
          title: s.file_name ?? s.doc_id ?? 'Document',
          chunk: s.text ? (s.text.slice(0, 100) + (s.text.length > 100 ? '…' : '')) : '',
        })),
        tokens: (data as { tokens_used?: number }).tokens_used,
      }])
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Backend not reachable. Make sure the GraphRAG service is running.'
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`, role: 'ai',
        content: `Sorry, I could not process your request.\n\n${errMsg}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        tools: [],
      }])
    } finally {
      setStreamingContent('')
      setThinking(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">

      {/* Left info panel */}
      <div className="hidden xl:flex w-64 shrink-0 flex-col gap-3">
        {/* Pipeline */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-cg-txt uppercase tracking-wide mb-3">RAG Pipeline</p>
          <div className="space-y-2">
            {[
              { icon: <BookOpen size={13} />, label: 'Semantic Search', desc: 'Qdrant vector store', color: 'text-indigo-400 bg-indigo-500/10' },
              { icon: <Network size={13} />, label: 'Graph Context', desc: 'Neo4j knowledge graph', color: 'text-emerald-400 bg-emerald-500/10' },
              { icon: <Cpu size={13} />, label: 'LLM Generation', desc: 'Multi-provider', color: 'text-violet-400 bg-violet-500/10' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${step.color}`}>
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-cg-txt">{step.label}</p>
                  <p className="text-[10px] text-cg-faint">{step.desc}</p>
                </div>
                {i < 2 && <ChevronRight size={10} className="text-cg-faint ml-auto shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-cg-txt uppercase tracking-wide mb-3">Index Status</p>
          <div className="space-y-2.5">
            {[
              { label: 'Indexed chunks',  value: graphStats ? String(graphStats.documentCount * 10) : '…' },
              { label: 'Embedding model', value: 'MiniLM-L6' },
              { label: 'Graph nodes',     value: graphStats ? String(graphStats.nodeCount) : '…' },
              { label: 'Avg latency',     value: '~180ms' },
            ].map(s => (
              <div key={s.label} className="flex justify-between text-xs">
                <span className="text-cg-muted">{s.label}</span>
                <span className="text-cg-txt font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model selector */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-cg-txt uppercase tracking-wide mb-2.5">LLM Provider</p>
          <div className="space-y-1.5">
            {providers.map(p => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                disabled={p.status !== 'active' && p.status !== 'loading'}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                  provider === p.id && p.status === 'active'
                    ? p.color
                    : p.status === 'active'
                      ? 'border-cg-border text-cg-muted hover:bg-cg-s2 hover:text-cg-txt'
                      : 'border-cg-border text-cg-faint opacity-50 cursor-not-allowed'
                }`}
              >
                <Cpu size={12} className={provider === p.id && p.status === 'active' ? '' : 'text-cg-faint'} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-none">{p.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{p.sub}</p>
                </div>
                <div className="ml-auto shrink-0">
                  {provider === p.id && p.status === 'active'
                    ? <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">Selected</span>
                    : <ProviderStatusBadge status={p.status} />
                  }
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-cg-border flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-cg">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-cg-txt">GraphRAG Chat</p>
            <p className="text-[10px] text-cg-faint">
              Semantic search + Knowledge graph · {providers.find(p => p.id === provider)?.label ?? 'Ollama'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-cg-muted
                  hover:text-red-500 hover:bg-red-500/10 transition-all"
                title="Clear chat history"
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ready
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-cg">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-cg-txt mb-1">GraphRAG Chat</h3>
                <p className="text-sm text-cg-muted max-w-sm">
                  Ask questions about your documents and knowledge graph.
                  I'll retrieve relevant context and generate grounded answers.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left px-3 py-2.5 bg-cg-s2 hover:bg-cg-primary-s hover:border-cg-primary/30 border border-cg-border rounded-xl text-xs text-cg-muted hover:text-cg-primary transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onCite={n => {
                // Scroll to the n-th source of the latest assistant message
                const last = [...messages].reverse().find(m => m.role === 'ai')
                if (!last) return
                const el = document.getElementById(`${last.id}-source-${n}`)
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                el?.classList.add('ring-2', 'ring-cg-primary')
                setTimeout(() => el?.classList.remove('ring-2', 'ring-cg-primary'), 1500)
              }}
            />
          ))}
          {thinking && (
            <StreamingMessage content={streamingContent} onStop={streamingContent ? stopGeneration : undefined} />
          )}
          {!thinking && messages.length > 0 && (() => {
            const last = messages[messages.length - 1]
            if (last.role !== 'ai' || !last.tokens) return null
            return (
              <p className="text-[10px] text-cg-faint text-center -mt-2">
                ~{estimateCost(provider, last.tokens)} · {last.tokens.toLocaleString()} tokens
              </p>
            )
          })()}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4 shrink-0">
          <div className="flex items-center gap-2 bg-cg-bg border border-cg-border rounded-xl px-4 py-3
            focus-within:border-cg-primary focus-within:ring-2 focus-within:ring-cg-primary/10 transition-all">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Ask about your knowledge graph…"
              className="flex-1 bg-transparent text-sm text-cg-txt placeholder:text-cg-faint focus:outline-none"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || thinking}
              className="w-8 h-8 rounded-lg gradient-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center transition-all"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
          <p className="text-[10px] text-cg-faint text-center mt-2">
            Answers are grounded in your indexed documents and knowledge graph
          </p>
        </div>
      </div>
    </div>
  )
}
