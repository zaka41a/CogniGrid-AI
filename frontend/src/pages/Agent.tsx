import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, MessageSquare, Plus, Wrench } from 'lucide-react'
import { mockConversations } from '../mock'
import type { ChatMessage } from '../types'

const QUICK_PROMPTS = ['Detect anomalies', 'Show critical nodes', 'Predict next 24h']

function ToolChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cg-s2 border border-cg-border rounded-full text-[10px] text-cg-muted">
      <Wrench size={9} />
      {name}
    </span>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-1">
          AI
        </div>
      )}
      <div className={`max-w-[70%] space-y-1.5`}>
        <div className={`
          px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
            : 'bg-cg-s2 border border-green-500/20 text-cg-txt rounded-tl-sm'
          }
        `}>
          {msg.content.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) {
              return <p key={i} className="font-bold text-cg-txt">{line.replace(/\*\*/g, '')}</p>
            }
            if (line.startsWith('- ')) {
              return <p key={i} className="ml-3">• {line.slice(2)}</p>
            }
            return line ? <p key={i}>{line}</p> : <br key={i} />
          })}
        </div>
        {msg.tools && msg.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {msg.tools.map((t) => <ToolChip key={t} name={t} />)}
          </div>
        )}
        <p className={`text-[10px] text-cg-faint px-1 ${isUser ? 'text-right' : ''}`}>{msg.timestamp}</p>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-cg-border flex items-center justify-center text-xs font-bold text-cg-txt flex-shrink-0 mt-1">
          AM
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-1">AI</div>
      <div className="px-4 py-3 bg-cg-s2 border border-green-500/20 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
      </div>
    </div>
  )
}

export default function Agent() {
  const [activeConvId, setActiveConvId] = useState('c1')
  const [messages, setMessages] = useState<ChatMessage[]>(mockConversations[0].messages)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeConv = mockConversations.find((c) => c.id === activeConvId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const sendMessage = (text: string) => {
    if (!text.trim() || thinking) return
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: `Analyzing your query: "${text.trim()}"\n\nI've processed the request against the current knowledge graph and AI models. The data shows nominal patterns with 2 points of interest flagged for review. Would you like me to run a deeper analysis or generate a report?`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        tools: ['graph_query', 'anomaly_model'],
      }
      setMessages((prev) => [...prev, aiMsg])
      setThinking(false)
    }, 1800)
  }

  const switchConversation = (id: string) => {
    setActiveConvId(id)
    const conv = mockConversations.find((c) => c.id === id)
    setMessages(conv?.messages ?? [])
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation list sidebar */}
      <div className="w-56 flex-shrink-0 flex flex-col bg-cg-surface border border-cg-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cg-border">
          <p className="text-xs font-semibold text-cg-txt">Conversations</p>
          <button className="p-1 rounded hover:bg-cg-s2 text-cg-muted hover:text-cg-txt transition-colors">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {mockConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => switchConversation(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                conv.id === activeConvId
                  ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                  : 'text-cg-muted hover:bg-cg-s2 hover:text-cg-muted'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare size={12} className="flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{conv.title}</p>
                  <p className="text-[10px] text-cg-faint mt-0.5">{conv.date}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-cg-surface border border-cg-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-cg-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-sm shadow-green-400/50" />
          <p className="text-sm font-semibold text-cg-txt">{activeConv?.title ?? 'New Conversation'}</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto">
                  <MessageSquare size={20} className="text-blue-400" />
                </div>
                <p className="text-sm text-cg-muted">Start a conversation with the AI agent</p>
              </div>
            </div>
          )}
          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          {thinking && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="px-3 py-1.5 bg-cg-s2 border border-cg-border hover:border-blue-500/50 text-cg-muted text-xs rounded-full transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-cg-bg border border-cg-border rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
            <button className="text-cg-muted hover:text-cg-muted transition-colors">
              <Paperclip size={16} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Ask the AI agent anything..."
              className="flex-1 bg-transparent text-sm text-cg-txt placeholder-gray-500 focus:outline-none"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || thinking}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
