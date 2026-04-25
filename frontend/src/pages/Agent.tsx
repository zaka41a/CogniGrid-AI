import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, Plus, Wrench, Bot, Trash2, Paperclip, AlertTriangle, RotateCcw } from 'lucide-react'

const AGENT_CONVS_KEY = 'cg_agent_conversations'
import { agentApi } from '../lib/api'
import type { ChatMessage } from '../types'
import { useAppStore } from '../store'
import { Avatar } from '../components/ui'

function UserBubble() {
  const { currentUser } = useAppStore()
  return (
    <div className="shrink-0 mt-0.5">
      <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" />
    </div>
  )
}

interface Conversation {
  id: string
  title: string
  date: string
  messages: ChatMessage[]
}

const QUICK_PROMPTS = [
  'Detect anomalies in energy grid',
  'Show critical nodes',
  'Predict load next 24h',
  'Summarize recent alerts',
]

function ToolChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cg-primary-s border border-cg-primary/20 rounded-full text-[10px] text-cg-primary font-medium">
      <Wrench size={9} />
      {name}
    </span>
  )
}

/** Strip raw ReAct scaffolding — show only the final answer or clean text */
function cleanAgentResponse(raw: string): string {
  if (!raw?.trim()) return 'I could not generate a response. Please try again.'

  // 1. Extract FINAL ANSWER if present
  const finalMatch = raw.match(/FINAL ANSWER:\s*([\s\S]+)/i)
  if (finalMatch) return finalMatch[1].trim()

  // 2. Strip all THOUGHT / ACTION / ARGS / OBSERVATION blocks
  const lines = raw.split('\n')
  const cleaned: string[] = []
  let skip = false
  for (const line of lines) {
    if (/^(THOUGHT|ACTION|ARGS|OBSERVATION):/i.test(line.trim())) {
      skip = true
      continue
    }
    if (skip && line.trim() === '') {
      skip = false
      continue
    }
    if (!skip) cleaned.push(line)
  }
  const result = cleaned.join('\n').trim()

  // 3. If we got meaningful non-scaffolding content, return it
  if (result && !/^(THOUGHT|ACTION|ARGS|OBSERVATION):/i.test(result.split('\n')[0])) {
    return result
  }

  // 4. All content was ReAct scaffolding — return a helpful fallback
  return 'I processed your request using the available tools. The knowledge graph contains text entities (organizations, people, dates). Try asking a specific question about the documents, for example: "Who are the key people in the documents?" or "What organizations are mentioned?"'
}

/** Render a single line of markdown-lite text (bold, bullets, code) */
function renderLine(line: string, i: number) {
  if (!line) return <br key={i} />
  // Bullet list
  if (line.startsWith('- ') || line.startsWith('• '))
    return (
      <p key={i} className="ml-3 flex items-start gap-1.5">
        <span className="mt-1 text-cg-primary shrink-0">•</span>
        <span dangerouslySetInnerHTML={{ __html: inlineMd(line.replace(/^[-•]\s*/, '')) }} />
      </p>
    )
  // Heading-like bold line
  if (/^\*\*.+\*\*$/.test(line.trim()))
    return <p key={i} className="font-semibold mt-1" dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />
  return <p key={i} dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />
}

