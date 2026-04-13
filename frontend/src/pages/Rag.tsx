import { useState, useRef, useEffect } from 'react'
import { Send, BookOpen, Network, Cpu, Sparkles, ChevronRight } from 'lucide-react'
import { ragApi } from '../lib/api'
import type { ChatMessage } from '../types'

const LLM_PROVIDERS = [
  { id: 'ollama',    label: 'Ollama',   sub: 'Local',         color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'openai',   label: 'OpenAI',   sub: 'GPT-4o',        color: 'text-blue-500    bg-blue-500/10    border-blue-500/30'    },
  { id: 'anthropic', label: 'Claude',  sub: 'Anthropic',     color: 'text-violet-500  bg-violet-500/10  border-violet-500/30'  },
]

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

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const showSources = !isUser && msg.tools && msg.tools.length > 0

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
              return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>
            if (line.startsWith('- '))
              return <p key={i} className="ml-3 flex items-start gap-1.5"><span className="text-cg-primary mt-1">•</span>{line.slice(2)}</p>
            return <p key={i}>{line}</p>
          })}
        </div>

        {showSources && msg.sources && msg.sources.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-[10px] text-cg-faint font-medium uppercase tracking-wide px-1">Sources</p>
            {msg.sources.map((s, i) => <SourceChip key={i} {...s} />)}
          </div>
        )}

        <p className={`text-[10px] text-cg-faint px-1 ${isUser ? 'text-right' : ''}`}>{msg.timestamp}</p>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-cg-s2 border border-cg-border flex items-center justify-center text-xs font-bold text-cg-txt shrink-0 mt-0.5">
          A
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-cg">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="px-4 py-3 bg-cg-surface border border-cg-border rounded-2xl rounded-tl-sm flex items-center gap-1.5">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cg-primary inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cg-primary inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cg-primary inline-block" />
      </div>
    </div>
  )
}

export default function Rag() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [provider, setProvider] = useState('ollama')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), timestamp: ts }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)
    try {
      const { data } = await ragApi.chat({ question: text.trim(), provider })
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        tools: ['qdrant_search', 'neo4j_query'],
        sources: data.sources?.map(s => ({
          title: s.documentId ?? 'Document',
          chunk: s.text ? (s.text.slice(0, 100) + (s.text.length > 100 ? '…' : '')) : '',
        })),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Backend not reachable. Make sure the GraphRAG service is running.'
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: `Sorry, I could not process your request.\n\n${errMsg}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        tools: [],
      }
      setMessages(prev => [...prev, aiMsg])
    } finally {
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
              { label: 'Indexed chunks', value: '48,291' },
              { label: 'Embedding model', value: 'MiniLM-L6' },
              { label: 'Graph nodes', value: '24,812' },
              { label: 'Avg latency', value: '~180ms' },
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
            {LLM_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                  provider === p.id
                    ? p.color
                    : 'border-cg-border text-cg-muted hover:bg-cg-s2 hover:text-cg-txt'
                }`}
              >
                <Cpu size={12} className={provider === p.id ? '' : 'text-cg-faint'} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-none">{p.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{p.sub}</p>
                </div>
                {provider === p.id && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide opacity-80">Active</span>
                )}
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
              Semantic search + Knowledge graph · {LLM_PROVIDERS.find(p => p.id === provider)?.label ?? 'Ollama'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ready
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
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {thinking && <TypingIndicator />}
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
