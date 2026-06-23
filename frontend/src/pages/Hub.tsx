import { useNavigate } from 'react-router-dom'
import { Database, Zap, ArrowRight, LogOut } from 'lucide-react'
import { useAppStore } from '../store'

const UNIVERSES = [
  {
    id: 'kg',
    title: 'Knowledge Graph Studio',
    desc: 'Upload your documents, build a knowledge graph, and explore it with GraphRAG chat and an AI agent — all scoped to your own data.',
    to: '/app/dashboard',
    icon: <Database size={26} />,
    iconWrap: 'bg-emerald-500/15 text-emerald-400',
    dot: 'bg-emerald-400',
    cta: 'text-emerald-400',
    hover: 'hover:border-emerald-500/50',
    features: ['Data Ingestion', 'Graph Explorer', 'GraphRAG Chat', 'AI Agent'],
  },
  {
    id: 'assume',
    title: 'ASSUME Lab',
    desc: 'Design, run and analyse electricity-market simulations with the ASSUME framework and its expert assistant.',
    to: '/app/assume',
    icon: <Zap size={26} />,
    iconWrap: 'bg-blue-500/15 text-blue-400',
    dot: 'bg-blue-400',
    cta: 'text-blue-400',
    hover: 'hover:border-blue-500/50',
    features: ['Scenario Advisor', 'Scenario Generator', 'Simulation Runner', 'Results & Compare'],
  },
]

export default function Hub() {
  const navigate = useNavigate()
  const { currentUser, clearAuth } = useAppStore()
  const firstName = (currentUser.name || '').split(' ')[0] || 'there'

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white">
      <header className="flex items-center justify-between px-8 h-16 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-7 h-7" />
          <span className="font-bold tracking-tight">
            <span className="text-white">CogniGrid</span>
            <span className="text-emerald-400"> AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/50">{currentUser.name} · {currentUser.role}</span>
          <button
            onClick={() => { clearAuth(); navigate('/login') }}
            className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <h1 className="text-2xl font-bold mb-1.5">Welcome back, {firstName}</h1>
        <p className="text-white/50 mb-10">Choose a workspace to get started.</p>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
          {UNIVERSES.map(u => (
            <button
              key={u.id}
              onClick={() => navigate(u.to)}
              className={`group text-left rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition-all hover:-translate-y-0.5 hover:bg-white/[0.04] ${u.hover}`}
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${u.iconWrap}`}>
                {u.icon}
              </div>
              <h2 className="text-lg font-bold mb-1.5">{u.title}</h2>
              <p className="text-sm text-white/55 leading-relaxed mb-5">{u.desc}</p>
              <ul className="space-y-1.5 mb-6">
                {u.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-white/70">
                    <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${u.cta}`}>
                Open
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
