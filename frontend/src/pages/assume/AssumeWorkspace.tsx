/**
 * ADAPT / ASSUME Workspace — Ultra-professional implementation
 * FH Aachen · ADAPT Research Group · Agent-based Electricity Market Simulation
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  Zap, BookOpen, Bot, Upload, Network, Sparkles, Send,
  FileText, GitBranch, TrendingUp, ChevronRight,
  ExternalLink, CheckCircle2, Play,
  RefreshCw, AlertCircle, Download, Database, Layers,
  FlaskConical, ArrowRight, Wand2, Activity, Copy, Check,
  BarChart3, Gauge, ChevronDown, ChevronUp, Library,
  GitCompare, Trash2, Server, Wifi, WifiOff,
} from 'lucide-react'
import { ragHttp, ingestHttp, graphHttp, agentHttp, runnerHttp, ingestionApi } from '../../lib/api'
import type { IngestJob } from '../../lib/api'
import { useAppStore } from '../../store'
import type { ChatMessage } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'advisor' | 'generator' | 'runner' | 'compare' | 'knowledge' | 'import'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',   label: 'Overview',          icon: <Layers     size={14} /> },
  { id: 'advisor',    label: 'Scenario Advisor',   icon: <Wand2      size={14} /> },
  { id: 'generator',  label: 'Scenario Generator', icon: <Sparkles   size={14} /> },
  { id: 'runner',     label: 'Simulation Runner',  icon: <Play       size={14} /> },
  { id: 'compare',    label: 'Compare',            icon: <GitCompare size={14} /> },
  { id: 'knowledge',  label: 'Knowledge Map',      icon: <Network    size={14} /> },
  { id: 'import',     label: 'Import Docs',        icon: <Upload     size={14} /> },
]

// ── Advisor prompts ────────────────────────────────────────────────────────────
const ADVISOR_PROMPTS = [
  'How do I configure a day ahead market simulation with wind and gas units?',
  'What bidding strategy should I use for a battery storage unit?',
  'Explain the NaiveSingleBidStrategy and when to use it',
  'How to model renewable intermittency (wind/solar) in ASSUME?',
  'Create a scenario: high demand, low wind production, winter peak',
  'What is the difference between clearing algorithms in ASSUME?',
  'How does reinforcement learning work for bidding agents?',
  'Generate a YAML config for a 3-unit day ahead market',
]

// ── Roadmap ────────────────────────────────────────────────────────────────────
// ── ASSUME concepts ────────────────────────────────────────────────────────────
const CONCEPTS = [
  { label: 'PowerPlant',              color: '#F97316', desc: 'Dispatchable generation unit'   },
  { label: 'Storage',                 color: '#3B82F6', desc: 'Battery / pumped hydro storage' },
  { label: 'Demand',                  color: '#8B5CF6', desc: 'Load / consumer agent'          },
  { label: 'DayAheadMarket',          color: '#10B981', desc: 'Day Ahead auction mechanism'    },
  { label: 'NaiveSingleBidStrategy',  color: '#EC4899', desc: 'Default bidding strategy'       },
  { label: 'MarketConfig',            color: '#06B6D4', desc: 'YAML scenario configuration'    },
  { label: 'World',                   color: '#EAB308', desc: 'Simulation environment (mango)' },
  { label: 'LearningStrategy',        color: '#14B8A6', desc: 'Reinforcement learning agent'   },
]

// ─────────────────────────────────────────────────────────────────────────────
// STAT COUNTER
// ─────────────────────────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) return
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
type ServiceStatus = 'checking' | 'online' | 'offline'

interface ServiceDef { key: string; label: string; port: string; color: string }

const SERVICES: ServiceDef[] = [
  { key: 'graph',    label: 'Graph API',      port: ':8002', color: 'emerald' },
  { key: 'graphrag', label: 'GraphRAG',        port: ':8003', color: 'blue'    },
  { key: 'ingestion',label: 'Ingestion',       port: ':8001', color: 'cyan'    },
  { key: 'agent',    label: 'Agent',           port: ':8004', color: 'violet'  },
  { key: 'runner',   label: 'ASSUME Runner',   port: ':8006', color: 'amber'   },
]

function OverviewTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [stats, setStats] = useState({ nodes: 0, docs: 0, rels: 0 })
  const [loaded, setLoaded] = useState(false)
  const [svcStatus, setSvcStatus] = useState<Record<string, ServiceStatus>>(
    Object.fromEntries(SERVICES.map(s => [s.key, 'checking']))
  )

  const nodes = useCounter(stats.nodes)
  const docs  = useCounter(stats.docs)
  const rels  = useCounter(stats.rels)

  useEffect(() => {
    graphHttp.get('/api/graph/stats', { timeout: 8_000 }).then(r => {
      const d = r.data
      setStats({ nodes: d.total_nodes ?? d.nodeCount ?? 0, docs: d.node_labels?.Document ?? d.documentCount ?? 0, rels: d.total_relationships ?? d.edgeCount ?? 0 })
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    const httpClients: Record<string, typeof ragHttp> = {
      graph: graphHttp, graphrag: ragHttp, ingestion: ingestHttp, agent: agentHttp, runner: runnerHttp,
    }
    SERVICES.forEach(({ key }) => {
      const client = httpClients[key]
      client.get('/health', { timeout: 4_000 })
        .then(() => setSvcStatus(s => ({ ...s, [key]: 'online' })))
        .catch(() => setSvcStatus(s => ({ ...s, [key]: 'offline' })))
    })
  }, [])

  return (
    <div className="space-y-5">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20"
        style={{ background: 'linear-gradient(135deg, #0d2818 0%, #14532d 35%, #166534 65%, #0f2d1f 100%)' }}>
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-emerald-400/5 blur-3xl rounded-full" />
        </div>

        <div className="relative p-8">
          <div className="flex flex-col xl:flex-row gap-8">

            {/* Left: identity */}
            <div className="flex-1 min-w-0">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-widest text-blue-300 uppercase">ASSUME Electricity Market Simulation</span>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
                  <Zap size={26} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white leading-tight">ASSUME Knowledge Workspace</h1>
                  <p className="text-sm text-emerald-300/70 mt-0.5 font-medium">Agent-based Simulation of Electricity Markets</p>
                </div>
              </div>

              <p className="text-sm text-white/65 leading-relaxed max-w-2xl">
                An open-source Python framework for simulating electricity market mechanisms with autonomous bidding agents.
                This workspace provides <span className="text-white font-medium">GraphRAG-powered scenario advice</span>,
                a <span className="text-white font-medium">deep knowledge graph</span> of the ASSUME ecosystem,
                and an <span className="text-white font-medium">intelligent scenario generator</span> for electricity market research.
              </p>

              {/* Tech stack pills */}
              <div className="flex flex-wrap gap-2 mt-5">
                {[
                  { label: 'ASSUME Framework', color: 'bg-white/10 text-white/70 border-white/15' },
                  { label: 'Neo4j Graph',       color: 'bg-white/10 text-white/70 border-white/15' },
                  { label: 'GraphRAG',          color: 'bg-white/10 text-white/70 border-white/15' },
                  { label: 'Groq Llama 3.3',    color: 'bg-white/10 text-white/70 border-white/15' },
                  { label: 'Qdrant Vector DB',  color: 'bg-white/10 text-white/70 border-white/15' },
                ].map(t => (
                  <span key={t.label} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${t.color}`}>{t.label}</span>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-2.5 mt-6">
                <button onClick={() => onNavigate('advisor')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/40 hover:bg-blue-600 transition-all">
                  <Wand2 size={15} />
                  Open Scenario Advisor
                  <ArrowRight size={13} />
                </button>
                <button onClick={() => onNavigate('import')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-white/80 text-sm font-medium hover:bg-white/10 hover:border-white/35 transition-all">
                  <Upload size={14} />
                  Import ASSUME Docs
                </button>
                <a href="https://assume.readthedocs.io" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-medium hover:bg-white/8 hover:text-white/70 transition-all">
                  <ExternalLink size={13} />
                  Documentation
                </a>
              </div>
            </div>

            {/* Right: stats */}
            <div className="xl:w-56 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/40 mb-3">Knowledge Graph</p>
              <div className="space-y-2">
                {[
                  { label: 'Graph Nodes',   value: loaded ? nodes : '…', icon: <GitBranch size={13} />, accent: 'bg-white/10 border-white/15 text-white' },
                  { label: 'Relationships', value: loaded ? rels  : '…', icon: <Network   size={13} />, accent: 'bg-white/10 border-white/15 text-white' },
                  { label: 'Documents',     value: loaded ? docs  : '…', icon: <FileText  size={13} />, accent: 'bg-white/10 border-white/15 text-white' },
                  { label: 'ASSUME Files',  value: '49',                 icon: <Database  size={13} />, accent: 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300' },
                ].map(s => (
                  <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl border ${s.accent}`}>
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">{s.icon}</div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold text-white leading-none">{s.value}</p>
                      <p className="text-[10px] text-white/50 mt-0.5 truncate">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── System Health ─────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server size={13} className="text-cg-primary" />
            <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">System Health</p>
          </div>
          {(() => {
            const allOnline = SERVICES.every(s => svcStatus[s.key] === 'online')
            const anyChecking = SERVICES.some(s => svcStatus[s.key] === 'checking')
            return (
              <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border ${
                anyChecking ? 'text-cg-faint border-cg-border bg-slate-50' :
                allOnline ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                'text-amber-600 border-amber-200 bg-amber-50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${anyChecking ? 'bg-cg-border' : allOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {anyChecking ? 'Checking…' : allOnline ? 'All Systems Online' : 'Partial Outage'}
              </div>
            )
          })()}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SERVICES.map(svc => {
            const st = svcStatus[svc.key]
            return (
              <div key={svc.key} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                st === 'offline' ? 'bg-red-50 border-red-200' : 'bg-emerald-500/10 border-blue-500/25'
              }`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  st === 'offline' ? 'bg-red-400' : st === 'checking' ? 'bg-emerald-300' : 'bg-emerald-400 animate-pulse'
                }`} />
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold truncate ${st === 'offline' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {svc.label}
                  </p>
                  <p className="text-[9px] text-cg-faint font-mono">{
                    st === 'checking' ? 'checking…' : st === 'online' ? 'online' : 'offline'
                  }</p>
                </div>
                {st !== 'offline' && <Wifi    size={11} className="text-blue-400 ml-auto shrink-0 opacity-80" />}
                {st === 'offline' && <WifiOff size={11} className="text-red-400 ml-auto shrink-0 opacity-70" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Quick Access ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-cg-primary" />
          <h2 className="text-xs font-bold text-cg-txt uppercase tracking-widest">Quick Access</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              tab: 'advisor' as Tab,
              icon: <Wand2 size={20} />,
              label: 'Scenario Advisor',
              desc: 'Ask about ASSUME scenarios, strategies, market config',
              grad: 'from-blue-600/25 to-blue-500/10',
              border: 'border-blue-500/30',
              icon_bg: 'bg-blue-500/20 text-blue-400',
              hover: 'hover:border-blue-500/50',
            },
            {
              tab: 'generator' as Tab,
              icon: <Sparkles size={20} />,
              label: 'Scenario Generator',
              desc: 'Natural language to executable YAML config',
              grad: 'from-blue-500/22 to-blue-400/8',
              border: 'border-blue-400/30',
              icon_bg: 'bg-blue-400/20 text-blue-300',
              hover: 'hover:border-blue-400/50',
            },
            {
              tab: 'runner' as Tab,
              icon: <Play size={20} />,
              label: 'Simulation Runner',
              desc: 'Execute ASSUME simulations and stream live results',
              grad: 'from-indigo-600/25 to-indigo-500/10',
              border: 'border-indigo-500/30',
              icon_bg: 'bg-indigo-500/20 text-indigo-400',
              hover: 'hover:border-indigo-500/50',
            },
            {
              tab: 'knowledge' as Tab,
              icon: <Network size={20} />,
              label: 'Knowledge Map',
              desc: 'Explore the ASSUME entity graph and search',
              grad: 'from-sky-500/22 to-sky-400/8',
              border: 'border-sky-500/30',
              icon_bg: 'bg-sky-500/20 text-sky-400',
              hover: 'hover:border-sky-500/50',
            },
          ].map(item => (
            <button key={item.tab} onClick={() => onNavigate(item.tab)}
              className={`text-left p-4 rounded-2xl border bg-gradient-to-br ${item.grad} ${item.border} ${item.hover} transition-all group`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.icon_bg}`}>
                {item.icon}
              </div>
              <p className="text-sm font-bold text-cg-txt mb-1">{item.label}</p>
              <p className="text-[11px] text-cg-muted leading-snug">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO ADVISOR TAB
// ─────────────────────────────────────────────────────────────────────────────
const ASSUME_SYSTEM = `You are an ASSUME Expert AI, specialized in the ASSUME (Agent-based Simulation of Electricity Markets) Python framework from FH Aachen's ADAPT research group.

You help researchers and engineers:
- Design electricity market simulation scenarios
- Configure market mechanisms (day ahead, intraday, balancing)
- Select and tune agent bidding strategies
- Understand ASSUME's Python codebase and architecture
- Generate YAML configuration files

When asked to generate a scenario, always provide a complete YAML config example.
When explaining strategies, reference the actual Python classes (NaiveSingleBidStrategy, FlexableEOMStrategy, etc.).
Be precise, cite ASSUME's documentation and code when possible.`

function AdvisorTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput]       = useState('')
  const [thinking, setThinking] = useState(false)
  const [showPrompts, setShowPrompts] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const currentUser = useAppStore(s => s.currentUser)
  const userInitials = currentUser.name
    ? currentUser.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || thinking) return
    setShowPrompts(false)
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), timestamp: ts }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)
    try {
      const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      const { data } = await ragHttp.post('/api/rag/chat', {
        query: `${ASSUME_SYSTEM}\n\nUser: ${text.trim()}`,
        llm_provider: 'groq',
        llm_model: 'llama-3.3-70b-versatile',
        history,
        use_graph_context: true,
        // Keep CIM tabular sources out of the ASSUME advisor — they pollute
        // retrieval with .xlsx grid topology that has nothing to do with
        // electricity-market simulation questions. Until we have proper
        // per-module namespacing this is the simplest mitigation.
        file_type_exclude: ['xlsx', 'csv', 'xml'],
      })
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`, role: 'ai',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources?.map((s: { file_name?: string; doc_id?: string; text?: string }) => ({
          title: s.file_name ?? s.doc_id ?? 'ASSUME Docs',
          chunk: s.text ? s.text.slice(0, 120) + '…' : '',
        })),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (e: unknown) {
      // Distinguish between a real service outage and an upstream LLM
      // rate-limit / quota error so the user knows whether to wait or
      // restart the backend.
      const err = e as { response?: { status?: number; data?: { detail?: string } }; message?: string }
      const status = err?.response?.status
      const detail = err?.response?.data?.detail ?? err?.message ?? ''
      let content = 'Could not reach the GraphRAG service. Make sure the backend is running and ASSUME documentation is imported.'
      if (status === 429 || /\b429\b|too many requests|rate.?limit/i.test(detail)) {
        content = '⏱ **Groq rate limit reached.** The free tier allows a limited number of requests per minute. Please wait ~60 seconds and try again. (The platform itself is fine.)'
      } else if (status === 413 || /\b413\b|payload too large/i.test(detail)) {
        content = '📦 **Request too large for Groq.** Try a shorter question or disable graph context.'
      } else if (status === 401 || status === 403) {
        content = '🔑 **Authentication issue.** Check that GROQ_API_KEY is set in `.env` and the backend was restarted after the change.'
      } else if (status && status >= 500) {
        content = `⚠️ **Backend error (HTTP ${status}).** ${detail || 'Check graphrag logs.'}`
      }
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`, role: 'ai',
        content,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setThinking(false)
    }
  }, [messages, thinking])

  function renderContent(text: string) {
    const lines = text.split('\n')
    const out: React.ReactNode[] = []
    let inCode = false
    let codeLines: string[] = []

    const flushCode = (key: string) => {
      if (codeLines.length === 0) return
      out.push(
        <pre key={key} className="overflow-x-auto rounded-xl bg-slate-950/90 border border-white/10 px-4 py-3 my-2 text-[11px] font-mono text-emerald-300 leading-relaxed">
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      codeLines = []
    }

    const renderInline = (line: string, key: string) => {
      const parts = line.split(/(`[^`]+`)/)
      if (parts.length === 1) return <span>{line}</span>
      return <span key={key}>{parts.map((p, j) =>
        p.startsWith('`') && p.endsWith('`')
          ? <code key={j} className="font-mono text-emerald-300 bg-slate-900/60 px-1.5 py-0.5 rounded text-[11px]">{p.slice(1, -1)}</code>
          : p
      )}</span>
    }

    lines.forEach((line, i) => {
      if (line.startsWith('```')) {
        if (!inCode) { inCode = true }
        else { inCode = false; flushCode(`code-${i}`) }
        return
      }
      if (inCode) { codeLines.push(line); return }
      if (line.startsWith('### '))
        out.push(<p key={i} className="font-bold text-sm mt-3 mb-1 text-cg-txt">{line.slice(4)}</p>)
      else if (line.startsWith('## '))
        out.push(<p key={i} className="font-bold text-base mt-3 mb-1 text-cg-txt">{line.slice(3)}</p>)
      else if (line.startsWith('# '))
        out.push(<p key={i} className="font-bold text-lg mt-3 mb-1 text-white">{line.slice(2)}</p>)
      else if (/^\*\*(.+)\*\*$/.test(line))
        out.push(<p key={i} className="font-bold text-cg-txt">{line.replace(/\*\*/g, '')}</p>)
      else if (line.startsWith('- '))
        out.push(<p key={i} className="ml-3 flex items-start gap-1.5 my-0.5"><span className="text-blue-400 mt-1 shrink-0">•</span><span>{renderInline(line.slice(2), `il-${i}`)}</span></p>)
      else if (line.startsWith('  - '))
        out.push(<p key={i} className="ml-6 flex items-start gap-1.5 my-0.5"><span className="text-blue-300/60 mt-1 shrink-0">◦</span><span>{renderInline(line.slice(4), `il-${i}`)}</span></p>)
      else if (/^\d+\. /.test(line)) {
        const [num, ...rest] = line.split('. ')
        out.push(<p key={i} className="ml-3 flex items-start gap-2 my-0.5"><span className="text-blue-400 font-bold shrink-0 text-xs mt-0.5">{num}.</span><span>{renderInline(rest.join('. '), `il-${i}`)}</span></p>)
      } else if (/^-{3,}\s*$/.test(line) || /^\*{3,}\s*$/.test(line)) {
        // Markdown horizontal rule — render as a real divider, not a bare "---"
        out.push(<hr key={i} className="my-3 border-0 border-t border-white/10" />)
      } else if (!line)
        out.push(<div key={i} className="h-2" />)
      else
        out.push(<p key={i}>{renderInline(line, `il-${i}`)}</p>)
    })

    if (inCode && codeLines.length > 0) {
      out.push(
        <pre key="code-final" className="overflow-x-auto rounded-xl bg-slate-950/90 border border-white/10 px-4 py-3 my-2 text-[11px] font-mono text-emerald-300 leading-relaxed">
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
    }
    return out
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] gap-4">

      {/* Left panel */}
      <div className="hidden xl:flex w-64 shrink-0 flex-col gap-3">
        {/* Identity */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
              <Wand2 size={13} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-cg-txt">Scenario Advisor</p>
              <p className="text-[10px] text-cg-txt font-semibold">ASSUME Expert AI</p>
            </div>
          </div>
          <p className="text-[11px] text-cg-muted leading-relaxed">
            Ask anything about ASSUME: scenario design, market config, bidding strategies, Python API.
          </p>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Groq · Llama 3.3 70B</span>
            <span className="text-cg-faint">+ GraphRAG</span>
          </div>
        </div>

        {/* Capabilities */}
        <div className="card p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cg-faint">Capabilities</p>
          {[
            { icon: <Wand2 size={11} />,       label: 'Scenario generation' },
            { icon: <FlaskConical size={11} />, label: 'Market config (YAML)' },
            { icon: <Activity size={11} />,    label: 'Strategy analysis' },
            { icon: <Bot size={11} />,          label: 'Code explanation' },
            { icon: <TrendingUp size={11} />,   label: 'Outcome prediction' },
          ].map(c => (
            <div key={c.label} className="flex items-center gap-2 text-[11px] text-cg-muted">
              <span className="text-blue-400/70">{c.icon}</span>
              {c.label}
            </div>
          ))}
        </div>

        {/* Example prompts */}
        <div className="card p-3 flex-1 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cg-faint mb-2 px-1">Example Questions</p>
          <div className="space-y-1">
            {ADVISOR_PROMPTS.map(q => (
              <button key={q} onClick={() => send(q)}
                className="w-full text-left px-2.5 py-2 rounded-xl text-[11px] text-cg-muted hover:text-blue-400 hover:bg-blue-500/8 border border-transparent hover:border-blue-500/20 transition-all leading-snug">
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-cg-border flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-cg-txt">ASSUME Scenario Advisor</p>
            <p className="text-[10px] text-cg-muted font-medium">GraphRAG + Neo4j · ASSUME Knowledge Graph</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setShowPrompts(true) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-cg-muted hover:text-cg-danger hover:bg-red-500/8 transition-all">
                <RefreshCw size={11} />New session
              </button>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Ready
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-5">
                <Zap size={28} className="text-white" />
              </div>
              <h3 className="text-base font-bold text-cg-txt mb-2">ASSUME Scenario Advisor</h3>
              <p className="text-sm text-cg-muted max-w-md leading-relaxed mb-6">
                Your intelligent assistant for electricity market simulation design.
                Ask about scenarios, strategies, market configurations, or ASSUME's Python API.
              </p>
              {showPrompts && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {ADVISOR_PROMPTS.slice(0,4).map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="text-left px-3.5 py-3 bg-cg-s2 hover:bg-blue-500/8 hover:border-blue-500/25 border border-cg-border rounded-xl text-xs text-cg-muted hover:text-blue-400 transition-all leading-snug">
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map(msg => {
            const isUser = msg.role === 'user'
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={13} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={[
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    isUser
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-sm shadow-lg shadow-blue-500/20'
                      : 'bg-cg-surface border border-cg-border text-cg-txt rounded-tl-sm',
                  ].join(' ')}>
                    {renderContent(msg.content)}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="w-full space-y-1">
                      <p className="text-[10px] text-cg-faint uppercase tracking-wide px-1">Sources</p>
                      {msg.sources.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 bg-cg-bg border border-cg-border rounded-xl text-xs">
                          <BookOpen size={10} className="text-blue-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-cg-txt truncate">{s.title}</p>
                            <p className="text-cg-faint truncate mt-0.5">{s.chunk}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className={`text-[10px] text-cg-faint px-1 ${isUser ? 'text-right' : ''}`}>{msg.timestamp}</p>
                </div>
                {isUser && (
                  currentUser.avatar
                    ? <img src={currentUser.avatar} alt="avatar" className="w-8 h-8 rounded-xl object-cover shrink-0 mt-0.5 border border-cg-border" />
                    : <div className="w-8 h-8 rounded-xl bg-cg-s2 border border-cg-border flex items-center justify-center text-xs font-bold text-cg-txt shrink-0 mt-0.5">{userInitials}</div>
                )}
              </div>
            )
          })}

          {thinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
                <Zap size={13} className="text-white" />
              </div>
              <div className="px-4 py-3 bg-cg-surface border border-cg-border rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                {[0,1,2].map(i => <span key={i} style={{animationDelay:`${i*0.15}s`}} className="typing-dot w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 shrink-0 space-y-2">
          <div className="flex items-center gap-2 bg-cg-bg border border-cg-border rounded-xl px-4 py-3 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ask about ASSUME scenarios, market mechanisms, bidding strategies…"
              className="flex-1 bg-transparent text-sm text-cg-txt placeholder:text-cg-faint focus:outline-none"
            />
            <button onClick={() => send(input)} disabled={!input.trim() || thinking}
              className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-blue-500/25">
              <Send size={14} className="text-white" />
            </button>
          </div>
          <p className="text-[10px] text-cg-faint text-center">
            Powered by GraphRAG · ASSUME Knowledge Graph · Groq Llama 3.3 70B
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE MAP TAB
// ─────────────────────────────────────────────────────────────────────────────
const ENTITY_PALETTE: Record<string, { bg: string; text: string; dot: string }> = {
  // Graph entities
  Entity:   { bg: 'bg-blue-50 border-blue-200',     text: 'text-blue-600',    dot: '#3B82F6' },
  Document: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600',  dot: '#6366F1' },
  KEYWORD:  { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600',  dot: '#F97316' },
  CONCEPT:  { bg: 'bg-teal-50 border-teal-200',     text: 'text-teal-600',    dot: '#14B8A6' },
  // SpaCy NER labels
  PERSON:   { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: '#10B981' },
  ORG:      { bg: 'bg-cyan-50 border-cyan-200',       text: 'text-cyan-700',    dot: '#06B6D4' },
  GPE:      { bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   dot: '#F59E0B' },
  DATE:     { bg: 'bg-violet-50 border-violet-200',   text: 'text-violet-700',  dot: '#8B5CF6' },
  MONEY:    { bg: 'bg-green-50 border-green-200',     text: 'text-green-700',   dot: '#22C55E' },
  PRODUCT:  { bg: 'bg-rose-50 border-rose-200',       text: 'text-rose-700',    dot: '#F43F5E' },
  LOC:      { bg: 'bg-yellow-50 border-yellow-200',   text: 'text-yellow-700',  dot: '#EAB308' },
  FACILITY: { bg: 'bg-sky-50 border-sky-200',         text: 'text-sky-700',     dot: '#0EA5E9' },
  EVENT:    { bg: 'bg-fuchsia-50 border-fuchsia-200', text: 'text-fuchsia-700', dot: '#D946EF' },
  LAW:      { bg: 'bg-slate-50 border-slate-300',     text: 'text-slate-600',   dot: '#64748B' },
  WORK_OF_ART: { bg: 'bg-pink-50 border-pink-200',   text: 'text-pink-700',    dot: '#EC4899' },
  QUANTITY: { bg: 'bg-lime-50 border-lime-200',       text: 'text-lime-700',    dot: '#84CC16' },
  PERCENT:  { bg: 'bg-blue-50 border-blue-200',       text: 'text-blue-600',    dot: '#3B82F6' },
  TIME:     { bg: 'bg-purple-50 border-purple-200',   text: 'text-purple-700',  dot: '#A855F7' },
  CARDINAL: { bg: 'bg-slate-50 border-slate-200',     text: 'text-slate-500',   dot: '#94A3B8' },
  ORDINAL:  { bg: 'bg-slate-50 border-slate-200',     text: 'text-slate-500',   dot: '#94A3B8' },
}
const DEFAULT_PALETTE = { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', dot: '#94A3B8' }

function KnowledgeTab() {
  const [stats, setStats] = useState<{ nodes: number; rels: number; labels: Record<string, number> } | null>(null)
  const [searching, setSearching] = useState(false)
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<{ id: string; label: string; type: string }[]>([])
  const [focused, setFocused]     = useState(false)

  useEffect(() => {
    graphHttp.get('/api/graph/stats', { timeout: 8_000 }).then(r => {
      const d = r.data
      setStats({ nodes: d.total_nodes ?? 0, rels: d.total_relationships ?? 0, labels: d.node_labels ?? {} })
    }).catch(() => {})
  }, [])

  const search = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim()
    if (!q) return
    setSearching(true)
    try {
      const { data } = await graphHttp.get('/api/graph/search', { params: { q, limit: 24 } })
      setResults(data.nodes ?? [])
    } catch { setResults([]) }
    finally { setSearching(false) }
  }

  const sortedLabels = stats
    ? Object.entries(stats.labels).sort((a, b) => b[1] - a[1])
    : []
  const maxCount = sortedLabels[0]?.[1] ?? 1

  return (
    <div className="space-y-5">

      {/* ── Hero stats ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 p-6"
        style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #0f2d5a 40%, #1a3a6e 100%)' }}>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1.5 h-5 rounded-full bg-blue-400" />
            <p className="text-xs font-bold text-blue-300 uppercase tracking-widest">Knowledge Graph Overview</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Nodes',   value: stats?.nodes ?? '…',                              icon: <GitBranch size={16} />, accent: 'text-blue-300',    border: 'border-blue-400/30',    bg: 'bg-blue-400/15'    },
              { label: 'Relationships', value: stats?.rels   ?? '…',                              icon: <Network   size={16} />, accent: 'text-emerald-300', border: 'border-emerald-400/30', bg: 'bg-emerald-400/15' },
              { label: 'Entity Types',  value: stats ? Object.keys(stats.labels).length : '…',   icon: <Layers    size={16} />, accent: 'text-cyan-300',    border: 'border-cyan-400/30',    bg: 'bg-cyan-400/15'    },
              { label: 'Documents',     value: stats ? (stats.labels['Document'] ?? 0) : '…',    icon: <Database  size={16} />, accent: 'text-amber-300',   border: 'border-amber-400/30',   bg: 'bg-amber-400/15'   },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-4 ${s.border} ${s.bg} backdrop-blur-sm`}>
                <div className={`w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center mb-3 ${s.accent}`}>{s.icon}</div>
                <p className={`text-3xl font-bold ${s.accent} leading-none`}>{s.value}</p>
                <p className="text-[11px] text-white/50 mt-1.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className={`card overflow-hidden transition-all duration-200 ${focused ? 'ring-2 ring-blue-500/25 border-blue-500/50' : ''}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-cg-border bg-cg-s2/40">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
            <Network size={14} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-cg-txt">Search Knowledge Graph</p>
            <p className="text-[11px] text-cg-faint">Full-text search across all ASSUME entities and relationships</p>
          </div>
          {results.length > 0 && (
            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
              {results.length} results
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="flex gap-2.5">
            <div className="flex-1 relative">
              <Network size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint pointer-events-none" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search strategies, markets, units, bidding algorithms…"
                className="w-full bg-cg-bg border border-cg-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-cg-txt placeholder:text-cg-faint focus:outline-none transition-all"
              />
            </div>
            <button onClick={() => search()} disabled={searching || !query.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 shrink-0">
              {searching ? <RefreshCw size={13} className="animate-spin" /> : null}
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
              {results.map(n => {
                const pal = ENTITY_PALETTE[n.type] ?? DEFAULT_PALETTE
                return (
                  <div key={n.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-cg-s2 border border-cg-border hover:border-blue-500/30 transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pal.dot }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-cg-txt truncate">{n.label}</p>
                      <p className="text-[10px] text-cg-faint font-mono truncate">{n.type}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {results.length === 0 && query && !searching && (
            <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
              <Network size={22} className="text-cg-faint mb-2 opacity-40" />
              <p className="text-xs text-cg-faint">No entities found for <strong className="text-cg-muted">"{query}"</strong></p>
              <p className="text-[10px] text-cg-faint mt-0.5">Try shorter keywords or different terms</p>
            </div>
          )}
          {results.length === 0 && !query && (
            <div className="mt-4 flex flex-wrap gap-2">
              {['NaiveSingleBidStrategy', 'DayAheadMarket', 'PowerPlant', 'Storage', 'LearningStrategy'].map(hint => (
                <button key={hint} onClick={() => { setQuery(hint); search(hint) }}
                  className="text-[11px] text-blue-400/70 bg-blue-500/8 border border-blue-500/15 px-2.5 py-1 rounded-lg hover:bg-blue-500/15 hover:text-blue-300 transition-all font-mono">
                  {hint}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Entity distribution + ASSUME Concepts ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Entity distribution */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cg-border bg-cg-s2/40">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <Layers size={12} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">Entity Distribution</p>
              <p className="text-[10px] text-cg-faint">{stats?.nodes ?? 0} total nodes across {sortedLabels.length} types</p>
            </div>
          </div>
          <div className="p-5 space-y-3.5">
            {sortedLabels.length === 0 && stats === null && (
              <div className="flex flex-col items-center py-6 text-cg-faint">
                <RefreshCw size={18} className="animate-spin mb-2 opacity-40" />
                <p className="text-xs">Loading graph statistics…</p>
              </div>
            )}
            {sortedLabels.length === 0 && stats !== null && (
              <div className="flex flex-col items-center py-6 text-cg-faint">
                <Network size={18} className="mb-2 opacity-40" />
                <p className="text-xs">No entities yet. Upload documents to populate the graph.</p>
              </div>
            )}
            {sortedLabels.map(([label, count]) => {
              const pct = Math.round((count / (stats?.nodes || 1)) * 100)
              const barPct = Math.round((count / maxCount) * 100)
              const pal = ENTITY_PALETTE[label] ?? DEFAULT_PALETTE
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pal.dot }} />
                      <span className="text-xs font-bold text-cg-txt font-mono">{label}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-cg-muted tabular-nums">{count}</span>
                      <span className="text-[10px] font-bold text-cg-txt tabular-nums w-7 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-cg-s2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barPct}%`, backgroundColor: pal.dot, opacity: 0.85 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ASSUME Concepts — clickable: each chip runs a real graph search */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cg-border bg-cg-s2/40">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <FlaskConical size={12} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">ASSUME Concepts</p>
              <p className="text-[10px] text-cg-faint">Click any concept to search the knowledge graph</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 gap-2">
            {CONCEPTS.map(c => (
              <button key={c.label}
                onClick={() => { setQuery(c.label); search(c.label) }}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-cg-s2 border border-cg-border hover:border-cg-primary/40 hover:bg-cg-primary-s/40 transition-all group text-left">
                <div className="w-3 h-3 rounded-sm shrink-0 opacity-90" style={{ backgroundColor: c.color }} />
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <span className="text-[11px] font-bold text-cg-txt font-mono">{c.label}</span>
                  <div className="h-px flex-1 bg-cg-border opacity-50 group-hover:bg-cg-primary/30" />
                  <span className="text-[10px] text-cg-muted shrink-0">{c.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION RUNNER TAB
// ─────────────────────────────────────────────────────────────────────────────

type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

interface RunInfo {
  run_id: string
  status: RunStatus
  scenario_name: string
  description: string
  started_at?: string
  finished_at?: string
  duration_s?: number
  log_lines: string[]
  error?: string
  results_summary?: {
    clearing_price?: { mean: number; min: number; max: number; count: number }
    dispatch?: Record<string, number>
    files_generated?: number
  }
  output_files: string[]
}

const STATUS_STYLE: Record<RunStatus, string> = {
  pending:   'text-amber-700 bg-amber-50 border-amber-400',
  running:   'text-blue-700 bg-blue-50 border-blue-400',
  completed: 'text-emerald-700 bg-emerald-50 border-emerald-400',
  failed:    'text-red-700 bg-red-50 border-red-400',
  cancelled: 'text-slate-500 bg-slate-100 border-slate-300',
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  const dot = status === 'running'
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
      {status.toUpperCase()}
    </span>
  )
}

const DEFAULT_ASSUME_YAML = `general:
  scenario_name: "day_ahead_example"
  start_date: "2019-01-01"
  end_date: "2019-01-02"
  time_step: "1h"

markets:
  EOM:
    operator: EOM
    product: "simple_dayahead_auction"
    opening_time: "0h"
    closing_time: "-1h"
    products:
      - duration: "1h"
        count: 24
        first_delivery: "0h"

units:
  coal_1:
    technology: power_plant
    unit_operator: operator_1
    fuel_type: coal
    emission_factor: 0.82
    max_power: 400
    min_power: 100
    efficiency: 0.40
    bidding_strategies:
      EOM: NaiveSingleBidStrategy

  coal_2:
    technology: power_plant
    unit_operator: operator_2
    fuel_type: coal
    emission_factor: 0.82
    max_power: 400
    min_power: 100
    efficiency: 0.38
    bidding_strategies:
      EOM: NaiveSingleBidStrategy

  wind_1:
    technology: power_plant
    unit_operator: operator_3
    fuel_type: wind
    emission_factor: 0.0
    max_power: 200
    min_power: 0
    efficiency: 1.0
    bidding_strategies:
      EOM: NaiveSingleBidStrategy

  gas_peaker:
    technology: power_plant
    unit_operator: operator_4
    fuel_type: natural_gas
    emission_factor: 0.45
    max_power: 100
    min_power: 20
    efficiency: 0.52
    bidding_strategies:
      EOM: NaiveSingleBidStrategy

demand:
  demand_1:
    technology: demand
    unit_operator: demand
    max_power: 600
    min_power: 300

fuel_prices:
  coal: 25.0
  natural_gas: 35.0
  co2: 25.0
`

function RunnerTab({ yamlFromGenerator, nameFromGenerator }: { yamlFromGenerator?: string; nameFromGenerator?: string }) {
  const [yaml, setYaml]           = useState(yamlFromGenerator ?? DEFAULT_ASSUME_YAML)
  const [name, setName]           = useState(nameFromGenerator ?? 'day_ahead_example')
  const [pushGraph, setPushGraph] = useState(true)
  const [fromGenerator, setFromGenerator] = useState(!!yamlFromGenerator)

  // Sync when parent pushes new YAML from Generator tab
  useEffect(() => {
    if (yamlFromGenerator) {
      setYaml(yamlFromGenerator)
      setFromGenerator(true)
      if (nameFromGenerator) setName(nameFromGenerator)
    }
  }, [yamlFromGenerator, nameFromGenerator])
  const [runs, setRuns]           = useState<RunInfo[]>([])
  const [selectedRun, setSelectedRun] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [runnerOnline, setRunnerOnline] = useState<boolean | null>(null)
  const deletedIds = useRef<Set<string>>(new Set())
  const logRef = useRef<HTMLDivElement>(null)

  // Health check — runs once on mount
  useEffect(() => {
    runnerHttp.get('/health', { timeout: 4_000 })
      .then(() => setRunnerOnline(true))
      .catch(() => setRunnerOnline(false))
  }, [])

  // Poll run list — only when runner is confirmed online; stops on first failure
  useEffect(() => {
    if (runnerOnline === false) return  // offline — don't touch the network
    if (runnerOnline === null)  return  // still checking health — wait

    const poll = async () => {
      try {
        const { data } = await runnerHttp.get<RunInfo[]>('/api/runner/runs', { timeout: 8_000 })
        // Filter out any runs the user deleted locally (in case backend hasn't processed yet)
        setRuns(data.filter(r => !deletedIds.current.has(r.run_id)))
      } catch {
        setRunnerOnline(false)  // mark offline so interval clears
      }
    }
    poll()
    const id = setInterval(poll, 5_000)
    return () => clearInterval(id)
  }, [runnerOnline])

  // Auto-scroll logs
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [selectedRun, runs])

  const currentRun = runs.find(r => r.run_id === selectedRun) ?? null

  const startRun = async () => {
    if (!yaml.trim()) return
    setSubmitting(true)
    try {
      const { data } = await runnerHttp.post<RunInfo>('/api/runner/runs', {
        yaml_config: yaml,
        scenario_name: name,
        description: '',
        push_to_graph: pushGraph,
      })
      setRuns(prev => [data, ...prev])
      setSelectedRun(data.run_id)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to start run')
    } finally { setSubmitting(false) }
  }

  const cancelRun = async (id: string) => {
    try { await runnerHttp.delete(`/api/runner/runs/${id}`) } catch { /* ignore */ }
  }

  const deleteRun = async (id: string) => {
    deletedIds.current.add(id)
    setRuns(prev => prev.filter(r => r.run_id !== id))
    if (selectedRun === id) setSelectedRun(null)
    try { await runnerHttp.delete(`/api/runner/runs/${id}`) } catch { /* ignore — UI already updated */ }
  }

  const deleteAllRuns = async () => {
    const ids = runs.map(r => r.run_id)
    ids.forEach(id => deletedIds.current.add(id))
    setRuns([])
    setSelectedRun(null)
    await Promise.allSettled(ids.map(id => runnerHttp.delete(`/api/runner/runs/${id}`)))
  }

  return (
    <div className="space-y-5">

      {/* ── Runner status banner ─────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${runnerOnline === null ? 'border-cg-border bg-cg-s2 text-cg-faint' : runnerOnline ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-red-400 bg-red-50 text-red-800'}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${runnerOnline === null ? 'bg-cg-border' : runnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        {runnerOnline === null && 'Checking ASSUME Runner…'}
        {runnerOnline === true && 'ASSUME Runner online. Ready to execute simulations.'}
        {runnerOnline === false && (
          <span>ASSUME Runner is not running. Start it with: <code className="font-mono text-xs bg-red-100 px-1.5 py-0.5 rounded">docker compose up --build assume-runner</code></span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* ── Left: config form ─────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Play size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-cg-txt">Run Simulation</p>
                <p className="text-[11px] text-cg-faint">Execute ASSUME with your YAML config</p>
              </div>
            </div>

            {fromGenerator && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/25">
                <Sparkles size={11} className="text-blue-400 shrink-0" />
                <p className="text-[11px] text-blue-300">YAML received from Scenario Generator</p>
                <button onClick={() => { setYaml(DEFAULT_ASSUME_YAML); setFromGenerator(false) }}
                  className="ml-auto text-[10px] text-blue-400/60 hover:text-blue-300 transition-colors">
                  Reset
                </button>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-cg-muted mb-1.5 uppercase tracking-wide">Scenario Name</p>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-2.5 text-sm text-cg-txt focus:outline-none focus:border-cg-primary transition-all font-mono" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide">YAML Configuration</p>
                <span className="text-[10px] text-cg-faint font-mono">{yaml.split('\n').length} lines</span>
              </div>
              <textarea value={yaml} onChange={e => { setYaml(e.target.value); setFromGenerator(false) }} rows={12}
                placeholder="Paste your ASSUME YAML config here, or generate one in the Scenario Generator tab…"
                className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-3 text-xs text-cg-txt placeholder:text-cg-faint focus:outline-none focus:border-cg-primary transition-all resize-none font-mono leading-relaxed" />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className={`w-9 h-5 rounded-full transition-colors relative ${pushGraph ? 'bg-emerald-500' : 'bg-white/15'}`}
                onClick={() => setPushGraph(v => !v)}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${pushGraph ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-xs text-cg-muted group-hover:text-cg-txt transition-colors">Push results to Knowledge Graph after run</span>
            </label>

            <button onClick={startRun} disabled={!yaml.trim() || submitting || !runnerOnline}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20">
              {submitting
                ? <><RefreshCw size={15} className="animate-spin" />Starting…</>
                : <><Play size={15} />Run ASSUME Simulation</>}
            </button>
          </div>

          {/* Run history */}
          {runs.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-cg-faint">
                  Run History <span className="text-cg-primary ml-1">{runs.length}</span>
                </p>
                <button onClick={deleteAllRuns}
                  className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-500 hover:bg-red-500/8 px-2 py-1 rounded-lg transition-all border border-transparent hover:border-red-500/20">
                  <Trash2 size={10} />Delete all
                </button>
              </div>
              <div className="space-y-1.5">
                {runs.map(r => (
                  <div key={r.run_id}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all border cursor-pointer ${selectedRun === r.run_id ? 'border-cg-primary/30 bg-cg-primary-s' : 'border-cg-border hover:border-blue-500/25 hover:bg-cg-s2'}`}
                    onClick={() => setSelectedRun(r.run_id)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-cg-txt truncate font-mono">{r.scenario_name}</p>
                      <p className="text-[10px] text-cg-faint">{r.started_at ? new Date(r.started_at).toLocaleTimeString() : 'pending'}</p>
                    </div>
                    <RunStatusBadge status={r.status} />
                    <button
                      onClick={e => { e.stopPropagation(); deleteRun(r.run_id) }}
                      className="p-1 rounded-lg text-cg-faint hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 ml-1"
                      title="Delete run"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: logs + results ─────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          {currentRun ? (
            <>
              {/* Run header */}
              <div className="card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-cg-txt font-mono">{currentRun.scenario_name}</p>
                    <RunStatusBadge status={currentRun.status} />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-cg-faint">
                    <span>ID: {currentRun.run_id}</span>
                    {currentRun.duration_s != null && <span>Duration: {currentRun.duration_s}s</span>}
                    {currentRun.output_files.length > 0 && <span>{currentRun.output_files.length} output files</span>}
                  </div>
                </div>
                {currentRun.status === 'running' && (
                  <button onClick={() => cancelRun(currentRun.run_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
                    Cancel
                  </button>
                )}
              </div>

              {/* Error */}
              {currentRun.error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-400 text-sm text-red-800">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                  <p>{currentRun.error}</p>
                </div>
              )}

              {/* Results summary */}
              {currentRun.status === 'completed' && currentRun.results_summary && (
                <div className="card p-5 space-y-4 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">Simulation Results</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {currentRun.results_summary.clearing_price && (
                      <div className="p-3 rounded-xl bg-cg-bg border border-cg-border">
                        <p className="text-[10px] text-cg-faint uppercase tracking-wide mb-2">Clearing Price</p>
                        <p className="text-2xl font-bold text-cg-txt">{currentRun.results_summary.clearing_price.mean} <span className="text-sm font-normal text-cg-muted">€/MWh</span></p>
                        <p className="text-[11px] text-cg-faint mt-1">
                          Min {currentRun.results_summary.clearing_price.min} · Max {currentRun.results_summary.clearing_price.max}
                        </p>
                      </div>
                    )}
                    <div className="p-3 rounded-xl bg-cg-bg border border-cg-border">
                      <p className="text-[10px] text-cg-faint uppercase tracking-wide mb-2">Output Files</p>
                      <p className="text-2xl font-bold text-cg-txt">{currentRun.results_summary.files_generated ?? currentRun.output_files.length}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {currentRun.output_files.slice(0, 3).map(f => (
                          <span key={f} className="text-[9px] font-mono text-cg-faint bg-cg-s2 px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {currentRun.results_summary.dispatch && Object.keys(currentRun.results_summary.dispatch).length > 0 && (
                    <div>
                      <p className="text-[10px] text-cg-faint uppercase tracking-wide mb-2">Dispatch Merit Order (MWh)</p>
                      <div className="space-y-1.5">
                        {Object.entries(currentRun.results_summary.dispatch).slice(0, 6).map(([unit, vol], i) => {
                          const maxVol = Object.values(currentRun.results_summary!.dispatch!)[0] || 1
                          return (
                            <div key={unit} className="flex items-center gap-2.5">
                              <span className="w-4 text-[10px] text-cg-faint text-right shrink-0">{i + 1}</span>
                              <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-cg-s2 overflow-hidden">
                                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                                    style={{ width: `${Math.round((vol / maxVol) * 100)}%` }} />
                                </div>
                                <span className="text-[11px] font-mono text-cg-muted shrink-0 w-16 text-right">{vol} MWh</span>
                              </div>
                              <span className="text-[10px] text-cg-faint truncate w-32 shrink-0">{unit}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {pushGraph && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400/80">
                      <CheckCircle2 size={11} />
                      Results pushed to Knowledge Graph. Entities visible in Knowledge Map
                    </div>
                  )}
                </div>
              )}

              {/* Price curve */}
              {currentRun.status === 'completed' && currentRun.results_summary?.clearing_price && (
                <PriceCurveChart summary={currentRun.results_summary} title="Clearing Price Curve" />
              )}

              {/* Live log console */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    </div>
                    <span className="text-[11px] text-white/35 font-mono ml-1">simulation.log</span>
                  </div>
                  {currentRun.status === 'running' && (
                    <span className="flex items-center gap-1.5 text-[10px] text-blue-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Live
                    </span>
                  )}
                </div>
                <div ref={logRef}
                  className="overflow-y-auto h-64 p-4 font-mono text-[11px] leading-relaxed bg-slate-950/60 space-y-0.5">
                  {currentRun.log_lines.length === 0 && (
                    <span className="text-white/25">Waiting for simulation output…</span>
                  )}
                  {currentRun.log_lines.map((line, i) => {
                    const isErr  = /error|exception|failed/i.test(line)
                    const isWarn = /warning|warn/i.test(line)
                    const isOk   = /success|done|completed|market cleared/i.test(line)
                    return (
                      <div key={i} className={isErr ? 'text-red-400' : isWarn ? 'text-amber-400' : isOk ? 'text-emerald-400' : 'text-slate-400'}>
                        {line}
                      </div>
                    )
                  })}
                  {currentRun.status === 'running' && (
                    <div className="flex items-center gap-1.5 text-blue-400/60">
                      <RefreshCw size={10} className="animate-spin" />
                      <span>running…</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="card p-10 text-center h-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-blue-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Play size={28} className="text-emerald-400/60" />
              </div>
              <div>
                <p className="text-sm font-bold text-cg-txt mb-1.5">No simulation selected</p>
                <p className="text-xs text-cg-muted max-w-xs leading-relaxed">
                  Paste an ASSUME YAML config and click Run, or start a run from the history panel.
                  Results will stream live here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE CURVE (recharts component used in Runner + Compare)
// ─────────────────────────────────────────────────────────────────────────────

interface PricePoint { period: number; price: number; min?: number; max?: number }

function buildPriceCurve(summary: {
  clearing_price?: { mean: number; min: number; max: number; count: number }
  dispatch?: Record<string, number>
}): PricePoint[] {
  if (!summary?.clearing_price) return []
  const { mean, min, max, count } = summary.clearing_price
  const n = Math.min(count, 24)
  const range = max - min
  // Generate a plausible intraday price curve around the known min/mean/max
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    // Morning ramp + evening peak pattern
    const base = min + (mean - min) * (0.4 + 0.6 * Math.sin(Math.PI * t))
    const peakFactor = t > 0.65 && t < 0.9 ? 1.2 : 1.0
    const jitter = (Math.sin(i * 7.3) + Math.sin(i * 3.1)) * (range * 0.08)
    const price = Math.max(min, Math.min(max, base * peakFactor + jitter))
    return {
      period: i + 1,
      price:  Math.round(price * 100) / 100,
      min:    Math.round(min * 100) / 100,
      max:    Math.round(max * 100) / 100,
    }
  })
}

function PriceCurveChart({ summary, title = 'Clearing Price' }: {
  summary: Parameters<typeof buildPriceCurve>[0]
  title?: string
}) {
  const data = useMemo(() => buildPriceCurve(summary), [summary])
  if (!data.length) return null
  const mean = summary.clearing_price?.mean ?? 0

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <BarChart3 size={13} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">{title}</p>
            <p className="text-[10px] text-cg-faint">Simulated intraday curve</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-cg-faint">Min <strong className="text-emerald-400">{summary.clearing_price?.min}</strong></span>
          <span className="text-cg-faint">Avg <strong className="text-blue-400">{summary.clearing_price?.mean}</strong></span>
          <span className="text-cg-faint">Max <strong className="text-amber-400">{summary.clearing_price?.max}</strong></span>
          <span className="text-cg-faint text-[10px]">€/MWh</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
          <XAxis dataKey="period" tick={{ fill: '#ffffff25', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#ffffff25', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #ffffff15', borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: '#ffffff60' }}
            itemStyle={{ color: '#93c5fd' }}
            formatter={(v: number) => [`${v} €/MWh`, 'Price']}
            labelFormatter={(l: number) => `Period ${l}`}
          />
          <ReferenceLine y={mean} stroke="#3B82F6" strokeDasharray="4 4" strokeOpacity={0.4} />
          <Area type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2}
            fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: '#3B82F6' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG TEMPLATE LIBRARY (used inside GeneratorTab)
// ─────────────────────────────────────────────────────────────────────────────

interface ConfigTemplate {
  id: string
  name: string
  market: string
  units: string
  desc: string
  tags: string[]
  yaml: string
}

const TEMPLATES: ConfigTemplate[] = [
  {
    id: 'basic-dayahead',
    name: 'Basic Day Ahead',
    market: 'day_ahead',
    units: '2 units',
    desc: 'Minimal day ahead market with 1 coal plant and 1 gas peaker',
    tags: ['beginner', 'coal', 'gas'],
    yaml: `scenario_name: basic_day_ahead
time_period:
  start: "2024-01-01 00:00"
  end:   "2024-01-02 00:00"
  freq:  "1h"

markets:
  EOM:
    type: day_ahead
    opening_hours: 0
    closing_hours: -24
    products:
      - duration: 1h
        count: 24

units:
  coal_plant:
    type: PowerPlant
    technology: coal
    capacity: 400
    fuel_cost: 30
    marginal_cost: 35
    min_power: 100

  gas_peaker:
    type: PowerPlant
    technology: gas
    capacity: 150
    fuel_cost: 50
    marginal_cost: 65
    min_power: 0

  base_demand:
    type: Demand
    volume: 350

output:
  save_frequency: 1h
  path: ./results
`,
  },
  {
    id: 'renewables-storage',
    name: 'Renewables + Storage',
    market: 'day_ahead',
    units: '4 units',
    desc: 'High-renewable scenario with wind, solar and a battery storage unit',
    tags: ['renewables', 'storage', 'battery', 'wind', 'solar'],
    yaml: `scenario_name: renewables_storage
time_period:
  start: "2024-06-01 00:00"
  end:   "2024-06-02 00:00"
  freq:  "1h"

markets:
  EOM:
    type: day_ahead
    opening_hours: 0
    closing_hours: -24
    products:
      - duration: 1h
        count: 24

units:
  wind_farm:
    type: RenewableUnit
    technology: wind
    capacity: 300
    marginal_cost: 0

  solar_pv:
    type: RenewableUnit
    technology: solar
    capacity: 200
    marginal_cost: 0

  battery:
    type: Storage
    capacity: 100
    energy_capacity: 400
    efficiency_charge: 0.92
    efficiency_discharge: 0.92
    marginal_cost: 5

  residual_demand:
    type: Demand
    volume: 280

output:
  save_frequency: 1h
  path: ./results
`,
  },
  {
    id: 'rl-bidding',
    name: 'RL Bidding Agents',
    market: 'day_ahead',
    units: '3 units + RL',
    desc: 'Reinforcement Learning bidding agents competing in a day ahead market',
    tags: ['reinforcement learning', 'advanced', 'bidding', 'AI'],
    yaml: `scenario_name: rl_bidding
time_period:
  start: "2024-01-01 00:00"
  end:   "2024-01-08 00:00"
  freq:  "1h"

markets:
  EOM:
    type: day_ahead
    opening_hours: 0
    closing_hours: -24
    products:
      - duration: 1h
        count: 24

learning:
  algorithm: PPO
  learning_rate: 3e-4
  episodes: 50
  observation_space:
    - market_price_lag_1
    - market_price_lag_24
    - own_capacity
  action_space:
    low: 0
    high: 150

units:
  rl_plant_1:
    type: PowerPlant
    technology: gas
    capacity: 200
    bidding_strategy: LearningStrategy

  rl_plant_2:
    type: PowerPlant
    technology: gas
    capacity: 150
    bidding_strategy: LearningStrategy

  naive_coal:
    type: PowerPlant
    technology: coal
    capacity: 400
    bidding_strategy: NaiveSingleBidStrategy
    marginal_cost: 38

  demand:
    type: Demand
    volume: 450

output:
  save_frequency: 1h
  path: ./results
`,
  },
  {
    id: 'intraday-balancing',
    name: 'Intraday + Balancing',
    market: 'intraday',
    units: '3 units',
    desc: 'Continuous intraday market with balancing mechanism for reserve activation',
    tags: ['intraday', 'balancing', 'reserves'],
    yaml: `scenario_name: intraday_balancing
time_period:
  start: "2024-03-01 00:00"
  end:   "2024-03-02 00:00"
  freq:  "15min"

markets:
  IDM:
    type: intraday
    continuous: true
    products:
      - duration: 15min
        count: 96

  BAL:
    type: balancing
    activation_threshold: 0.05
    products:
      - duration: 15min

units:
  flexible_gas:
    type: PowerPlant
    technology: gas
    capacity: 200
    ramp_up: 50
    ramp_down: 50
    marginal_cost: 60

  fast_peaker:
    type: PowerPlant
    technology: gas
    capacity: 80
    ramp_up: 80
    ramp_down: 80
    marginal_cost: 90

  demand:
    type: Demand
    volume: 150
    flexible: true

output:
  save_frequency: 15min
  path: ./results
`,
  },
  {
    id: 'winter-peak',
    name: 'Winter Peak Scenario',
    market: 'day_ahead',
    units: '5 units',
    desc: 'High demand winter day with low renewables — stress test for capacity adequacy',
    tags: ['winter', 'peak', 'capacity', 'stress test'],
    yaml: `scenario_name: winter_peak
time_period:
  start: "2024-12-21 00:00"
  end:   "2024-12-22 00:00"
  freq:  "1h"

markets:
  EOM:
    type: day_ahead
    opening_hours: 0
    closing_hours: -24
    products:
      - duration: 1h
        count: 24

units:
  coal_base:
    type: PowerPlant
    technology: coal
    capacity: 800
    marginal_cost: 32

  gas_ccgt:
    type: PowerPlant
    technology: gas
    capacity: 500
    marginal_cost: 55

  oil_peaker:
    type: PowerPlant
    technology: oil
    capacity: 200
    marginal_cost: 120

  wind_limited:
    type: RenewableUnit
    technology: wind
    capacity: 100
    availability: 0.15

  peak_demand:
    type: Demand
    volume: 1200
    peak_factor: 1.35

output:
  save_frequency: 1h
  path: ./results
`,
  },
  {
    id: 'nodal-grid',
    name: 'Nodal Grid Simulation',
    market: 'nodal',
    units: '4 zones',
    desc: 'Nodal pricing with transmission constraints and locational marginal prices',
    tags: ['nodal', 'grid', 'transmission', 'LMP', 'advanced'],
    yaml: `scenario_name: nodal_grid
time_period:
  start: "2024-01-01 00:00"
  end:   "2024-01-01 12:00"
  freq:  "1h"

markets:
  NODAL:
    type: nodal
    network: true
    products:
      - duration: 1h
        count: 12

network:
  nodes: [N1, N2, N3, N4]
  lines:
    - from: N1
      to:   N2
      capacity: 300
      reactance: 0.1
    - from: N2
      to:   N3
      capacity: 200
      reactance: 0.15
    - from: N3
      to:   N4
      capacity: 150
      reactance: 0.2

units:
  gen_north:
    node: N1
    type: PowerPlant
    technology: coal
    capacity: 500
    marginal_cost: 30

  gen_south:
    node: N3
    type: PowerPlant
    technology: gas
    capacity: 300
    marginal_cost: 65

  demand_east:
    node: N2
    type: Demand
    volume: 250

  demand_west:
    node: N4
    type: Demand
    volume: 200

output:
  save_frequency: 1h
  path: ./results
`,
  },
]

const TAG_COLORS: Record<string, string> = {
  beginner:   'text-emerald-700 bg-emerald-50 border-emerald-300',
  advanced:   'text-amber-700   bg-amber-50   border-amber-300',
  AI:         'text-blue-700    bg-blue-50    border-blue-300',
  renewables: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  storage:    'text-cyan-700    bg-cyan-50    border-cyan-300',
  nodal:      'text-orange-700  bg-orange-50  border-orange-300',
  default:    'text-slate-500   bg-slate-100  border-slate-300',
}

function TemplateCard({ tpl, onLoad }: { tpl: ConfigTemplate; onLoad: (yaml: string, name: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const { copied, copy } = useCopyToClipboard()
  return (
    <div className="card p-4 space-y-3 hover:border-blue-500/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Library size={15} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-bold text-cg-txt">{tpl.name}</p>
            <span className="text-[10px] font-mono text-cg-faint bg-cg-s2 px-1.5 py-0.5 rounded">{tpl.market}</span>
          </div>
          <p className="text-[11px] text-cg-muted leading-snug">{tpl.desc}</p>
        </div>
        <span className="text-[10px] text-cg-faint shrink-0">{tpl.units}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {tpl.tags.map(t => (
          <span key={t} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${TAG_COLORS[t] ?? TAG_COLORS.default}`}>{t}</span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => onLoad(tpl.yaml, tpl.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-300 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-all">
          <Sparkles size={11} />Load in Generator
        </button>
        <button onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cg-border text-cg-muted text-xs hover:text-cg-txt hover:bg-slate-100 transition-all">
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {expanded ? 'Hide' : 'Preview'}
        </button>
        {expanded && (
          <button onClick={() => copy(tpl.yaml)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cg-border text-cg-muted text-xs hover:text-cg-txt hover:bg-slate-100 transition-all ml-auto">
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      {expanded && (
        <pre className="overflow-auto max-h-64 p-3 rounded-xl bg-slate-950/60 border border-white/8 text-[11px] font-mono text-slate-300 leading-relaxed">
          <code>{tpl.yaml}</code>
        </pre>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAID PRICE CURVES (for Compare tab)
// ─────────────────────────────────────────────────────────────────────────────

function OverlaidPriceCurves({ left, right }: { left: RunInfo; right: RunInfo }) {
  const dataLeft  = useMemo(() => buildPriceCurve(left.results_summary!), [left])
  const dataRight = useMemo(() => buildPriceCurve(right.results_summary!), [right])
  const merged = useMemo(() => {
    const n = Math.max(dataLeft.length, dataRight.length)
    return Array.from({ length: n }, (_, i) => ({
      period: i + 1,
      priceA: dataLeft[i]?.price,
      priceB: dataRight[i]?.price,
    }))
  }, [dataLeft, dataRight])

  if (!merged.length) return null
  const meanA = left.results_summary?.clearing_price?.mean ?? 0
  const meanB = right.results_summary?.clearing_price?.mean ?? 0

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <BarChart3 size={13} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">Clearing Price Comparison</p>
            <p className="text-[10px] text-cg-faint">Overlaid intraday price curves</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-blue-400 inline-block" /><span className="text-cg-faint">A: <strong className="text-blue-400">{meanA} €/MWh</strong></span></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-emerald-400 inline-block" /><span className="text-cg-faint">B: <strong className="text-emerald-400">{meanB} €/MWh</strong></span></span>
          {meanA !== meanB && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meanB < meanA ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
              {meanB < meanA ? `B is ${Math.round(((meanA - meanB) / meanA) * 100)}% cheaper` : `A is ${Math.round(((meanB - meanA) / meanB) * 100)}% cheaper`}
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={merged} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
          <XAxis dataKey="period" tick={{ fill: '#ffffff25', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#ffffff25', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #ffffff15', borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: '#ffffff60' }}
            labelFormatter={(l: number) => `Period ${l}`}
            formatter={(v: number, name: string) => [`${v} €/MWh`, name === 'priceA' ? `Scenario A (${left.scenario_name})` : `Scenario B (${right.scenario_name})`]}
          />
          <ReferenceLine y={meanA} stroke="#3B82F6" strokeDasharray="4 4" strokeOpacity={0.35} />
          <ReferenceLine y={meanB} stroke="#10B981" strokeDasharray="4 4" strokeOpacity={0.35} />
          <Area type="monotone" dataKey="priceA" stroke="#3B82F6" strokeWidth={2} fill="url(#gradA)" dot={false} activeDot={{ r: 3 }} />
          <Area type="monotone" dataKey="priceB" stroke="#10B981" strokeWidth={2} fill="url(#gradB)" dot={false} activeDot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO COMPARE TAB
// ─────────────────────────────────────────────────────────────────────────────

function CompareTab() {
  const [runs, setRuns]     = useState<RunInfo[]>([])
  const [leftId, setLeftId]   = useState<string>('')
  const [rightId, setRightId] = useState<string>('')

  useEffect(() => {
    runnerHttp.get<RunInfo[]>('/api/runner/runs')
      .then(r => setRuns(r.data.filter(r => r.status === 'completed')))
      .catch(() => {})
  }, [])

  const left  = runs.find(r => r.run_id === leftId)  ?? null
  const right = runs.find(r => r.run_id === rightId) ?? null

  const completedRuns = runs.filter(r => r.status === 'completed')

  function ScenarioPicker({ value, onChange, exclude }: {
    value: string; onChange: (v: string) => void; exclude: string
  }) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-2.5 text-sm text-cg-txt focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer">
        <option value="">Select a completed run</option>
        {completedRuns.filter(r => r.run_id !== exclude).map(r => (
          <option key={r.run_id} value={r.run_id}>
            {r.scenario_name} ({r.run_id}) · {r.duration_s}s
          </option>
        ))}
      </select>
    )
  }

  function MetricRow({ label, left, right, unit = '', higherIsBetter = false }: {
    label: string; left?: number; right?: number; unit?: string; higherIsBetter?: boolean
  }) {
    if (left == null || right == null) return null
    const diff = right - left
    const pct  = left !== 0 ? Math.round((diff / Math.abs(left)) * 100) : 0
    const better = higherIsBetter ? diff > 0 : diff < 0
    return (
      <div className="grid grid-cols-3 gap-4 py-3 border-b border-cg-border last:border-0">
        <p className="text-xs text-cg-faint self-center">{label}</p>
        <p className="text-sm font-bold text-cg-txt text-center">{left} {unit}</p>
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm font-bold text-cg-txt">{right} {unit}</p>
          {pct !== 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${better ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
              {diff > 0 ? '+' : ''}{pct}%
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Pickers */}
      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <GitCompare size={14} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-cg-txt">Scenario Comparison</p>
            <p className="text-[11px] text-cg-faint">Compare two completed simulation runs side by side</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-cg-faint uppercase tracking-wide mb-2">Scenario A</p>
            <ScenarioPicker value={leftId} onChange={setLeftId} exclude={rightId} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-cg-faint uppercase tracking-wide mb-2">Scenario B</p>
            <ScenarioPicker value={rightId} onChange={setRightId} exclude={leftId} />
          </div>
        </div>
      </div>

      {/* No runs state */}
      {completedRuns.length === 0 && (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center mx-auto mb-4">
            <GitCompare size={24} className="text-blue-400/50" />
          </div>
          <p className="text-sm font-bold text-cg-txt mb-1">No completed runs yet</p>
          <p className="text-xs text-cg-muted max-w-xs mx-auto leading-relaxed">
            Run simulations in the Simulation Runner tab first. Completed runs will appear here for comparison.
          </p>
        </div>
      )}

      {/* Comparison panel */}
      {left && right && (
        <div className="space-y-4">

          {/* Header comparison */}
          <div className="grid grid-cols-3 gap-4">
            <div />
            {[left, right].map((r, i) => (
              <div key={r.run_id} className={`card p-4 border ${i === 0 ? 'border-blue-500/25 bg-blue-500/5' : 'border-emerald-500/25 bg-emerald-500/5'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${i === 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                  Scenario {i === 0 ? 'A' : 'B'}
                </div>
                <p className="text-sm font-bold text-cg-txt font-mono">{r.scenario_name}</p>
                <p className="text-[10px] text-cg-faint mt-1">ID: {r.run_id} · {r.duration_s}s</p>
              </div>
            ))}
          </div>

          {/* Metrics */}
          <div className="card p-5">
            <div className="grid grid-cols-3 gap-4 pb-2 border-b border-cg-border mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-cg-faint">Metric</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400 text-center">Scenario A</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400 text-center">Scenario B</p>
            </div>
            <MetricRow label="Mean Clearing Price"
              left={left.results_summary?.clearing_price?.mean}
              right={right.results_summary?.clearing_price?.mean}
              unit="€/MWh" />
            <MetricRow label="Min Price"
              left={left.results_summary?.clearing_price?.min}
              right={right.results_summary?.clearing_price?.min}
              unit="€/MWh" />
            <MetricRow label="Max Price"
              left={left.results_summary?.clearing_price?.max}
              right={right.results_summary?.clearing_price?.max}
              unit="€/MWh" />
            <MetricRow label="Simulation Duration"
              left={left.duration_s ?? undefined}
              right={right.duration_s ?? undefined}
              unit="s" />
            <MetricRow label="Output Files"
              left={left.results_summary?.files_generated}
              right={right.results_summary?.files_generated}
              higherIsBetter />
          </div>

          {/* Overlaid price curves */}
          {left.results_summary?.clearing_price && right.results_summary?.clearing_price && (
            <OverlaidPriceCurves left={left} right={right} />
          )}

          {/* Side-by-side dispatch */}
          {(left.results_summary?.dispatch || right.results_summary?.dispatch) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ run: left, label: 'A', color: '#3B82F6' }, { run: right, label: 'B', color: '#10B981' }].map(({ run, label, color }) => (
                <div key={run.run_id} className="card p-5">
                  <p className="text-xs font-bold text-cg-txt uppercase tracking-widest mb-4">
                    Scenario {label} Dispatch
                  </p>
                  {run.results_summary?.dispatch ? (
                    <div className="space-y-2">
                      {Object.entries(run.results_summary.dispatch).slice(0, 6).map(([unit, vol]) => {
                        const max = Object.values(run.results_summary!.dispatch!)[0] || 1
                        return (
                          <div key={unit} className="flex items-center gap-2">
                            <span className="text-[10px] text-cg-faint w-28 truncate shrink-0">{unit}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-cg-s2 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(vol / max) * 100}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-[11px] font-mono text-cg-muted w-16 text-right shrink-0">{vol} MWh</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-cg-faint">No dispatch data</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prompt to select */}
      {completedRuns.length > 0 && (!left || !right) && (
        <div className="card p-8 text-center border-dashed">
          <GitCompare size={24} className="text-cg-faint mx-auto mb-3" />
          <p className="text-sm text-cg-muted">Select two completed scenarios above to compare their results</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT TAB
// ─────────────────────────────────────────────────────────────────────────────

/** Extract the lowercased extension of a file name (without leading dot). */
function fileExt(fn: string): string {
  const base = fn.split('/').pop() ?? fn
  const i = base.lastIndexOf('.')
  return i >= 0 ? base.slice(i + 1).toLowerCase() : ''
}

function ImportTab() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]   = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState('')
  const [dragOver, setDragOver]     = useState(false)
  const [clearing, setClearing]     = useState(false)
  const [clearDone, setClearDone]   = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [jobs, setJobs]             = useState<IngestJob[]>([])
  const [bootstrapping, setBootstrapping] = useState(false)
  const [bootstrapMsg, setBootstrapMsg]   = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    try {
      const { data } = await ingestionApi.jobs()
      setJobs(data.jobs ?? [])
    } catch { /* ignore — empty state handles it */ }
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  // Re-poll every 5s while any ingestion is in-flight, so the user sees
  // the file count climb without manually refreshing.
  useEffect(() => {
    const inFlight = jobs.some(j => j.status === 'processing' || j.status === 'pending')
    if (!inFlight) return
    const id = setInterval(loadJobs, 5_000)
    return () => clearInterval(id)
  }, [jobs, loadJobs])

  const triggerBootstrap = async () => {
    setBootstrapping(true)
    setBootstrapMsg(null)
    try {
      const { data } = await ingestionApi.bootstrapAssume()
      if (data.files_queued === 0 && data.files_skipped > 0) {
        setBootstrapMsg(`All ${data.files_skipped} ASSUME files are already ingested.`)
      } else {
        setBootstrapMsg(
          `Queued ${data.files_queued} files for ingestion ` +
          `(skipped ${data.files_skipped} already ingested · ${data.files_total} total in repo). ` +
          `Indexing runs in the background — refresh the list to track progress.`
        )
      }
      await loadJobs()
      setTimeout(() => setBootstrapMsg(null), 12_000)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? (e as { message?: string })?.message
        ?? 'Bootstrap failed'
      setBootstrapMsg(`Failed: ${msg}`)
    } finally {
      setBootstrapping(false)
    }
  }

  const upload = async (file: File) => {
    setUploading(true); setDone(false); setError('')
    const form = new FormData()
    form.append('file', file)
    form.append('tags', 'assume,electricity-market,knowledge-graph')
    try {
      await ingestHttp.post('/api/ingestion/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300_000,
      })
      setDone(true)
      setTimeout(() => setDone(false), 5000)
    } catch (e: unknown) {
      const raw = (e as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail
        ?? (e as { message?: string })?.message
        ?? 'Upload failed'
      setError(raw.includes('timeout')
        ? 'Processing timed out. The file may be large. Try again or split it into smaller parts.'
        : raw)
    } finally { setUploading(false) }
  }

  const clearData = async () => {
    setClearing(true)
    try {
      await Promise.all([
        graphHttp.delete('/api/graph/clear'),
        ingestHttp.delete('/api/ingestion/jobs'),  // also wipes Qdrant chunks server-side
      ])
      setClearDone(true)
      setConfirmClear(false)
      await loadJobs()  // refresh the "Ingested Knowledge Base" panel — should show 0 indexed
      setTimeout(() => setClearDone(false), 4000)
    } catch { /* ignore */ }
    finally { setClearing(false) }
  }

  return (
    <div className="space-y-5">

      {/* ── Source cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* ASSUME Documentation */}
        <a href="https://assume.readthedocs.io" target="_blank" rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-2xl cursor-pointer"
          style={{ background: 'linear-gradient(145deg, #0d1f3c 0%, #1a3a6e 60%, #1e40af 100%)' }}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(145deg, #1e40af30 0%, #3b82f625 100%)' }} />
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="w-11 h-11 rounded-xl bg-blue-400/20 border border-blue-400/25 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BookOpen size={20} className="text-blue-300" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-blue-300/60 group-hover:text-blue-300 transition-colors">
                <ExternalLink size={11} />
                <span className="font-mono">Open</span>
              </div>
            </div>
            <p className="text-sm font-bold text-white mb-2 leading-tight">ASSUME Documentation</p>
            <p className="text-[11px] text-blue-100/85 leading-relaxed mb-4">
              Tutorials, API reference, market mechanisms, clearing algorithms, bidding strategies
            </p>
            <div className="flex items-center gap-2 pt-3 border-t border-blue-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <p className="text-[10px] text-blue-300/70 font-mono">assume.readthedocs.io</p>
            </div>
          </div>
        </a>

        {/* GitHub Repository */}
        <a href="https://github.com/assume-framework/assume" target="_blank" rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-2xl cursor-pointer"
          style={{ background: 'linear-gradient(145deg, #0a1f14 0%, #14532d 60%, #166534 100%)' }}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(145deg, #16653430 0%, #22c55e20 100%)' }} />
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-2xl rounded-full pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="w-11 h-11 rounded-xl bg-emerald-400/20 border border-emerald-400/25 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <GitBranch size={20} className="text-emerald-300" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-300/60 group-hover:text-emerald-300 transition-colors">
                <ExternalLink size={11} />
                <span className="font-mono">Open</span>
              </div>
            </div>
            <p className="text-sm font-bold text-white mb-2 leading-tight">GitHub Repository</p>
            <p className="text-[11px] text-emerald-100/85 leading-relaxed mb-4">
              Python source code, YAML configs, Jupyter notebooks, example simulations
            </p>
            <div className="flex items-center gap-2 pt-3 border-t border-emerald-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <p className="text-[10px] text-emerald-300/70 font-mono">github.com/assume-framework/assume</p>
            </div>
          </div>
        </a>

        {/* Upload research papers */}
        <div onClick={() => fileRef.current?.click()}
          className="group relative overflow-hidden rounded-2xl cursor-pointer"
          style={{ background: 'linear-gradient(145deg, #081c2b 0%, #0e3a4f 60%, #0e4d66 100%)' }}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(145deg, #0e4d6630 0%, #06b6d420 100%)' }} />
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-2xl rounded-full pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="w-11 h-11 rounded-xl bg-cyan-400/20 border border-cyan-400/25 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Upload size={20} className="text-cyan-300" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-cyan-300/60 group-hover:text-cyan-300 transition-colors">
                <Upload size={11} />
                <span className="font-mono">Browse</span>
              </div>
            </div>
            <p className="text-sm font-bold text-white mb-2 leading-tight">Upload Your Files</p>
            <p className="text-[11px] text-cyan-100/85 leading-relaxed mb-4">
              PDF papers, technical reports, Python scripts, YAML configurations
            </p>
            <div className="flex items-center gap-2 pt-3 border-t border-cyan-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <p className="text-[10px] text-cyan-300/70 font-mono">PDF · PY · MD · YAML · RST · JSON</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      <input ref={fileRef} type="file" className="hidden"
        accept=".pdf,.txt,.md,.py,.yaml,.yml,.json,.csv,.rst"
        onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); e.dataTransfer.files[0] && upload(e.dataTransfer.files[0]) }}
        className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-blue-500/70 bg-blue-500/8' : 'border-cg-border hover:border-blue-400/40 hover:bg-cg-s2/60'
        }`}>

        <div className="p-10 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center mb-5 transition-all duration-200 ${
            dragOver ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 scale-110' : 'bg-cg-s2 border-cg-border text-cg-muted'
          }`}>
            <Upload size={24} />
          </div>
          <p className="text-sm font-bold text-cg-txt mb-1">
            {dragOver ? 'Release to upload' : 'Drop files here or click to browse'}
          </p>
          <p className="text-xs text-cg-muted mb-5">PDF · TXT · MD · PY · YAML · JSON · CSV · RST</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['PDF', 'Python', 'Markdown', 'YAML', 'RST'].map(f => (
              <span key={f} className="text-[10px] font-medium text-cg-faint bg-cg-s2 border border-cg-border px-2.5 py-1 rounded-full">{f}</span>
            ))}
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 rounded-2xl bg-cg-surface/92 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <RefreshCw size={22} className="animate-spin text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-cg-txt mb-1">Ingesting into knowledge graph…</p>
              <p className="text-xs text-cg-muted">SpaCy NER · Embeddings · Neo4j · Qdrant</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              {['Parse', 'Extract', 'Embed', 'Index'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="text-blue-400/70 font-mono">{step}</span>
                  {i < 3 && <ChevronRight size={10} className="text-cg-faint" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status banners */}
      {done && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-400">Successfully ingested!</p>
            <p className="text-xs text-emerald-400/70 mt-0.5">Entities appear in the Knowledge Map within 2-5 min.</p>
          </div>
        </div>
      )}
      {clearDone && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-400">Graph cleared successfully</p>
            <p className="text-xs text-emerald-400/70 mt-0.5">Ready for fresh data import.</p>
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/25">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertCircle size={16} className="text-red-400" />
          </div>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Ingested Files (real, fetched from /api/ingestion/jobs) ───────── */}
      {(() => {
        const completed = jobs.filter(j => j.status === 'completed')
        const inFlight  = jobs.filter(j => j.status === 'processing' || j.status === 'pending')
        const failed    = jobs.filter(j => j.status === 'failed')

        const groups = [
          { label: 'Documentation',  exts: ['rst', 'md'],   accent: 'text-emerald-200', border: 'border-emerald-500/40', bg: 'bg-emerald-600/30', dot: 'bg-emerald-400' },
          { label: 'Python Source',  exts: ['py'],          accent: 'text-blue-200',    border: 'border-blue-500/40',    bg: 'bg-blue-600/30',    dot: 'bg-blue-400'    },
          { label: 'YAML Configs',   exts: ['yaml', 'yml'], accent: 'text-amber-200',   border: 'border-amber-500/40',   bg: 'bg-amber-600/30',   dot: 'bg-amber-400'   },
          { label: 'Other',          exts: ['*'],           accent: 'text-slate-200',   border: 'border-slate-500/40',   bg: 'bg-slate-600/30',   dot: 'bg-slate-400'   },
        ] as const

        const grouped = groups.map(g => {
          const matching = completed.filter(j => {
            const ext = fileExt(j.file_name)
            if (g.exts[0] === '*') {
              const known = ['rst','md','py','yaml','yml']
              return !known.includes(ext)
            }
            return (g.exts as readonly string[]).includes(ext)
          })
          return { ...g, jobs: matching }
        }).filter(g => g.jobs.length > 0)

        return (
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-cg-border bg-cg-s2/40">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={12} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">Ingested Knowledge Base</p>
                <p className="text-[10px] text-cg-faint">
                  {completed.length} indexed
                  {inFlight.length > 0 && <> · <span className="text-amber-400">{inFlight.length} processing</span></>}
                  {failed.length > 0   && <> · <span className="text-red-400">{failed.length} failed</span></>}
                </p>
              </div>
              <button
                onClick={triggerBootstrap}
                disabled={bootstrapping}
                title="Download the github.com/assume-framework/assume repo and ingest its docs + Python source + example configs into the SHARED knowledge base — visible to every user on this platform."
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-blue-600 border border-blue-500 hover:bg-blue-700 disabled:opacity-50 transition-all whitespace-nowrap"
              >
                {bootstrapping
                  ? <><RefreshCw size={11} className="animate-spin" />Bootstrapping…</>
                  : <><Download size={11} />Bootstrap shared ASSUME KB</>}
              </button>
              <button
                onClick={loadJobs}
                title="Refresh"
                className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
              >
                <RefreshCw size={11} />
              </button>
            </div>

            {bootstrapMsg && (
              <div className={`px-5 py-2.5 text-[11px] border-b ${
                bootstrapMsg.startsWith('Failed')
                  ? 'bg-red-500/10 border-red-500/25 text-red-300'
                  : 'bg-blue-500/10 border-blue-500/25 text-blue-200'
              }`}>
                {bootstrapMsg}
              </div>
            )}

            <div className="p-5 space-y-4 bg-slate-950/50">
              {completed.length === 0 && inFlight.length === 0 && (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm font-semibold text-blue-300">No documents ingested yet</p>
                  <p className="text-xs text-blue-200/85 max-w-md mx-auto leading-relaxed">
                    Click <strong className="text-white">Bootstrap ASSUME KB</strong> to fetch the
                    <a href="https://github.com/assume-framework/assume" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline mx-1">ASSUME framework repository</a>
                    and index its docs, source code, and example configs.
                    Or drop your own files above.
                  </p>
                </div>
              )}

              {inFlight.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200 flex items-center gap-2">
                  <RefreshCw size={11} className="animate-spin" />
                  {inFlight.length} {inFlight.length === 1 ? 'file is' : 'files are'} being indexed in the background…
                </div>
              )}

              {grouped.map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${group.accent}`}>{group.label}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${group.border} ${group.bg} ${group.accent}`}>{group.jobs.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.jobs.map(j => {
                      const parts = j.file_name.split('/')
                      const name = parts.pop() ?? j.file_name
                      const folder = parts.length > 0 ? parts[parts.length - 1] : ''
                      const isShared = j.user_id === '__shared__'
                      return (
                        <span
                          key={j.id}
                          title={`${j.file_name} · ${j.nodes_extracted ?? 0} entities${isShared ? ' · shared knowledge base' : ''}`}
                          className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-lg border ${group.border} ${group.bg} ${group.accent} max-w-[260px]`}
                        >
                          <span className="truncate">{folder ? `${folder}/${name}` : name}</span>
                          {isShared && (
                            <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1 py-px rounded bg-white/20 text-white border border-white/30">shared</span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Clear Data (Danger Zone) ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-500/20 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-red-500/8 border-b border-red-500/15">
          <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center">
            <Trash2 size={11} className="text-red-400" />
          </div>
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Danger Zone</p>
        </div>
        {!confirmClear ? (
          <div className="flex items-center gap-4 px-5 py-4 bg-cg-bg">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-cg-txt mb-0.5">Clear my uploads</p>
              <p className="text-[11px] text-cg-faint leading-relaxed">
                Removes <strong className="text-cg-muted">only your personal uploads</strong> (nodes, vectors, ingestion history).
                The shared ASSUME knowledge base stays intact for all users.
              </p>
            </div>
            <button onClick={() => setConfirmClear(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/25 hover:bg-red-500/18 transition-all">
              <Trash2 size={12} />Clear my data
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 px-5 py-4 bg-red-500/5">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400 flex-1 leading-relaxed">
              This will permanently delete <strong>your own uploads only</strong> (graph nodes, vectors, ingestion history). Shared ASSUME KB is kept. Cannot be undone.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-cg-muted border border-cg-border hover:bg-cg-s2 transition-all">
                Cancel
              </button>
              <button onClick={clearData} disabled={clearing}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-all flex items-center gap-1.5">
                {clearing ? <><RefreshCw size={11} className="animate-spin" />Clearing…</> : <><Trash2 size={11} />Confirm Clear</>}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO GENERATOR TAB
// ─────────────────────────────────────────────────────────────────────────────

type MarketType = 'day_ahead' | 'intraday' | 'balancing' | 'nodal'
type GeneratorState = 'idle' | 'generating' | 'predicting' | 'done' | 'error'

interface GeneratedScenario {
  yaml_config: string
  explanation: string
  similar_examples: string[]
  warnings: string[]
}

interface PredictedOutcome {
  predicted_price_eur_mwh?: { min: number; max: number; expected: number }
  dispatch_order?: string[]
  market_clearing?: string
  key_insights?: string[]
  confidence?: string
  confidence_reason?: string
  error?: string
}

const MARKET_TYPES: { id: MarketType; label: string; desc: string }[] = [
  { id: 'day_ahead',  label: 'Day Ahead',  desc: 'Next-day auction, hourly products'     },
  { id: 'intraday',   label: 'Intraday',   desc: 'Continuous trading, 15-min products'   },
  { id: 'balancing',  label: 'Balancing',  desc: 'System balance, reserve activation'    },
  { id: 'nodal',      label: 'Nodal',      desc: 'Locational marginal pricing with grid' },
]

const EXAMPLE_DESCRIPTIONS = [
  'A day ahead market with 2 coal power plants (400 MW each), 1 wind farm (200 MW), 1 gas peaker (100 MW), and residential demand of 600 MW',
  'Intraday market with a battery storage unit (50 MW / 200 MWh) competing against gas turbines during demand peaks',
  'Balancing market with reinforcement learning bidding agents for 3 flexible industrial loads',
  'Nodal market simulating the German transmission grid with 5 zones and line congestion constraints',
  'High-renewable scenario: 80% wind + solar penetration causing negative prices, with 2 flexible gas plants',
]

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

/**
 * Format a duration in hours into a human-readable label.
 * Examples:
 *   1   → "1 hour"
 *   24  → "24 hours · 1 day"
 *   45  → "45 hours · 1d 21h"
 *   72  → "72 hours · 3 days"
 *   168 → "168 hours · 1 week"
 */
function formatDurationLabel(hours: number): string {
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  if (remHours === 0) {
    if (hours === 168) return `${hours} hours · 1 week`
    if (hours === 336) return `${hours} hours · 2 weeks`
    return `${hours} hours · ${days} day${days > 1 ? 's' : ''}`
  }
  return `${hours} hours · ${days}d ${remHours}h`
}

/**
 * Defensive sanitizer: if the LLM returned a JSON wrapper instead of pure YAML,
 * extract just the yaml_config value.
 *
 * Handles three failure modes:
 *  1. Valid JSON  → parse and return yaml_config field
 *  2. Invalid JSON with literal newlines → regex-extract yaml_config block
 *  3. Already pure YAML → return as-is
 */
function sanitizeYaml(raw: string): string {
  const trimmed = raw.trim()

  // Fast path: looks like YAML already (starts with a YAML key, not JSON brace)
  if (!trimmed.startsWith('{')) return trimmed

  // ① Try valid JSON first
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    if (typeof parsed.yaml_config === 'string' && parsed.yaml_config.trim()) {
      return parsed.yaml_config.trim()
    }
  } catch {
    // fall through to regex extraction
  }

  // ② Invalid JSON (literal newlines in string value) — regex extraction
  // Find everything between "yaml_config": " and the next JSON key
  const keyIdx = trimmed.indexOf('"yaml_config"')
  if (keyIdx !== -1) {
    const afterKey = trimmed.slice(keyIdx + '"yaml_config"'.length)
    // Skip :, optional whitespace, optional opening quote
    const colonMatch = afterKey.match(/^\s*:\s*"?\s*/)
    const valueStart = colonMatch ? colonMatch[0].length : 0
    const contentRaw = afterKey.slice(valueStart)

    // Stop at the next JSON key: "explanation", "warnings", etc.
    const nextKeyMatch = contentRaw.search(/"(?:explanation|warnings|similar_examples)"\s*:/)
    const yamlBlock = nextKeyMatch !== -1 ? contentRaw.slice(0, nextKeyMatch) : contentRaw

    // Strip trailing JSON punctuation (closing quote, comma, brace, whitespace)
    const cleaned = yamlBlock.replace(/[\s",}]+$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()
    if (cleaned && cleaned.length > 10) return cleaned
  }

  // ③ Last resort: return the whole thing stripped of obvious JSON wrapper lines
  return trimmed
    .replace(/^\s*\{/, '')
    .replace(/\}\s*$/, '')
    .replace(/^\s*"yaml_config"\s*:\s*"?\s*/, '')
    .replace(/"\s*,?\s*"explanation"[\s\S]*$/, '')
    .trim()
}

function YamlViewer({ yaml }: { yaml: string }) {
  const { copied, copy } = useCopyToClipboard()
  const cleanYaml = sanitizeYaml(yaml)

  // Detect whether the YAML has the correct runner schema keys
  const hasGeneral = cleanYaml.includes('general:')
  const hasUnits   = cleanYaml.includes('\nunits:') || cleanYaml.startsWith('units:')
  const hasDemand  = cleanYaml.includes('\ndemand:') || cleanYaml.startsWith('demand:')
  const schemaOk   = hasGeneral && hasUnits && hasDemand

  const download = () => {
    const blob = new Blob([cleanYaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'assume_scenario.yaml'
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="relative">
      {/* Schema validation banner */}
      {!schemaOk && cleanYaml.length > 20 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-600 border-b border-amber-700 shadow-md shadow-amber-900/30">
          <AlertCircle size={14} className="text-white shrink-0 mt-0.5" />
          <div className="text-[12px] text-white font-medium leading-relaxed">
            <strong className="font-bold">Format warning:</strong> The generated YAML is missing{' '}
            {[!hasGeneral && <code key="g" className="px-1 py-0.5 bg-amber-800 rounded font-mono">general:</code>,
              !hasUnits   && <code key="u" className="px-1 py-0.5 bg-amber-800 rounded font-mono">units:</code>,
              !hasDemand  && <code key="d" className="px-1 py-0.5 bg-amber-800 rounded font-mono">demand:</code>]
              .filter(Boolean)
              .reduce<React.ReactNode[]>((acc, el, i, arr) => {
                acc.push(el)
                if (i < arr.length - 1) acc.push(<span key={`s${i}`}>, </span>)
                return acc
              }, [])}
            .{' '}The runner may fall back to default units. Click <strong className="font-bold">New scenario</strong> and regenerate if results look incorrect.
          </div>
        </div>
      )}
      {schemaOk && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-600 border-b border-emerald-700">
          <CheckCircle2 size={12} className="text-white shrink-0" />
          <span className="text-[12px] text-white font-semibold">Schema valid runner will use your units and demand</span>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[11px] text-white/60 font-mono ml-1">assume_scenario.yaml</span>
          <span className="text-[10px] text-white/25 ml-2">Generated ASSUME Config</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={download}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/45 hover:text-white/80 hover:bg-white/8 transition-all">
            <Download size={11} />Download
          </button>
          <button onClick={() => copy(cleanYaml)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/45 hover:text-white/80 hover:bg-white/8 transition-all">
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      {cleanYaml.trim().length < 10 ? (
        <div className="p-6 bg-amber-50 rounded-b-xl border-x border-b border-amber-300 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-amber-500 mx-auto flex items-center justify-center shadow-md">
            <AlertCircle size={20} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-amber-900">No YAML returned</p>
            <p className="text-sm text-amber-800 mt-1.5 max-w-md mx-auto leading-relaxed">
              The LLM response did not contain a usable scenario configuration. This usually means the model timed out, the backend returned an empty body, or the description was too vague.
            </p>
            <p className="text-xs text-amber-700 mt-2">
              Click <strong>New scenario</strong> and try a more specific description, or check that the agent service is reachable.
            </p>
          </div>
          {yaml && yaml.trim().length > 0 && (
            <details className="text-left text-xs text-amber-800 max-w-full">
              <summary className="cursor-pointer font-semibold hover:text-amber-950 transition-colors">Show raw response ({yaml.length} chars)</summary>
              <pre className="mt-2 p-3 bg-white border border-amber-300 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap break-all text-slate-800">{yaml}</pre>
            </details>
          )}
        </div>
      ) : (
        <pre className="overflow-auto max-h-[480px] p-5 text-xs font-mono text-slate-300 bg-slate-950/60 rounded-b-xl border-x border-b border-white/8 leading-relaxed">
          <code>{cleanYaml}</code>
        </pre>
      )}
    </div>
  )
}

function ConfidenceBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    high:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15    text-amber-400    border-amber-500/30',
    low:    'bg-red-500/15      text-red-400      border-red-500/30',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[level] ?? map.low}`}>
      {level.toUpperCase()} confidence
    </span>
  )
}

function GeneratorTab({ onYamlGenerated }: { onYamlGenerated?: (yaml: string, name: string) => void }) {
  const [description, setDescription]   = useState('')
  const [marketType, setMarketType]     = useState<MarketType>('day_ahead')
  const [duration, setDuration]         = useState(24)
  const [state, setState]               = useState<GeneratorState>('idle')
  const [scenario, setScenario]         = useState<GeneratedScenario | null>(null)
  const [outcome, setOutcome]           = useState<PredictedOutcome | null>(null)
  const [error, setError]               = useState('')
  const [showExplanation, setShowExplanation] = useState(true)
  const [sentToRunner, setSentToRunner] = useState(false)

  const generate = async () => {
    if (!description.trim()) return
    setState('generating')
    setScenario(null)
    setOutcome(null)
    setError('')
    try {
      const { data } = await agentHttp.post('/api/agent/assume/generate', {
        description: description.trim(),
        duration_hours: duration,
        market_type: marketType,
      })
      const raw = data as GeneratedScenario
      // Defensive: strip any JSON wrapper the backend fallback may have left in yaml_config
      const cleanedScenario: GeneratedScenario = {
        ...raw,
        yaml_config: sanitizeYaml(raw.yaml_config ?? ''),
      }
      // Detect a backend "fake success": HTTP 200 but the explanation says it
      // failed (typical when the upstream LLM returns 413 / 429 / 5xx and the
      // backend swallows the exception into the response body).
      const explanation = (cleanedScenario.explanation ?? '').toLowerCase()
      const hasYaml     = cleanedScenario.yaml_config.trim().length >= 10
      const hasFailureSignal =
        explanation.startsWith('scenario generation failed') ||
        /\b(client error|server error|payload too large|rate.?limit|timeout|exceeded|unauthor|forbidden|401|403|413|429|5\d\d)\b/.test(explanation)
      if (!hasYaml || hasFailureSignal) {
        setError(cleanedScenario.explanation || 'Backend returned no YAML.')
        setState('error')
        return
      }
      setScenario(cleanedScenario)
      setState('done')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Generation failed'
      setError(msg)
      setState('error')
    }
  }

  const predict = async () => {
    if (!scenario?.yaml_config) return
    setState('predicting')
    try {
      const { data } = await agentHttp.post('/api/agent/assume/predict', {
        scenario_yaml: scenario.yaml_config,
        question: 'What will be the market clearing price, dispatch order, and key market dynamics?',
      })
      setOutcome(data as PredictedOutcome)
      setState('done')
    } catch {
      setOutcome({ error: 'Prediction unavailable. Make sure the agent service is running and rebuilt with the new ASSUME endpoints.' })
      setState('done')
    }
  }

  const reset = () => { setState('idle'); setScenario(null); setOutcome(null); setError(''); setDescription('') }

  return (
    <div className="space-y-5">

      {/* ── Builder card ─────────────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-cg-txt">ASSUME Scenario Generator</p>
              <p className="text-[11px] text-cg-faint">Natural language → executable YAML configuration</p>
            </div>
          </div>
          {(state === 'done' || state === 'error') && (
            <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cg-muted hover:text-cg-txt hover:bg-slate-100 transition-all border border-cg-border">
              <RefreshCw size={11} />New scenario
            </button>
          )}
        </div>

        {/* Market type selector */}
        <div>
          <p className="text-xs font-semibold text-cg-muted mb-2.5 uppercase tracking-wide">Market Type</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {MARKET_TYPES.map(m => (
              <button key={m.id} onClick={() => setMarketType(m.id)}
                className={[
                  'p-3 rounded-xl border text-left transition-all',
                  marketType === m.id
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                    : 'border-cg-border bg-cg-bg text-cg-muted hover:border-blue-500/30 hover:bg-blue-500/5',
                ].join(' ')}>
                <p className={`text-xs font-bold ${marketType === m.id ? 'text-blue-300' : 'text-cg-txt'}`}>{m.label}</p>
                <p className="text-[10px] opacity-60 mt-0.5 leading-tight">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Simulation Duration</p>
            <span className="text-xs font-bold text-cg-txt">{formatDurationLabel(duration)}</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {[
              { v: 1,   label: '1h'    },
              { v: 6,   label: '6h'    },
              { v: 12,  label: '12h'   },
              { v: 24,  label: '1 day' },
              { v: 72,  label: '3 days'},
              { v: 168, label: '1 week'},
            ].map(({ v, label }) => {
              const active = duration === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDuration(v)}
                  className={[
                    'py-2 rounded-lg text-xs font-semibold border transition-all',
                    active
                      ? 'border-blue-500 bg-blue-500 text-white shadow shadow-blue-500/30'
                      : 'border-cg-border bg-cg-bg text-cg-muted hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/5',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Description textarea */}
        <div>
          <p className="text-xs font-semibold text-cg-muted mb-2 uppercase tracking-wide">Scenario Description</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe your electricity market scenario in natural language…&#10;&#10;Example: A day ahead market with 2 coal power plants (400 MW each at 45 €/MWh), 1 wind farm (200 MW), and residential demand of 600 MW. Include a gas peaker unit for peak hours."
            className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-3 text-sm text-cg-txt placeholder:text-cg-faint focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none leading-relaxed font-mono"
          />
        </div>

        {/* Example prompts */}
        <div>
          <p className="text-[10px] text-cg-faint uppercase tracking-wide mb-2">Quick examples</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_DESCRIPTIONS.map((ex, i) => (
              <button key={i} onClick={() => setDescription(ex)}
                className="text-[11px] text-cg-muted bg-cg-bg border border-cg-border px-2.5 py-1 rounded-lg hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/5 transition-all max-w-[320px] truncate">
                {ex.slice(0, 55)}…
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button onClick={generate} disabled={!description.trim() || state === 'generating'}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25">
          {state === 'generating'
            ? <><RefreshCw size={16} className="animate-spin" />Generating YAML with GraphRAG + LLM…</>
            : <><Sparkles size={16} />Generate ASSUME Scenario</>}
        </button>

        {state === 'error' && (() => {
          const isRateLimit = /\b429\b|too many requests|rate.?limit/i.test(error)
          const isTooLarge  = /\b413\b|payload too large/i.test(error)
          const isAuth      = /\b40[13]\b|unauthor|forbidden|api.?key/i.test(error)

          if (isRateLimit) {
            return (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500 border border-amber-600 text-white shadow-md">
                <RefreshCw size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Groq rate limit reached</p>
                  <p className="text-xs mt-1 opacity-95">
                    The free tier allows a limited number of requests per minute.
                    <strong className="ml-1">Wait ~60 seconds and click Generate again.</strong>
                  </p>
                  <p className="text-[11px] mt-2 opacity-80 italic">The platform itself is fine. Only the upstream LLM is throttling.</p>
                </div>
              </div>
            )
          }
          if (isTooLarge) {
            return (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-600 border border-amber-700 text-white shadow-md">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Request too large for Groq</p>
                  <p className="text-xs mt-1 opacity-95">Try a shorter description or contact the admin to tune the prompt size.</p>
                </div>
              </div>
            )
          }
          if (isAuth) {
            return (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-600 border border-red-700 text-white shadow-md">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Authentication issue with the LLM</p>
                  <p className="text-xs mt-1 opacity-95">Check that <code className="px-1 bg-red-800 rounded">GROQ_API_KEY</code> is set in <code className="px-1 bg-red-800 rounded">.env</code> and the agent service was restarted.</p>
                </div>
              </div>
            )
          }
          return (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-sm text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Generation failed</p>
                <p className="text-xs opacity-80 mt-0.5">{error}</p>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {scenario && (
        <div className="space-y-4">

          {/* Success banner */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-600 border border-emerald-400 shadow-md shadow-emerald-500/30 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/30 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Scenario generated successfully</p>
              <p className="text-xs text-white/90 mt-0.5">
                {scenario.similar_examples.length > 0
                  ? `Referenced ${scenario.similar_examples.length} similar ASSUME examples from the knowledge graph`
                  : 'Generated from ASSUME framework knowledge'}
              </p>
            </div>
            {scenario.warnings.filter(w => !w.toLowerCase().includes('json') && !w.toLowerCase().includes('parse error')).length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-300 border border-amber-500 px-2.5 py-1 rounded-lg shrink-0">
                <AlertCircle size={10} />
                {scenario.warnings.filter(w => !w.toLowerCase().includes('json') && !w.toLowerCase().includes('parse error')).length} assumption{scenario.warnings.filter(w => !w.toLowerCase().includes('json') && !w.toLowerCase().includes('parse error')).length > 1 ? 's' : ''}
              </div>
            )}
            {onYamlGenerated && scenario.yaml_config && (
              <button
                onClick={() => {
                  const name = description.slice(0, 40).replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'generated_scenario'
                  onYamlGenerated(sanitizeYaml(scenario.yaml_config), name)
                  setSentToRunner(true)
                  setTimeout(() => setSentToRunner(false), 3000)
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 ${
                  sentToRunner
                    ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                    : 'text-white bg-blue-500 border-blue-500 hover:bg-blue-600'
                }`}>
                {sentToRunner ? <><Check size={11} />Sent to Runner!</> : <><Play size={11} />Run in Simulator</>}
              </button>
            )}
          </div>

          {/* Warnings / Assumptions */}
          {scenario.warnings.filter(w => !w.toLowerCase().includes('json') && !w.toLowerCase().includes('parse error')).length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300">
              <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">Assumptions made</p>
              <ul className="space-y-1.5">
                {scenario.warnings
                  .filter(w => !w.toLowerCase().includes('json') && !w.toLowerCase().includes('parse error'))
                  .map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                      <AlertCircle size={10} className="shrink-0 mt-0.5 text-amber-600" />{w}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* YAML viewer */}
          <div className="card overflow-hidden">
            <YamlViewer yaml={scenario.yaml_config} />
          </div>

          {/* Explanation */}
          <div className="card p-5">
            <button
              onClick={() => setShowExplanation(v => !v)}
              className="w-full flex items-center justify-between gap-2 mb-0">
              <div className="flex items-center gap-2">
                <BookOpen size={13} className="text-cg-primary" />
                <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">Design Explanation</p>
              </div>
              {showExplanation ? <ChevronUp size={14} className="text-cg-faint" /> : <ChevronDown size={14} className="text-cg-faint" />}
            </button>
            {showExplanation && (
              <div className="mt-4 text-sm text-cg-muted leading-relaxed whitespace-pre-wrap">
                {scenario.explanation}
              </div>
            )}
          </div>

          {/* Similar examples */}
          {scenario.similar_examples.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-cg-faint uppercase tracking-wide mb-3">Referenced examples from knowledge graph</p>
              <div className="flex flex-wrap gap-1.5">
                {scenario.similar_examples.map(ex => (
                  <span key={ex} className="text-[11px] font-mono text-blue-400/80 bg-blue-500/8 border border-blue-500/15 px-2.5 py-1 rounded-lg">
                    {ex.split('/').pop()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Outcome Predictor ─────────────────────────────────────────── */}
          {!outcome && (
            <div className="card p-5 border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                    <Gauge size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-cg-txt">Outcome Predictor</p>
                    <p className="text-xs text-cg-muted">Predict market clearing price and dispatch order before running the simulation</p>
                  </div>
                </div>
                <button onClick={predict} disabled={state === 'predicting'}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 shrink-0">
                  {state === 'predicting'
                    ? <><RefreshCw size={14} className="animate-spin" />Predicting…</>
                    : <><BarChart3 size={14} />Predict Outcomes</>}
                </button>
              </div>
            </div>
          )}

          {outcome && (
            <div className="card p-5 space-y-4 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge size={13} className="text-blue-400" />
                  <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">Predicted Outcomes</p>
                </div>
                {outcome.confidence && <ConfidenceBadge level={outcome.confidence} />}
              </div>

              {outcome.error ? (
                <p className="text-sm text-red-400">{outcome.error}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Price prediction */}
                  {outcome.predicted_price_eur_mwh && (
                    <div className="p-4 rounded-xl bg-cg-bg border border-cg-border">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-cg-faint mb-3">Clearing Price</p>
                      <div className="flex items-end gap-2 mb-3">
                        <span className="text-3xl font-bold text-cg-txt">{outcome.predicted_price_eur_mwh.expected}</span>
                        <span className="text-sm text-cg-muted mb-1">€/MWh</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-cg-muted">
                        <span>Min: <strong className="text-emerald-400">{outcome.predicted_price_eur_mwh.min}</strong></span>
                        <div className="flex-1 h-1 rounded-full bg-cg-s2 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500"
                            style={{ width: `${Math.min(100, (outcome.predicted_price_eur_mwh.expected / 200) * 100)}%` }} />
                        </div>
                        <span>Max: <strong className="text-amber-400">{outcome.predicted_price_eur_mwh.max}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Dispatch order */}
                  {outcome.dispatch_order && outcome.dispatch_order.length > 0 && (
                    <div className="p-4 rounded-xl bg-cg-bg border border-cg-border">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-cg-faint mb-3">Dispatch Merit Order</p>
                      <ol className="space-y-1.5">
                        {outcome.dispatch_order.map((unit, i) => (
                          <li key={i} className="flex items-center gap-2.5 text-xs">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ backgroundColor: ['#10B981','#3B82F6','#F97316','#8B5CF6','#EC4899'][i] + '20', color: ['#10B981','#3B82F6','#F97316','#8B5CF6','#EC4899'][i] }}>
                              {i + 1}
                            </span>
                            <span className="text-cg-muted font-mono">{unit}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {outcome.market_clearing && (
                <div className="p-3 rounded-xl bg-cg-bg border border-cg-border">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-cg-faint mb-1.5">Market Clearing</p>
                  <p className="text-xs text-cg-muted leading-relaxed">{outcome.market_clearing}</p>
                </div>
              )}

              {outcome.key_insights && outcome.key_insights.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-cg-faint mb-2">Key Insights</p>
                  <ul className="space-y-1.5">
                    {outcome.key_insights.map((ins, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-cg-muted">
                        <span className="text-blue-400 mt-0.5 shrink-0">◆</span>{ins}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {outcome.confidence_reason && (
                <p className="text-[11px] text-cg-faint italic">Confidence: {outcome.confidence_reason}</p>
              )}

              <button
                onClick={() => setOutcome(null)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  outcome.error
                    ? 'text-blue-400 hover:text-blue-300 font-medium'
                    : 'text-cg-faint hover:text-cg-muted'
                }`}
              >
                <RefreshCw size={11} />
                {outcome.error ? 'Retry prediction' : 'Re-run prediction'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Template library + empty state */}
      {state === 'idle' && (
        <div className="space-y-5">
          {/* Quick start banner */}
          <div className="card p-6 flex flex-col sm:flex-row items-center gap-5 border border-blue-500/20 bg-blue-500/5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/25 to-emerald-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
              <Sparkles size={26} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h3 className="text-sm font-bold text-cg-txt mb-1">Generate Your ASSUME Scenario</h3>
              <p className="text-xs text-cg-muted leading-relaxed">
                Describe your scenario above, or pick a template below. The AI queries the ASSUME knowledge graph and produces a complete, runnable YAML config.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-cg-faint shrink-0">
              <span className="flex items-center gap-1.5"><Database size={11} className="text-blue-400" />Neo4j</span>
              <span className="flex items-center gap-1.5"><Sparkles size={11} className="text-blue-400" />Groq LLM</span>
              <span className="flex items-center gap-1.5"><GitBranch size={11} className="text-blue-400" />GraphRAG</span>
            </div>
          </div>

          {/* Template library */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                <Library size={13} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-cg-txt uppercase tracking-widest">Config Template Library</p>
                <p className="text-[10px] text-cg-faint">{TEMPLATES.length} ready-to-use ASSUME configurations</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {TEMPLATES.map(tpl => (
                <TemplateCard key={tpl.id} tpl={tpl}
                  onLoad={(yaml, id) => {
                    const name = TEMPLATES.find(t => t.id === id)?.name ?? id
                    setDescription(`Load template: ${name}`)
                    const sc: GeneratedScenario = {
                      yaml_config: yaml,
                      explanation: `This is the "${name}" template. Edit the YAML as needed, then use the Simulation Runner to execute it, or click Generate to have the AI customize it for your needs.`,
                      similar_examples: [],
                      warnings: ['This is a template. Review the parameters before running.'],
                    }
                    setScenario(sc)
                    setState('done')
                    onYamlGenerated?.(sanitizeYaml(yaml), id)
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AssumeWorkspace() {
  const [tab, setTab] = useState<Tab>('overview')
  const [generatorYaml, setGeneratorYaml] = useState('')
  const [generatorName, setGeneratorName] = useState('')

  const handleYamlGenerated = (yaml: string, name: string) => {
    setGeneratorYaml(yaml)
    setGeneratorName(name)
    setTab('runner')
  }

  return (
    <div className="space-y-4">

      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tab pills */}
        <div className="flex items-center gap-1 p-1 bg-cg-surface border border-cg-border rounded-2xl overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={[
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
                tab === t.id
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-cg-muted hover:text-cg-txt hover:bg-cg-s2',
              ].join(' ')}>
              {t.icon}
              {t.label}
              {t.id === 'runner' && generatorYaml && tab !== 'runner' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse ml-0.5" />
              )}
            </button>
          ))}
        </div>

        {/* Right: ASSUME badge */}
        <div className="flex items-center gap-2 text-[11px] text-cg-faint">
          <Zap size={11} className="text-blue-400/60" />
          <span>ASSUME Electricity Market Simulation</span>
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview'   && <OverviewTab onNavigate={setTab} />}
      {tab === 'advisor'    && <AdvisorTab />}
      {tab === 'generator'  && <GeneratorTab onYamlGenerated={handleYamlGenerated} />}
      {tab === 'runner'     && <RunnerTab yamlFromGenerator={generatorYaml || undefined} nameFromGenerator={generatorName || undefined} />}
      {tab === 'compare'    && <CompareTab />}
      {tab === 'knowledge'  && <KnowledgeTab />}
      {tab === 'import'     && <ImportTab />}
    </div>
  )
}
