import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Zap, ArrowRight, LogOut, Settings, ShieldCheck, Upload, Play, FileText, Activity } from 'lucide-react'
import { useAppStore } from '../store'
import { ingestionApi } from '../lib/api'
import { runnerApi } from './assume/runner'

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-emerald-400', running: 'bg-blue-400', pending: 'bg-amber-400',
  failed: 'bg-red-400', cancelled: 'bg-slate-400',
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
      {icon}{children}
    </span>
  )
}

export default function Hub() {
  const navigate = useNavigate()
  const { currentUser, clearAuth } = useAppStore()
  const firstName = (currentUser.name || '').split(' ')[0] || 'there'
  const isAdmin = (currentUser.role || '').toUpperCase().includes('ADMIN')

  const [docs, setDocs] = useState<number | null>(null)
  const [lastDoc, setLastDoc] = useState('')
  const [runs, setRuns] = useState<number | null>(null)
  const [lastRun, setLastRun] = useState<{ name: string; status: string } | null>(null)
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await ingestionApi.jobs()
        if (!alive) return
        const jobs = data.jobs ?? []
        setDocs(jobs.filter(j => j.status === 'completed').length)
        const recent = [...jobs].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]
        setLastDoc(recent?.file_name ?? '')
        setOnline(true)
      } catch {
        if (alive) setOnline(false)
      }
      try {
        const { data } = await runnerApi.list()
        if (!alive) return
        setRuns(data.length)
        const recent = [...data].sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? ''))[0]
        if (recent) setLastRun({ name: recent.scenario_name, status: recent.status })
      } catch { /* runner optional */ }
    })()
    return () => { alive = false }
  }, [])

  const go = (e: React.MouseEvent, to: string) => { e.stopPropagation(); navigate(to) }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-white">
      <header className="flex items-center justify-between px-8 h-16 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-7 h-7" />
          <span className="font-bold tracking-tight"><span className="text-white">CogniGrid</span><span className="text-emerald-400"> AI</span></span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
            online === false ? 'border-red-500/30 text-red-300 bg-red-500/10' : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online === false ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
            {online === false ? 'Services offline' : 'All systems online'}
          </span>
          <span className="text-white/40">{currentUser.name} · {currentUser.role}</span>
          <button onClick={() => navigate('/app/settings')} className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Settings"><Settings size={16} /></button>
          <button onClick={() => { clearAuth(); navigate('/login') }} className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Sign out"><LogOut size={16} /></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {firstName}</h1>
          <p className="text-white/45 mt-1.5 mb-9">Choose a workspace to get started.</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Knowledge Graph */}
            <div
              onClick={() => navigate('/app/dashboard')}
              className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all hover:-translate-y-1 hover:bg-white/[0.05] hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/5"
            >
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"><Database size={26} /></div>
                <ArrowRight size={18} className="text-emerald-400/60 group-hover:translate-x-1 transition-transform" />
              </div>
              <h2 className="text-lg font-bold mt-5 mb-1.5">Knowledge Graph Studio</h2>
              <p className="text-sm text-white/55 leading-relaxed mb-4">Upload documents, build a knowledge graph, and explore it with GraphRAG chat and an AI agent over your own data.</p>
              <div className="flex flex-wrap gap-2 mb-5">
                <Chip icon={<FileText size={12} className="text-emerald-400" />}>{docs ?? '...'} documents</Chip>
                {lastDoc && <Chip icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}>last: {lastDoc.length > 22 ? lastDoc.slice(0, 22) + '...' : lastDoc}</Chip>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => go(e, '/app/dashboard')} className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-colors">Open</button>
                <button onClick={e => go(e, '/app/ingestion')} className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-white/15 text-white/80 hover:bg-white/5 transition-colors"><Upload size={14} /> Upload</button>
              </div>
            </div>

            {/* ASSUME */}
            <div
              onClick={() => navigate('/app/assume')}
              className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all hover:-translate-y-1 hover:bg-white/[0.05] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/5"
            >
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20"><Zap size={26} /></div>
                <ArrowRight size={18} className="text-blue-400/60 group-hover:translate-x-1 transition-transform" />
              </div>
              <h2 className="text-lg font-bold mt-5 mb-1.5">ASSUME Lab</h2>
              <p className="text-sm text-white/55 leading-relaxed mb-4">Design, run and analyse electricity market simulations with the ASSUME framework and its expert assistant.</p>
              <div className="flex flex-wrap gap-2 mb-5">
                <Chip icon={<Play size={12} className="text-blue-400" />}>{runs ?? '...'} simulations</Chip>
                {lastRun && <Chip icon={<span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[lastRun.status] ?? 'bg-slate-400'}`} />}>last: {lastRun.name} ({lastRun.status})</Chip>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => go(e, '/app/assume')} className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-400 transition-colors">Open</button>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div
              onClick={() => navigate('/app/admin')}
              className="group cursor-pointer mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 flex items-center gap-4 transition-all hover:bg-amber-500/[0.1] hover:border-amber-500/40"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20 shrink-0"><ShieldCheck size={20} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">Admin Console</p>
                <p className="text-xs text-white/50">Manage users and roles, review the activity log.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300"><Activity size={13} /> Open</span>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between text-[11px] text-white/30">
            <span>CogniGrid AI · Knowledge Graph + ASSUME</span>
            <span>FH Aachen</span>
          </div>
        </div>
      </main>
    </div>
  )
}
