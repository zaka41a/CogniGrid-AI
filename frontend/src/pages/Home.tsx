import { Link } from 'react-router-dom'
import {
  ArrowRight, GitBranch, Upload, Cpu, Bot, ShieldCheck,
  MessageSquare, Zap, Database, Globe, CheckCircle,
  Github, Twitter, Linkedin, ChevronRight,
} from 'lucide-react'
import { Button } from '../components/ui'

/* ── Data ─────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: <Upload size={22} />,
    color: '#6366F1',
    title: 'Universal Ingestion',
    desc: 'Upload PDF, DOCX, CSV, Excel, JSON, XML and images. Our pipeline extracts entities and relations automatically.',
    bullets: ['50+ file formats', 'Async processing', 'Real-time progress'],
  },
  {
    icon: <GitBranch size={22} />,
    color: '#8B5CF6',
    title: 'Knowledge Graph',
    desc: 'Powered by Neo4j. Every entity becomes a node, every relation an edge. Explore your data like never before.',
    bullets: ['Neo4j powered', 'Visual explorer', 'SPARQL queries'],
  },
  {
    icon: <MessageSquare size={22} />,
    color: '#3B82F6',
    title: 'GraphRAG Chat',
    desc: 'Ask questions in natural language. Get precise answers backed by your documents and graph context.',
    bullets: ['Semantic search', 'Graph-enriched context', 'Source citations'],
  },
  {
    icon: <Cpu size={22} />,
    color: '#10B981',
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

const STEPS = [
  {
    num: '01',
    icon: <Upload size={28} />,
    title: 'Upload your files',
    desc: 'Drag & drop any document — PDF, spreadsheet, image, or data file. Our parser handles the rest.',
    color: '#6366F1',
  },
  {
    num: '02',
    icon: <GitBranch size={28} />,
    title: 'Explore the graph',
    desc: 'Watch entities and relations materialize in real-time. Zoom, filter, and traverse your knowledge network.',
    color: '#8B5CF6',
  },
  {
    num: '03',
    icon: <MessageSquare size={28} />,
    title: 'Chat & query',
    desc: 'Ask complex questions across all your documents. The AI finds answers using both vector and graph context.',
    color: '#10B981',
  },
]

const STATS = [
  { value: '50+',   label: 'File formats',      icon: <Database size={18}/> },
  { value: '6',     label: 'AI microservices',   icon: <Cpu      size={18}/> },
  { value: '100%',  label: 'Open architecture',  icon: <Globe    size={18}/> },
  { value: '< 2s',  label: 'Query response',     icon: <Zap      size={18}/> },
]

const TECH = [
  { name: 'Neo4j',       color: '#018BFF' },
  { name: 'PostgreSQL',  color: '#336791' },
  { name: 'Qdrant',      color: '#DC244C' },
  { name: 'Redis',       color: '#D82C20' },
  { name: 'Spring Boot', color: '#6DB33F' },
  { name: 'Python',      color: '#3776AB' },
  { name: 'React',       color: '#61DAFB' },
  { name: 'Docker',      color: '#2496ED' },
]

/* ── Component ────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-cg-bg text-cg-txt">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-cg-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.AI.png"   alt=""             className="w-8 h-8" />
            <img src="/CogniGrid.AI.png" alt="CogniGrid AI" className="h-7 object-contain" />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-cg-muted">
            {['Features', 'How it Works', 'Services', 'Contact'].map(item => (
              <Link
                key={item}
                to={`/${item.toLowerCase().replace(/ /g, '-')}`}
                className="hover:text-cg-txt transition-colors"
              >
                {item}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"    className="px-4 py-1.5 text-sm font-medium text-cg-muted hover:text-cg-txt transition-colors">Sign in</Link>
            <Link to="/register" className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold gradient-primary text-white shadow-cg hover:opacity-90 transition-all">
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cg-primary-s border border-indigo-200 dark:border-indigo-800 text-xs font-medium text-cg-primary mb-8 anim-slide-up">
            <span className="w-1.5 h-1.5 rounded-full bg-cg-primary animate-pulse" />
            Now with AI Agent — ReAct reasoning over your entire knowledge base
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-cg-txt leading-[1.08] mb-6 anim-slide-up d1">
            Turn documents into a{' '}
            <span className="gradient-text">Living Knowledge</span>
            <br />Graph
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-cg-muted max-w-2xl mx-auto mb-10 anim-slide-up d2">
            CogniGrid AI extracts entities, builds knowledge graphs, and lets you chat with
            your data using GraphRAG — all from one unified platform.
          </p>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap anim-slide-up d3">
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

          {/* Social proof */}
          <p className="mt-8 text-xs text-cg-faint anim-slide-up d4">
            Open-source · Self-hosted · No data sent to third parties
          </p>

          {/* Mock dashboard preview */}
          <div className="mt-16 relative mx-auto max-w-4xl anim-slide-up d5">
            <div className="card shadow-cg-lg overflow-hidden border-cg-border2">
              <div className="h-8 bg-cg-s2 flex items-center gap-1.5 px-4 border-b border-cg-border">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-4 text-xs text-cg-faint">CogniGrid AI — Dashboard</span>
              </div>
              <div className="p-6 grid grid-cols-4 gap-3">
                {[
                  { label: 'Documents', value: '1,284', color: '#6366F1' },
                  { label: 'Graph Nodes', value: '48,291', color: '#8B5CF6' },
                  { label: 'Queries Today', value: '342', color: '#10B981' },
                  { label: 'Uptime', value: '99.9%', color: '#3B82F6' },
                ].map(card => (
                  <div key={card.label} className="rounded-xl p-3 bg-cg-s2 border border-cg-border">
                    <p className="text-[10px] text-cg-muted uppercase tracking-wide mb-1">{card.label}</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: card.color }}>{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6">
                <div className="h-32 rounded-xl bg-cg-s2 border border-cg-border flex items-end gap-1 px-4 pb-4 overflow-hidden">
                  {[35,55,45,70,60,85,75,90,65,80,95,72].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm opacity-80"
                      style={{
                        height: `${h}%`,
                        background: `linear-gradient(to top, #6366F1, #8B5CF6)`,
                        animationDelay: `${i * 0.05}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* Glow under preview */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-indigo-500/20 blur-xl rounded-full" />
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
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-cg-primary mb-3">Features</p>
          <h2 className="text-4xl font-bold text-cg-txt mb-4">Everything you need</h2>
          <p className="text-lg text-cg-muted max-w-xl mx-auto">
            From raw files to intelligent answers — a complete platform built for knowledge workers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`card card-hover p-6 group anim-slide-up`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white mb-4 transition-transform group-hover:scale-110 duration-200"
                style={{ background: `${f.color}20`, color: f.color }}
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
      <section className="bg-cg-surface border-y border-cg-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-cg-primary mb-3">How it works</p>
            <h2 className="text-4xl font-bold text-cg-txt">Three steps to intelligence</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px border-t-2 border-dashed border-cg-border" />

            {STEPS.map((step, i) => (
              <div key={step.num} className={`text-center anim-slide-up`} style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="relative inline-flex mb-6">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-white"
                    style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}99)` }}
                  >
                    {step.icon}
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: step.color }}
                  >
                    {step.num}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-cg-txt mb-2">{step.title}</h3>
                <p className="text-sm text-cg-muted leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-cg-faint mb-8">Built with</p>
        <div className="flex flex-wrap justify-center gap-3">
          {TECH.map(t => (
            <span
              key={t.name}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-cg-border bg-cg-surface
                hover:border-opacity-60 transition-all cursor-default"
              style={{ color: t.color, borderColor: `${t.color}40`, background: `${t.color}08` }}
            >
              {t.name}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto rounded-3xl gradient-primary p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute bottom-4 right-4 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-4xl font-bold mb-4">Ready to transform your data?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Start building your knowledge graph today. Free to use, open-source, and self-hosted.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/register">
                <Button
                  variant="ghost"
                  size="lg"
                  className="!bg-white !text-indigo-700 hover:!bg-white/90"
                  iconRight={<ArrowRight size={16}/>}
                >
                  Get started free
                </Button>
              </Link>
              <Link to="/app/dashboard">
                <Button
                  size="lg"
                  className="!bg-white/10 !text-white border border-white/30 hover:!bg-white/20"
                >
                  Live demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-cg-border bg-cg-surface">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {[
              { title: 'Product', links: ['Dashboard', 'Graph Explorer', 'GraphRAG Chat', 'AI Engine'] },
              { title: 'Resources', links: ['Documentation', 'API Reference', 'Changelog', 'Status'] },
              { title: 'Company', links: ['About', 'Services', 'Contact', 'Blog'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security'] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-widest text-cg-faint mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <Link to="#" className="text-sm text-cg-muted hover:text-cg-txt transition-colors">{link}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-cg-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.AI.png"   alt="" className="w-6 h-6" />
              <span className="text-sm font-semibold text-cg-txt">CogniGrid AI</span>
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
