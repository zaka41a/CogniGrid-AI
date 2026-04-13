import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, GitBranch, Upload, Bot,
  MessageSquare, Zap, Database, Globe, CheckCircle,
  Github, Twitter, Linkedin, ChevronRight, ShieldCheck, Cpu,
} from 'lucide-react'
import { Button } from '../components/ui'

/* ── Brand ──────────────────────────────────────────────────────────────────── */
function Brand({ className = 'text-sm' }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span style={{ color: '#3B82F6' }}>CogniGrid</span>
      <span style={{ color: '#10B981' }}> AI</span>
    </span>
  )
}

/* ── Hero animated demo ─────────────────────────────────────────────────────── */

function UploadPanel() {
  const files = [
    { name: 'annual_report_2025.pdf', type: 'PDF', color: '#EF4444', pct: 100 },
    { name: 'employees_data.xlsx',    type: 'XLS', color: '#10B981', pct: 78  },
    { name: 'contracts_Q1.docx',      type: 'DOC', color: '#3B82F6', pct: 55  },
    { name: 'entities_schema.json',   type: 'JSON', color: '#F59E0B', pct: 30 },
  ]
  return (
    <div>
      <p className="text-[11px] font-semibold text-cg-muted uppercase tracking-widest mb-3">
        Processing 4 files
      </p>
      <div className="space-y-2">
        {files.map((f, i) => (
          <div
            key={f.name}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-cg-s2 border border-cg-border anim-slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div
              className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: f.color }}
            >
              {f.type}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-cg-txt truncate">{f.name}</p>
              <div className="h-1.5 rounded-full bg-cg-border mt-1.5 overflow-hidden">
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
    { id: 'e', x: 230, y: 248, line1: 'Battery',   line2: 'Technology',color: '#F59E0B', r: 24 },
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
      <p className="text-[11px] font-semibold text-cg-muted uppercase tracking-widest mb-2">
        48,291 nodes · 127,043 edges
      </p>
      <svg viewBox="0 0 310 290" className="w-full" style={{ maxHeight: 228 }}>
        <defs>
          <marker id="arrow-h" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--cg-border2)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const f = nm[e.f], t = nm[e.t]
          // shorten line to node edge
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
                stroke="var(--cg-border2)" strokeWidth="1.5"
                strokeDasharray="4 3" markerEnd="url(#arrow-h)" />
              <rect x={mx - 18} y={my - 8} width={36} height={13} rx="4"
                fill="var(--cg-surface)" stroke="var(--cg-border)" strokeWidth="0.8" />
              <text x={mx} y={my + 0.5} textAnchor="middle" dominantBaseline="middle"
                fontSize="7" fill="var(--cg-muted)" fontWeight="600">{e.label}</text>
            </g>
          )
        })}
        {nodes.map((n, i) => (
          <g key={n.id} className="anim-scale-in"
            style={{ animationDelay: `${i * 0.08}s`, transformOrigin: `${n.x}px ${n.y}px` }}>
            <circle cx={n.x} cy={n.y} r={n.r + 5} fill={`${n.color}06`} />
            <circle cx={n.x} cy={n.y} r={n.r} fill={`${n.color}14`} stroke={n.color} strokeWidth="1.8" />
            <text x={n.x} y={n.y - 4} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fontWeight="700" fill={n.color}>{n.line1}</text>
            <text x={n.x} y={n.y + 8} textAnchor="middle" dominantBaseline="middle"
              fontSize="6.5" fill="var(--cg-faint)">{n.line2}</text>
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
        <div className="flex-1 px-3 py-2.5 rounded-2xl rounded-tl-sm bg-cg-s2 border border-cg-border text-xs text-cg-txt leading-relaxed">
          Based on{' '}
          <span className="font-semibold" style={{ color: '#3B82F6' }}>12 documents</span>{' '}
          and{' '}
          <span className="font-semibold" style={{ color: '#10B981' }}>847 graph nodes</span>:
          <br /><br />
          <strong>BYD</strong> surpassed Tesla in EV deliveries in Q4 2024.
          Other key rivals include <strong>Rivian</strong>, <strong>Lucid</strong>, and <strong>NIO</strong>.
          <span className="inline-block w-0.5 h-3.5 bg-cg-primary ml-0.5 align-text-bottom anim-blink" />
        </div>
      </div>
      <div className="flex gap-1 pl-8 flex-wrap">
        {['Report Q4 2024', 'EV Analysis', 'Market Data'].map(s => (
          <span key={s} className="px-2 py-0.5 rounded-full text-[10px] border border-cg-border text-cg-muted bg-cg-s2">
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
    { label: 'Traverse graph: Technology → Company → Patent',  done: true },
    { label: 'Synthesize findings across 34 documents',        active: true },
    { label: 'Generate final structured answer',               done: false },
  ]
  return (
    <div>
      <div className="px-3 py-2 rounded-xl text-xs mb-3 border"
        style={{ background: '#3B82F610', borderColor: '#3B82F630', color: '#3B82F6' }}>
        <strong>Query:</strong> Summarize all research on solid-state battery technology
      </div>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={s.label}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-cg-s2 anim-slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
              style={s.done
                ? { background: '#10B98115', border: '1.5px solid #10B981' }
                : s.active
                  ? { background: '#3B82F615', border: '1.5px solid #3B82F6' }
                  : { background: 'var(--cg-surface3)', border: '1.5px solid var(--cg-border)' }
              }>
              {s.done   && <CheckCircle size={11} style={{ color: '#10B981' }} />}
              {s.active && <div className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />}
            </div>
            <span className={`text-xs ${!s.done && !s.active ? 'text-cg-faint' : 'text-cg-txt'}`}>
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

function HeroDemo() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % 4), 3800)
    return () => clearInterval(t)
  }, [])

  const tabs = [
    { label: 'Ingest',    color: '#3B82F6', icon: <Upload      size={12} /> },
    { label: 'Graph',     color: '#10B981', icon: <GitBranch   size={12} /> },
    { label: 'GraphRAG',  color: '#0D9488', icon: <MessageSquare size={12} /> },
    { label: 'AI Agent',  color: '#6366F1', icon: <Bot         size={12} /> },
  ]

  return (
    <div className="card shadow-cg-lg overflow-hidden" style={{ borderColor: 'var(--cg-border2)' }}>
      {/* Window chrome */}
      <div className="h-9 bg-cg-s2 flex items-center gap-3 px-4 border-b border-cg-border">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[11px] font-medium text-cg-faint flex-1 text-center">
          <span style={{ color: '#3B82F6' }} className="font-semibold">CogniGrid</span>
          <span style={{ color: '#10B981' }} className="font-semibold"> AI</span>
          {' '}· Dashboard
        </span>
      </div>

      {/* Stage tabs */}
      <div className="flex border-b border-cg-border">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2"
            style={active === i
              ? { color: t.color, borderColor: t.color, background: `${t.color}10` }
              : { color: 'var(--cg-muted)', borderColor: 'transparent', background: 'transparent' }
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
      </div>

      {/* Progress indicators */}
      <div className="px-5 pb-4 flex justify-center gap-2">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="h-1.5 rounded-full transition-all duration-400"
            style={{ width: active === i ? 28 : 6, background: active === i ? t.color : 'var(--cg-border2)' }}
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
    icon: <ShieldCheck size={22} />,
    color: '#EF4444',
    title: 'Security & RBAC',
    desc: 'JWT authentication, role-based access control, and audit logs. Enterprise-grade security from day one.',
    bullets: ['JWT + Refresh tokens', 'Admin/Analyst/Viewer', 'Activity logs'],
  },
]

const STATS = [
  { value: '50+',   label: 'File formats',     icon: <Database size={18}/> },
  { value: '6',     label: 'AI microservices',  icon: <Cpu      size={18}/> },
  { value: '100%',  label: 'Open architecture', icon: <Globe    size={18}/> },
  { value: '< 2s',  label: 'Query response',    icon: <Zap      size={18}/> },
]

/* ── How it works visual cards ─────────────────────────────────────────────── */

function StepUploadVisual() {
  return (
    <div className="rounded-2xl overflow-hidden border border-cg-border bg-cg-s2 p-4">
      <div className="border-2 border-dashed rounded-xl p-5 text-center" style={{ borderColor: '#3B82F640' }}>
        <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
          style={{ background: '#3B82F610', color: '#3B82F6' }}>
          <Upload size={20} />
        </div>
        <p className="text-xs font-medium text-cg-txt mb-1">Drop your files here</p>
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
            <div className="flex-1 h-1.5 rounded-full bg-cg-border overflow-hidden">
              <div className="h-full rounded-full anim-shimmer" style={{ width: i === 0 ? '80%' : '45%' }} />
            </div>
            <span className="text-[10px] text-cg-faint whitespace-nowrap">{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepGraphVisual() {
  const nodes = [
    { id: 'tesla',   x: 200, y: 70,  line1: 'Tesla Inc.',  line2: 'Company',     color: '#10B981', r: 38 },
    { id: 'elon',    x: 72,  y: 170, line1: 'Elon Musk',   line2: 'Person',      color: '#3B82F6', r: 32 },
    { id: 'ev',      x: 328, y: 170, line1: 'EV Market',   line2: 'Concept',     color: '#0D9488', r: 32 },
    { id: 'spacex',  x: 100, y: 280, line1: 'SpaceX',      line2: 'Company',     color: '#6366F1', r: 28 },
    { id: 'battery', x: 295, y: 280, line1: 'Battery Tech','line2': 'Technology', color: '#F59E0B', r: 28 },
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
    <div className="rounded-2xl overflow-hidden border border-cg-border bg-cg-s2 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-cg-txt">Knowledge Graph</span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#10B981' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>
      <svg viewBox="0 0 400 330" className="w-full">
        <defs>
          <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#CBD5E1" />
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
                stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5 3"
                markerEnd="url(#arr)" />
              <rect x={mx - 20} y={my - 9} width={40} height={15} rx="5"
                fill="white" stroke="#E2E8F0" strokeWidth="1" />
              <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill="#64748B" fontWeight="600">{e.label}</text>
            </g>
          )
        })}
        {nodes.map((n) => (
          <g key={n.id} style={{ cursor: 'default' }}>
            <circle cx={n.x} cy={n.y} r={n.r + 7} fill={`${n.color}07`} />
            <circle cx={n.x} cy={n.y} r={n.r} fill={`${n.color}15`}
              stroke={n.color} strokeWidth="2" />
            <text x={n.x} y={n.y - 5} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fontWeight="800" fill={n.color}>{n.line1}</text>
            <text x={n.x} y={n.y + 10} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="#94A3B8">{n.line2}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function StepChatVisual() {
  return (
    <div className="rounded-2xl overflow-hidden border border-cg-border bg-cg-s2 p-4 space-y-2.5">
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-1.5 rounded-2xl rounded-tr-sm text-[11px] text-white"
          style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>
          What are Tesla's core technologies?
        </div>
      </div>
      <div className="flex gap-2 items-start">
        <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[8px] font-bold"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>AI</div>
        <div className="flex-1 px-2.5 py-2 rounded-2xl rounded-tl-sm bg-white border border-cg-border text-[11px] text-cg-txt leading-relaxed">
          Tesla focuses on <strong style={{color:'#10B981'}}>battery tech</strong>,{' '}
          <strong style={{color:'#3B82F6'}}>autonomous driving</strong>,
          and <strong style={{color:'#0D9488'}}>energy storage</strong>...
          <span className="inline-block w-0.5 h-3 bg-cg-primary ml-0.5 align-text-bottom anim-blink"/>
        </div>
      </div>
      <div className="flex gap-1 pl-7">
        {['Source 1','Source 4'].map(s => (
          <span key={s} className="px-1.5 py-0.5 rounded-full text-[9px] border border-cg-border text-cg-faint">{s}</span>
        ))}
      </div>
    </div>
  )
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-cg-bg text-cg-txt">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-cg-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-8 h-8" />
            <Brand />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-cg-muted">
            {['Features', 'How it Works'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="hover:text-cg-txt transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-1.5 text-sm font-medium text-cg-muted hover:text-cg-txt transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold gradient-primary text-white shadow-cg hover:opacity-90 transition-all">
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cg-primary-s border border-cg-border text-xs font-medium text-cg-primary mb-8 anim-slide-up">
                <span className="w-1.5 h-1.5 rounded-full bg-cg-primary animate-pulse" />
                Now with AI Agent · ReAct reasoning over your entire knowledge base
              </div>

              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6 anim-slide-up d1">
                Turn documents into a{' '}
                <span className="gradient-text">Living Knowledge</span>
                <br />Graph
              </h1>

              <p className="text-lg text-cg-muted max-w-lg mb-8 leading-relaxed anim-slide-up d2">
                <Brand className="text-lg" /> extracts entities, builds knowledge graphs,
                and lets you chat with your data using GraphRAG,
                all from one unified platform.
              </p>

              <div className="flex items-center gap-3 flex-wrap anim-slide-up d3">
                <Link to="/register">
                  <Button size="lg" iconRight={<ArrowRight size={16}/>}>
                    Start for free
                  </Button>
                </Link>
                <Link to="/app/dashboard">
                  <Button size="lg" variant="outline" icon={<ChevronRight size={16}/>}>
                    View dashboard
                  </Button>
                </Link>
              </div>

              <p className="mt-7 text-xs text-cg-faint anim-slide-up d4">
                Open-source · Self-hosted · No data sent to third parties
              </p>
            </div>

            {/* Right — animated demo */}
            <div className="anim-slide-up d5">
              <HeroDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="border-y border-cg-border bg-cg-surface">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="flex justify-center mb-2 text-cg-primary">{s.icon}</div>
              <p className="text-3xl font-bold gradient-text tabular-nums">{s.value}</p>
              <p className="text-sm text-cg-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-cg-primary mb-3">Features</p>
          <h2 className="text-4xl font-bold text-cg-txt mb-4">Everything you need</h2>
          <p className="text-lg text-cg-muted max-w-xl mx-auto">
            From raw files to intelligent answers. A complete platform built for knowledge workers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="card card-hover p-6 group anim-slide-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-200"
                style={{ background: `${f.color}18`, color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-cg-txt mb-2">{f.title}</h3>
              <p className="text-sm text-cg-muted mb-4 leading-relaxed">{f.desc}</p>
              <ul className="space-y-1.5">
                {f.bullets.map(b => (
                  <li key={b} className="flex items-center gap-2 text-xs text-cg-muted">
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
      <section id="how-it-works" className="bg-cg-surface border-y border-cg-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-cg-primary mb-3">How it works</p>
            <h2 className="text-4xl font-bold text-cg-txt mb-4">Three steps to intelligence</h2>
            <p className="text-lg text-cg-muted max-w-lg mx-auto">
              From raw files to a living knowledge graph in minutes.
            </p>
          </div>

          <div className="space-y-20">

            {/* Step 01 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="anim-slide-up">
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-7xl font-black leading-none" style={{ color: '#3B82F610', WebkitTextStroke: '2px #3B82F640' }}>01</span>
                  <div>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-2"
                      style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
                      <Upload size={18} />
                    </div>
                    <h3 className="text-2xl font-bold text-cg-txt">Upload your files</h3>
                  </div>
                </div>
                <p className="text-cg-muted leading-relaxed mb-5">
                  Drag and drop any document. PDF, spreadsheet, image, or data file.
                  Our intelligent parser handles structure, tables, images, and free text automatically.
                </p>
                <ul className="space-y-2.5">
                  {['50+ supported file formats', 'OCR for scanned documents and images', 'Async processing with real-time status', 'Automatic entity and relation extraction'].map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-cg-muted">
                      <CheckCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#3B82F6' }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="anim-slide-up d2">
                <StepUploadVisual />
              </div>
            </div>

            {/* Step 02 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 anim-slide-up">
                <StepGraphVisual />
              </div>
              <div className="order-1 lg:order-2 anim-slide-up d2">
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-7xl font-black leading-none" style={{ color: '#10B98110', WebkitTextStroke: '2px #10B98140' }}>02</span>
                  <div>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-2"
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                      <GitBranch size={18} />
                    </div>
                    <h3 className="text-2xl font-bold text-cg-txt">Explore the graph</h3>
                  </div>
                </div>
                <p className="text-cg-muted leading-relaxed mb-5">
                  Watch entities and relations materialize in real-time.
                  Every entity becomes a node, every relation an edge.
                  Zoom, filter, and traverse your knowledge network visually.
                </p>
                <ul className="space-y-2.5">
                  {['Neo4j-powered graph database', 'Visual interactive explorer', 'Multi-hop relation traversal', 'Full-text and semantic search'].map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-cg-muted">
                      <CheckCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step 03 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="anim-slide-up">
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-7xl font-black leading-none" style={{ color: '#0D948810', WebkitTextStroke: '2px #0D948840' }}>03</span>
                  <div>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-2"
                      style={{ background: 'linear-gradient(135deg, #0D9488, #0F766E)' }}>
                      <MessageSquare size={18} />
                    </div>
                    <h3 className="text-2xl font-bold text-cg-txt">Chat and query</h3>
                  </div>
                </div>
                <p className="text-cg-muted leading-relaxed mb-5">
                  Ask complex questions across all your documents.
                  The AI finds answers using both vector similarity and graph context,
                  giving you precise, cited, multi-hop reasoning.
                </p>
                <ul className="space-y-2.5">
                  {['GraphRAG combines vector and graph search', 'Source citations for every answer', 'AI Agent for complex multi-step reasoning', 'Multi-LLM support: OpenAI, Anthropic, Ollama'].map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-cg-muted">
                      <CheckCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#0D9488' }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="anim-slide-up d2">
                <StepChatVisual />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto rounded-3xl gradient-primary p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-4 left-4 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute bottom-4 right-4 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-4xl font-bold mb-4">Ready to transform your data?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Start building your knowledge graph today. Free to use, open-source, and self-hosted.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/app/dashboard">
                <Button
                  variant="ghost"
                  size="lg"
                  className="!bg-white !text-emerald-700 hover:!bg-white/90"
                  iconRight={<ArrowRight size={16}/>}
                >
                  Live demo
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" className="!bg-white/10 !text-white border border-white/30 hover:!bg-white/20">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-cg-border bg-cg-surface">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-10">
            {[
              { title: 'Platform',   links: ['Dashboard', 'Graph Explorer', 'GraphRAG Chat', 'AI Agent'] },
              { title: 'Resources',  links: ['Documentation', 'API Reference', 'Swagger UI', 'Status'] },
              { title: 'Project',    links: ['GitHub', 'Changelog', 'License'] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-widest text-cg-faint mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-sm text-cg-muted hover:text-cg-txt transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-cg-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.AI.png" alt="" className="w-6 h-6" />
              <Brand className="text-sm" />
              <span className="text-cg-faint text-sm">· © 2026</span>
            </div>
            <div className="flex items-center gap-3">
              {[Github, Twitter, Linkedin].map((Icon, i) => (
                <button key={i} className="p-2 rounded-lg text-cg-faint hover:text-cg-txt hover:bg-cg-s2 transition-colors">
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
