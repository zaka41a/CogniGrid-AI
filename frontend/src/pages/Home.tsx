import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, GitBranch, Upload, Bot,
  MessageSquare, Zap, Database, Globe, CheckCircle,
  Github, Twitter, Linkedin, ChevronRight, Cpu, Network,
} from 'lucide-react'

/* ── Brand ──────────────────────────────────────────────────────────────────── */
function Brand({ className = 'text-sm' }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-white">CogniGrid</span>
      <span style={{ color: '#10B981' }}> AI</span>
    </span>
  )
}

/* ── Floating orbs (reused from Login/Register) ─────────────────────────────── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-500/12 blur-3xl anim-float" />
      <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-indigo-500/15 blur-3xl anim-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full bg-blue-400/8 blur-3xl anim-float" style={{ animationDelay: '3s' }} />
      <div className="absolute top-2/3 left-1/4 w-[250px] h-[250px] rounded-full bg-emerald-500/8 blur-3xl anim-float" style={{ animationDelay: '2s' }} />
    </div>
  )
}

/* ── Hero animated demo ─────────────────────────────────────────────────────── */
function UploadPanel() {
  const files = [
    { name: 'assume_docs_v0.4.rst',   type: 'RST',  color: '#10B981', pct: 100 },
    { name: 'market_config.yaml',     type: 'YAML', color: '#F59E0B', pct: 82  },
    { name: 'bidding_agents.py',      type: 'PY',   color: '#3B82F6', pct: 61  },
    { name: 'grid_topology.json',     type: 'JSON', color: '#8B5CF6', pct: 34  },
  ]
  return (
    <div>
      <p className="text-[11px] font-semibold text-blue-300/70 uppercase tracking-widest mb-3">
        Ingesting ASSUME knowledge base
      </p>
      <div className="space-y-2">
        {files.map((f, i) => (
          <div
            key={f.name}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 anim-slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div
              className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: f.color }}
            >
              {f.type}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">{f.name}</p>
              <div className="h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${f.pct}%`, background: `linear-gradient(90deg, ${f.color}, ${f.color}bb)` }}
                />
              </div>
            </div>
            {f.pct === 100 && <CheckCircle size={14} style={{ color: '#10B981' }} className="shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function GraphPanel() {
  const nodes = [
    { id: 'c', x: 155, y: 68,  line1: 'Tesla',    line2: 'Company',    color: '#10B981', r: 32 },
    { id: 'a', x: 52,  y: 160, line1: 'Elon Musk', line2: 'Person',    color: '#3B82F6', r: 27 },
    { id: 'b', x: 258, y: 160, line1: 'EV Market', line2: 'Concept',   color: '#0D9488', r: 27 },
    { id: 'd', x: 78,  y: 248, line1: 'SpaceX',    line2: 'Company',   color: '#6366F1', r: 24 },
    { id: 'e', x: 230, y: 248, line1: 'Battery',   line2: 'Technology', color: '#F59E0B', r: 24 },
  ]
  const edges = [
    { f: 'c', t: 'a', label: 'CEO' },
    { f: 'c', t: 'b', label: 'leads' },
    { f: 'a', t: 'd', label: 'founded' },
    { f: 'c', t: 'e', label: 'develops' },
    { f: 'b', t: 'e', label: 'requires' },
  ]
  const nm = Object.fromEntries(nodes.map(n => [n.id, n]))
  return (
    <div>
      <p className="text-[11px] font-semibold text-blue-300/70 uppercase tracking-widest mb-2">
        48,291 nodes · 127,043 edges
      </p>
      <svg viewBox="0 0 310 290" className="w-full" style={{ maxHeight: 228 }}>
        <defs>
          <marker id="arrow-h" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,255,255,0.2)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const f = nm[e.f], t = nm[e.t]
          const dx = t.x - f.x, dy = t.y - f.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const x1 = f.x + (dx / dist) * f.r
          const y1 = f.y + (dy / dist) * f.r
          const x2 = t.x - (dx / dist) * (t.r + 4)
          const y2 = t.y - (dy / dist) * (t.r + 4)
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
          return (
            <g key={i} className="anim-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
                strokeDasharray="4 3" markerEnd="url(#arrow-h)" />
              <rect x={mx - 18} y={my - 8} width={36} height={13} rx="4"
                fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
              <text x={mx} y={my + 0.5} textAnchor="middle" dominantBaseline="middle"
                fontSize="7" fill="rgba(255,255,255,0.5)" fontWeight="600">{e.label}</text>
            </g>
          )
        })}
        {nodes.map((n, i) => (
          <g key={n.id} className="anim-scale-in"
            style={{ animationDelay: `${i * 0.08}s`, transformOrigin: `${n.x}px ${n.y}px` }}>
            <circle cx={n.x} cy={n.y} r={n.r + 5} fill={`${n.color}08`} />
            <circle cx={n.x} cy={n.y} r={n.r} fill={`${n.color}18`} stroke={n.color} strokeWidth="1.8" />
            <text x={n.x} y={n.y - 4} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fontWeight="700" fill={n.color}>{n.line1}</text>
            <text x={n.x} y={n.y + 8} textAnchor="middle" dominantBaseline="middle"
              fontSize="6.5" fill="rgba(255,255,255,0.4)">{n.line2}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function ChatPanel() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm text-xs text-white leading-relaxed"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
          Who are Tesla's main competitors in the EV market?
        </div>
      </div>
      <div className="flex gap-2 items-start">
        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold mt-0.5"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          AI
        </div>
        <div className="flex-1 px-3 py-2.5 rounded-2xl rounded-tl-sm bg-white/8 border border-white/15 text-xs text-white/80 leading-relaxed">
          Based on{' '}
          <span className="font-semibold text-blue-300">12 documents</span>{' '}
          and{' '}
          <span className="font-semibold text-emerald-400">847 graph nodes</span>:
          <br /><br />
          <strong className="text-white">BYD</strong> surpassed Tesla in EV deliveries in Q4 2024.
          Other key rivals include <strong className="text-white">Rivian</strong>, <strong className="text-white">Lucid</strong>, and <strong className="text-white">NIO</strong>.
          <span className="inline-block w-0.5 h-3.5 bg-blue-400 ml-0.5 align-text-bottom anim-blink" />
        </div>
      </div>
      <div className="flex gap-1 pl-8 flex-wrap">
        {['Report Q4 2024', 'EV Analysis', 'Market Data'].map(s => (
          <span key={s} className="px-2 py-0.5 rounded-full text-[10px] border border-white/15 text-white/40 bg-white/5">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

function AgentPanel() {
  const steps = [
    { label: 'Search knowledge base for battery research', done: true },
    { label: 'Traverse graph: Technology → Company → Patent', done: true },
    { label: 'Synthesize findings across 34 documents', active: true },
    { label: 'Generate final structured answer', done: false },
  ]
  return (
    <div>
      <div className="px-3 py-2 rounded-xl text-xs mb-3 border"
        style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.25)', color: '#93C5FD' }}>
        <strong>Query:</strong> Summarize all research on solid-state battery technology
      </div>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={s.label}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 anim-slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
              style={s.done
                ? { background: 'rgba(16,185,129,0.15)', border: '1.5px solid #10B981' }
                : s.active
                  ? { background: 'rgba(59,130,246,0.15)', border: '1.5px solid #3B82F6' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.15)' }
              }>
              {s.done   && <CheckCircle size={11} style={{ color: '#10B981' }} />}
              {s.active && <div className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />}
            </div>
            <span className={`text-xs ${!s.done && !s.active ? 'text-white/25' : 'text-white/75'}`}>
              {s.label}
            </span>
            {s.active && (
              <div className="ml-auto flex gap-0.5">
                {[0, 1, 2].map(d => (
                  <div key={d} className="typing-dot" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AssumePanel() {
  const lines = [
    { k: 'general:', v: '', indent: 0, color: '#94A3B8' },
    { k: '  scenario_name:', v: ' winter_peak_24h', indent: 1, color: '#10B981' },
    { k: '  start_date:', v: ' "2024-01-15 00:00"', indent: 1, color: '#F59E0B' },
    { k: '  time_step:', v: ' "1h"', indent: 1, color: '#F59E0B' },
    { k: 'units:', v: '', indent: 0, color: '#94A3B8' },
    { k: '  coal_base:', v: '', indent: 1, color: '#60A5FA' },
    { k: '    technology:', v: ' power_plant', indent: 2, color: '#C4B5FD' },
    { k: '    fuel_type:', v: ' coal', indent: 2, color: '#C4B5FD' },
    { k: '    max_power:', v: ' 400', indent: 2, color: '#FCD34D' },
    { k: '  wind_farm:', v: '', indent: 1, color: '#34D399' },
    { k: '    fuel_type:', v: ' wind', indent: 2, color: '#C4B5FD' },
    { k: '    max_power:', v: ' 200', indent: 2, color: '#FCD34D' },
    { k: 'demand:', v: '', indent: 0, color: '#94A3B8' },
    { k: '  demand_1:', v: '', indent: 1, color: '#FB923C' },
    { k: '    max_power:', v: ' 600', indent: 2, color: '#FCD34D' },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-widest">
          AI generated YAML config
        </p>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
          Schema valid
        </span>
      </div>
      <div className="rounded-xl bg-slate-950/80 border border-white/8 p-3 overflow-hidden">
        <div className="space-y-0.5">
          {lines.map((l, i) => (
            <div key={i} className="flex anim-slide-up text-[10px] font-mono leading-[1.6]"
              style={{ animationDelay: `${i * 0.04}s` }}>
              <span style={{ color: l.color }}>{l.k}</span>
              <span style={{ color: '#E2E8F0' }}>{l.v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 anim-shimmer" style={{ width: '72%' }} />
        </div>
        <span className="text-[10px] text-emerald-400/70 font-mono shrink-0">Simulating…</span>
      </div>
    </div>
  )
}

function HeroDemo() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % 5), 3800)
    return () => clearInterval(t)
  }, [])

  const tabs = [
    { label: 'Ingest',   color: '#3B82F6', icon: <Upload        size={12} /> },
    { label: 'Graph',    color: '#10B981', icon: <GitBranch     size={12} /> },
    { label: 'GraphRAG', color: '#0D9488', icon: <MessageSquare size={12} /> },
    { label: 'AI Agent', color: '#6366F1', icon: <Bot           size={12} /> },
    { label: 'ASSUME',   color: '#10B981', icon: <Zap           size={12} /> },
  ]

  return (
    <div className="rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-sm shadow-2xl">
      {/* Stage tabs */}
      <div className="flex border-b border-white/10">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2"
            style={active === i
              ? { color: t.color, borderColor: t.color, background: `${t.color}15` }
              : { color: 'rgba(255,255,255,0.35)', borderColor: 'transparent', background: 'transparent' }
            }
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="p-5 min-h-[252px]">
        {active === 0 && <UploadPanel />}
        {active === 1 && <GraphPanel />}
        {active === 2 && <ChatPanel />}
        {active === 3 && <AgentPanel />}
        {active === 4 && <AssumePanel />}
      </div>

      {/* Progress dots */}
      <div className="px-5 pb-4 flex justify-center gap-2">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="h-1.5 rounded-full transition-all duration-400"
            style={{ width: active === i ? 28 : 6, background: active === i ? t.color : 'rgba(255,255,255,0.15)' }}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Data ─────────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Upload size={22} />,
    color: '#3B82F6',
    title: 'Universal Ingestion',
    desc: 'Upload PDF, DOCX, CSV, Excel, JSON, XML and images. Our pipeline extracts entities and relations automatically.',
    bullets: ['50+ file formats', 'Async processing', 'Real-time progress'],
  },
  {
    icon: <GitBranch size={22} />,
    color: '#10B981',
    title: 'Knowledge Graph',
    desc: 'Powered by Neo4j. Every entity becomes a node, every relation an edge. Explore your data like never before.',
    bullets: ['Neo4j powered', 'Visual explorer', 'Cypher queries'],
  },
  {
    icon: <MessageSquare size={22} />,
    color: '#0D9488',
    title: 'GraphRAG Chat',
    desc: 'Ask questions in natural language. Get precise answers backed by your documents and graph context.',
    bullets: ['Semantic search', 'Graph-enriched context', 'Source citations'],
  },
  {
    icon: <Cpu size={22} />,
    color: '#6366F1',
    title: 'AI Engine',
    desc: 'Document similarity, clustering, knowledge gap detection. Uncover patterns hidden in your data.',
    bullets: ['K-Means clustering', 'Document similarity', 'Knowledge gaps'],
  },
  {
    icon: <Bot size={22} />,
    color: '#F59E0B',
    title: 'AI Agent',
    desc: 'An autonomous ReAct agent with access to your entire knowledge base. Think, search, and answer.',
    bullets: ['ReAct reasoning', 'Tool use', 'Multi-LLM support'],
  },
  {
    icon: <Zap size={22} />,
    color: '#10B981',
    title: 'ASSUME Workspace',
    desc: 'Generate, run, and compare electricity market simulations. AI creates valid ASSUME YAML configs from natural language descriptions.',
    bullets: ['AI scenario generation', 'ASSUME v0.4 framework', 'Compare scenarios'],
  },
]

const STATS = [
  { value: '50+',  label: 'File formats',     icon: <Database size={18} /> },
  { value: '6',    label: 'AI microservices',  icon: <Cpu      size={18} /> },
  { value: '100%', label: 'Open architecture', icon: <Globe    size={18} /> },
  { value: '< 2s', label: 'Query response',    icon: <Zap      size={18} /> },
]

const STEPS = [
  {
    n: '01', color: '#3B82F6', gradient: 'from-blue-600 to-blue-800',
    icon: <Upload size={18} />,
    title: 'Upload your files',
    desc: 'Drag and drop any document. PDF, spreadsheet, image, or data file. Our intelligent parser handles structure, tables, images, and free text automatically.',
    bullets: ['50+ supported file formats', 'OCR for scanned documents and images', 'Async processing with real-time status', 'Automatic entity and relation extraction'],
  },
  {
    n: '02', color: '#10B981', gradient: 'from-emerald-600 to-emerald-800',
    icon: <GitBranch size={18} />,
    title: 'Explore the graph',
    desc: 'Watch entities and relations materialize in real-time. Every entity becomes a node, every relation an edge. Zoom, filter, and traverse your knowledge network visually.',
    bullets: ['Neo4j-powered graph database', 'Visual interactive explorer', 'Multi-hop relation traversal', 'Full-text and semantic search'],
  },
  {
    n: '03', color: '#0D9488', gradient: 'from-teal-600 to-teal-800',
    icon: <MessageSquare size={18} />,
    title: 'Chat and query',
    desc: 'Ask complex questions across all your documents. The AI finds answers using both vector similarity and graph context, giving you precise, cited, multi-hop reasoning.',
    bullets: ['GraphRAG combines vector and graph search', 'Source citations for every answer', 'AI Agent for complex multi-step reasoning', 'Multi-LLM: OpenAI, Anthropic, Ollama'],
  },
]

/* ── Component ────────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-8 h-8" />
            <Brand />
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-white/50">
            {['Features', 'How it Works'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="hover:text-white/90 transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-1.5 text-sm font-medium text-white/50 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold
                bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-900/40
                hover:opacity-90 transition-all"
            >
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        <FloatingOrbs />

        <div className="max-w-7xl mx-auto px-6 pt-16 pb-20 relative w-full">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Left — text */}
            <div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6 anim-slide-up d1 text-white">
                Turn documents into a{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-400">
                  Living Knowledge
                </span>
                <br />Graph
              </h1>

              <p className="text-lg text-slate-300/80 max-w-lg mb-8 leading-relaxed anim-slide-up d2">
                <Brand className="text-lg" /> extracts entities, builds knowledge graphs,
                lets you chat with your data using GraphRAG, and runs ASSUME electricity market simulations.
              </p>

              <div className="flex items-center gap-3 flex-wrap anim-slide-up d3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                    bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-900/50
                    hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Start for free <ArrowRight size={16} />
                </Link>
                <Link
                  to="/app/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                    bg-white/8 border border-white/20 text-white/80
                    hover:bg-white/15 hover:text-white transition-all"
                >
                  <ChevronRight size={16} />
                  View dashboard
                </Link>
              </div>

              <p className="mt-7 text-xs text-white/25 anim-slide-up d4">
                Open-source · Self-hosted · No data sent to third parties
              </p>

              {/* Social proof badges */}
              <div className="mt-8 flex items-center gap-3 anim-slide-up d5">
                <div className="flex -space-x-2">
                  {['B', 'Z', 'A', 'M'].map((l, i) => (
                    <div key={l}
                      className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: ['#3B82F6','#10B981','#6366F1','#F59E0B'][i] }}
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/40">
                  Trusted by data teams · <span className="text-emerald-400 font-medium">Free & open-source</span>
                </p>
              </div>
            </div>

            {/* Right — animated demo */}
            <div className="anim-slide-up d5">
              <HeroDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-white/3 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="flex justify-center mb-2 text-blue-400">{s.icon}</div>
              <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-400 tabular-nums">
                {s.value}
              </p>
              <p className="text-sm text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Features</p>
          <h2 className="text-4xl font-bold text-white mb-4">Everything you need</h2>
          <p className="text-lg text-slate-300/70 max-w-xl mx-auto">
            From raw files to intelligent answers. A complete platform built for knowledge workers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm
                hover:bg-white/8 hover:border-white/20 transition-all duration-200 anim-slide-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}20`, color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-300/65 mb-4 leading-relaxed">{f.desc}</p>
              <ul className="space-y-1.5">
                {f.bullets.map(b => (
                  <li key={b} className="flex items-center gap-2 text-xs text-white/45">
                    <CheckCircle size={13} style={{ color: f.color }} className="shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-y border-white/10 bg-white/3">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">How it works</p>
            <h2 className="text-4xl font-bold text-white mb-4">Three steps to intelligence</h2>
            <p className="text-lg text-slate-300/70 max-w-lg mx-auto">
              From raw files to a living knowledge graph in minutes.
            </p>
          </div>

          <div className="space-y-24">
            {STEPS.map((step, idx) => (
              <div
                key={step.n}
                className={`grid lg:grid-cols-2 gap-14 items-center ${idx === 1 ? '' : ''}`}
              >
                {/* Text side */}
                <div className={`anim-slide-up ${idx === 1 ? 'order-2 lg:order-2' : ''}`}>
                  <div className="flex items-center gap-4 mb-5">
                    <span
                      className="text-7xl font-black leading-none select-none"
                      style={{ color: `${step.color}12`, WebkitTextStroke: `2px ${step.color}35` }}
                    >
                      {step.n}
                    </span>
                    <div>
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-2"
                        style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}bb)` }}
                      >
                        {step.icon}
                      </div>
                      <h3 className="text-2xl font-bold text-white">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-slate-300/70 leading-relaxed mb-5">{step.desc}</p>
                  <ul className="space-y-2.5">
                    {step.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-white/50">
                        <CheckCircle size={15} className="shrink-0 mt-0.5" style={{ color: step.color }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual side */}
                <div className={`anim-slide-up d2 ${idx === 1 ? 'order-1 lg:order-1' : ''}`}>
                  {idx === 0 && <StepUploadVisualDark />}
                  {idx === 1 && <StepGraphVisualDark />}
                  {idx === 2 && <StepChatVisualDark />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="px-6 pb-28">
        <div className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl
          bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 p-12 text-center text-white">
          {/* Orbs inside CTA */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-8 -right-8 w-56 h-56 rounded-full bg-teal-900/40 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30
              text-xs font-medium text-white mb-6">
              <Network size={12} />
              Start building your knowledge graph today
            </div>
            <h2 className="text-4xl font-bold mb-4">Ready to transform your data?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Free to use, open-source, and self-hosted. No credit card required.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                  bg-white text-emerald-700 hover:bg-white/90 transition-all shadow-lg shadow-emerald-900/30"
              >
                Create free account <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                  bg-white/15 border border-white/30 text-white hover:bg-white/25 transition-all"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-10">
            {[
              { title: 'Platform',  links: ['Dashboard', 'Graph Explorer', 'GraphRAG Chat', 'AI Agent'] },
              { title: 'Resources', links: ['Documentation', 'API Reference', 'Swagger UI', 'Status'] },
              { title: 'Project',   links: ['GitHub', 'Changelog', 'License'] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-sm text-white/45 hover:text-white/80 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.AI.png" alt="" className="w-6 h-6" />
              <Brand className="text-sm" />
              <span className="text-white/25 text-sm">· © 2026</span>
            </div>
            <div className="flex items-center gap-3">
              {[Github, Twitter, Linkedin].map((Icon, i) => (
                <button key={i} className="p-2 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/8 transition-colors">
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ── Dark-themed step visuals ────────────────────────────────────────────── */
function StepUploadVisualDark() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/15 bg-white/5 p-4">
      <div className="border-2 border-dashed rounded-xl p-5 text-center" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
        <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
          style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
          <Upload size={20} />
        </div>
        <p className="text-xs font-medium text-white/70 mb-1">Drop your files here</p>
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {['PDF', 'DOCX', 'CSV', 'JSON', 'IMG'].map((t, i) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: ['#EF4444','#3B82F6','#10B981','#F59E0B','#8B5CF6'][i] }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {['Processing entities...', 'Building relations...'].map((l, i) => (
          <div key={l} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full anim-shimmer" style={{ width: i === 0 ? '80%' : '45%' }} />
            </div>
            <span className="text-[10px] text-white/30 whitespace-nowrap">{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepGraphVisualDark() {
  const nodes = [
    { id: 'tesla',   x: 200, y: 70,  line1: 'Tesla Inc.',   line2: 'Company',    color: '#10B981', r: 38 },
    { id: 'elon',    x: 72,  y: 170, line1: 'Elon Musk',    line2: 'Person',     color: '#3B82F6', r: 32 },
    { id: 'ev',      x: 328, y: 170, line1: 'EV Market',    line2: 'Concept',    color: '#0D9488', r: 32 },
    { id: 'spacex',  x: 100, y: 280, line1: 'SpaceX',       line2: 'Company',    color: '#6366F1', r: 28 },
    { id: 'battery', x: 295, y: 280, line1: 'Battery',      line2: 'Technology', color: '#F59E0B', r: 28 },
  ]
  const edges = [
    { f: 'tesla', t: 'elon',    label: 'CEO'      },
    { f: 'tesla', t: 'ev',      label: 'leads'    },
    { f: 'elon',  t: 'spacex',  label: 'founded'  },
    { f: 'tesla', t: 'battery', label: 'develops' },
    { f: 'ev',    t: 'battery', label: 'requires' },
  ]
  const nm = Object.fromEntries(nodes.map(n => [n.id, n]))
  return (
    <div className="rounded-2xl overflow-hidden border border-white/15 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-white/70">Knowledge Graph</span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>
      <svg viewBox="0 0 400 330" className="w-full">
        <defs>
          <marker id="arr2" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(255,255,255,0.2)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const f = nm[e.f], t = nm[e.t]
          const dx = t.x - f.x, dy = t.y - f.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const x1 = f.x + (dx / dist) * f.r
          const y1 = f.y + (dy / dist) * f.r
          const x2 = t.x - (dx / dist) * (t.r + 5)
          const y2 = t.y - (dy / dist) * (t.r + 5)
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="5 3"
                markerEnd="url(#arr2)" />
              <rect x={mx - 20} y={my - 9} width={40} height={15} rx="5"
                fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill="rgba(255,255,255,0.45)" fontWeight="600">{e.label}</text>
            </g>
          )
        })}
        {nodes.map(n => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.r + 7} fill={`${n.color}08`} />
            <circle cx={n.x} cy={n.y} r={n.r} fill={`${n.color}18`} stroke={n.color} strokeWidth="2" />
            <text x={n.x} y={n.y - 5} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fontWeight="800" fill={n.color}>{n.line1}</text>
            <text x={n.x} y={n.y + 10} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="rgba(255,255,255,0.35)">{n.line2}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function StepChatVisualDark() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/15 bg-white/5 p-4 space-y-2.5">
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-1.5 rounded-2xl rounded-tr-sm text-[11px] text-white"
          style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>
          What are Tesla's core technologies?
        </div>
      </div>
      <div className="flex gap-2 items-start">
        <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[8px] font-bold"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>AI</div>
        <div className="flex-1 px-2.5 py-2 rounded-2xl rounded-tl-sm bg-white/8 border border-white/12 text-[11px] text-white/75 leading-relaxed">
          Tesla focuses on{' '}
          <strong style={{ color: '#34D399' }}>battery</strong>,{' '}
          <strong style={{ color: '#60A5FA' }}>autonomous driving</strong>, and{' '}
          <strong style={{ color: '#2DD4BF' }}>energy storage</strong>...
          <span className="inline-block w-0.5 h-3 bg-blue-400 ml-0.5 align-text-bottom anim-blink" />
        </div>
      </div>
      <div className="flex gap-1 pl-7">
        {['Source 1', 'Source 4'].map(s => (
          <span key={s} className="px-1.5 py-0.5 rounded-full text-[9px] border border-white/15 text-white/30">{s}</span>
        ))}
      </div>
    </div>
  )
}