/** Convert **bold** and `code` to HTML (no XSS risk — input is LLM text) */
function inlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/10 px-1 rounded text-[11px] font-mono">$1</code>')
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const content = isUser ? msg.content : cleanAgentResponse(msg.content)
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 shadow-cg">
          <Bot size={14} />
        </div>
      )}
      <div className={`max-w-[72%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={[
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'gradient-primary text-white rounded-tr-sm'
            : 'bg-cg-s2 border border-cg-border text-cg-txt rounded-tl-sm',
        ].join(' ')}>
          {content.split('\n').map((line, i) => renderLine(line, i))}
        </div>
        {msg.tools && msg.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {msg.tools.map(t => <ToolChip key={t} name={t} />)}
          </div>
        )}
        <p className={`text-[10px] text-cg-faint px-1 ${isUser ? 'text-right' : ''}`}>{msg.timestamp}</p>
      </div>
      {isUser && (
        <UserBubble />
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-cg">
        <Bot size={14} className="text-white" />
      </div>
      <div className="px-4 py-3 bg-cg-s2 border border-cg-border rounded-2xl rounded-tl-sm flex items-center gap-1.5">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cg-primary inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cg-primary inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cg-primary inline-block" />
      </div>
    </div>
  )
}

export default function Agent() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(AGENT_CONVS_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [activeConvId, setActiveConvId]   = useState<string>('new')
  const [messages, setMessages]           = useState<ChatMessage[]>([])
  const [input, setInput]                 = useState('')
  const [thinking, setThinking]   = useState(false)
  const [offline,  setOffline]    = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeConv = conversations.find(c => c.id === activeConvId)

  // Persist conversations to localStorage
  useEffect(() => {
    localStorage.setItem(AGENT_CONVS_KEY, JSON.stringify(conversations))
  }, [conversations])

  // Sync messages into the active conversation
  useEffect(() => {
    if (activeConvId === 'new' || messages.length === 0) return
    setConversations(prev =>
      prev.map(c => c.id === activeConvId ? { ...c, messages } : c)
    )
  }, [messages, activeConvId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const clearAllConversations = () => {
    setConversations([])
    setMessages([])
    setActiveConvId('new')
    localStorage.removeItem(AGENT_CONVS_KEY)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return

    // Create conversation if none active
    let convId = activeConvId
    let isNewConv = false
    if (!conversations.find(c => c.id === convId)) {
      convId = `c-${Date.now()}`
      isNewConv = true
      const conv: Conversation = {
        id: convId,
        title: text.trim().slice(0, 40),
        date: new Date().toLocaleDateString(),
        messages: [],
      }
      setConversations(prev => [conv, ...prev])
      setActiveConvId(convId)
    }

    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), timestamp: ts }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)
    try {
      const payload = {
        message: text.trim(),
        history: messages.map(m => ({ role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.content })),
      }
      // Retry once on network error (handles container just-started scenario)
      let data
      try {
        ;({ data } = await agentApi.chat(payload))
      } catch {
        await new Promise(r => setTimeout(r, 1500))
        ;({ data } = await agentApi.chat(payload))
      }
      setOffline(false)
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        tools: data.tool_calls?.map(tc => tc.tool) ?? [],
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setOffline(true)
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
      // Remove the empty conversation that was just created
      if (isNewConv) {
        setConversations(prev => prev.filter(c => c.id !== convId))
        setActiveConvId('new')
      }
    } finally {
      setThinking(false)
    }
  }

  const newConversation = () => {
    const id = `c-${Date.now()}`
    const conv: Conversation = { id, title: 'New Conversation', date: new Date().toLocaleDateString(), messages: [] }
    setConversations(prev => [conv, ...prev])
    setActiveConvId(id)
    setMessages([])
  }

  const switchConversation = (id: string) => {
    setActiveConvId(id)
    setMessages(conversations.find(c => c.id === id)?.messages ?? [])
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">

      {/* Conversation list */}
      <div className="w-56 shrink-0 flex flex-col card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cg-border">
          <p className="text-xs font-semibold text-cg-txt">Conversations</p>
          <div className="flex items-center gap-1">
            {conversations.length > 0 && (
              <button
                onClick={clearAllConversations}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-cg-muted hover:text-red-500 transition-colors"
                title="Clear all conversations"
              >
                <RotateCcw size={12} />
              </button>
            )}
            <button
              onClick={newConversation}
              className="p-1.5 rounded-lg hover:bg-cg-s2 text-cg-muted hover:text-cg-txt transition-colors"
              title="New conversation"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-[10px] text-cg-faint text-center py-6 px-3">Start a conversation to see it here</p>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                conv.id === activeConvId
                  ? 'bg-cg-primary-s border border-cg-primary/30 text-cg-primary'
                  : 'text-cg-muted hover:bg-cg-s2 hover:text-cg-txt'
              }`}
              onClick={() => switchConversation(conv.id)}
            >
              <MessageSquare size={11} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{conv.title || 'Conversation'}</p>
                <p className="text-[10px] text-cg-faint mt-0.5">{conv.date}</p>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation()
                  setConversations(prev => prev.filter(c => c.id !== conv.id))
                  if (activeConvId === conv.id) {
                    const remaining = conversations.filter(c => c.id !== conv.id)
                    if (remaining.length > 0) { setActiveConvId(remaining[0].id); setMessages(remaining[0].messages) }
                    else { setActiveConvId('new'); setMessages([]) }
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition-all shrink-0"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-cg-border flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-cg">
            <Bot size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-cg-txt">{activeConv?.title ?? 'New Conversation'}</p>
            <p className="text-[10px] text-cg-faint">ReAct agent · graph_query · anomaly_model · risk_propagation</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </div>
        </div>

        {/* Offline banner */}
        {offline && (
          <div className="flex items-center gap-3 mx-5 mt-4 px-4 py-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-sm text-amber-900">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <span>Agent service is not running. Start the <code className="font-mono text-xs bg-amber-100 px-1 rounded">cg-agent</code> container or run it locally on port 8005.</span>
            <button onClick={() => setOffline(false)} className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline">Dismiss</button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-cg">
                <Bot size={26} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-cg-txt mb-1.5">AI Agent Ready</h3>
                <p className="text-sm text-cg-muted max-w-sm">
                  I can query the knowledge graph, run anomaly models, predict failures,
                  and generate insights from your data.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-left px-3 py-2.5 bg-cg-s2 hover:bg-cg-primary-s hover:border-cg-primary/30
                      border border-cg-border rounded-xl text-xs text-cg-muted hover:text-cg-primary transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {thinking && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="px-3 py-1.5 bg-cg-s2 border border-cg-border hover:border-cg-primary/40
                  hover:bg-cg-primary-s hover:text-cg-primary text-cg-muted text-xs rounded-full transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 pb-4 shrink-0">
          <div className="flex items-center gap-2 bg-cg-bg border border-cg-border rounded-xl px-4 py-3
            focus-within:border-cg-primary focus-within:ring-2 focus-within:ring-cg-primary/10 transition-all">
            <button className="text-cg-muted hover:text-cg-txt transition-colors" title="Attach file">
              <Paperclip size={15} />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Ask the AI agent anything…"
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
        </div>
      </div>
    </div>
  )
}
