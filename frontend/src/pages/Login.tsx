import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Eye, EyeOff, ArrowRight, ArrowLeft, Brain, Network, Shield, Zap, CheckCircle2 } from 'lucide-react'
import { authApi } from '../lib/api'
import { useAppStore } from '../store'

const FEATURES = [
  { icon: <Brain size={16} />,   text: 'AI-powered knowledge graph intelligence', bg: 'bg-blue-500/30',    fg: 'text-blue-200'    },
  { icon: <Network size={16} />, text: 'Multi-hop GraphRAG semantic search',       bg: 'bg-indigo-500/30', fg: 'text-indigo-200'  },
  { icon: <Shield size={16} />,  text: 'Enterprise-grade security & compliance',   bg: 'bg-emerald-500/30',fg: 'text-emerald-200' },
  { icon: <Zap size={16} />,     text: 'Real-time analytics & AI insights',        bg: 'bg-violet-500/30', fg: 'text-violet-200'  },
]

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const setAuth   = useAppStore(s => s.setAuth)
  const from      = (location.state as { from?: Location })?.from?.pathname ?? '/app/dashboard'

  const [showPassword, setShowPassword] = useState(false)
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // ── Local offline accounts (used when gateway is not running) ────────────────
  const LOCAL_ACCOUNTS: Record<string, { name: string; role: string }> = {
    'zakaria@cognigrid.ai:zakaria2024':        { name: 'zakaria sabiri', role: 'ANALYST'   },
    'demo@cognigrid.ai:demo2024':              { name: 'Demo User',      role: 'VIEWER'    },
    'admin@cognigrid.ai:CogniGrid@Admin2024':  { name: 'Admin',          role: 'ADMIN'     },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login({ email: form.email, password: form.password })
      const role = data.user.role
      setAuth(
        { name: data.user.fullName, email: data.user.email ?? form.email, role, initials: data.user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() },
        data.accessToken,
      )
      setSuccess(true)
      setTimeout(() => navigate(from, { replace: true }), 1000)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; code?: string }

      // Always try local accounts (offline fallback OR when gateway returns 401)
      const key = `${form.email.toLowerCase().trim()}:${form.password}`
      const local = LOCAL_ACCOUNTS[key]
      if (local) {
        setAuth(
          { name: local.name, email: form.email.toLowerCase().trim(), role: local.role, initials: local.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() },
          'local-token',
        )
        setSuccess(true)
        setTimeout(() => navigate(from, { replace: true }), 800)
        setLoading(false)
        return
      }

      if (!axiosErr.response) {
        setError('Backend not reachable. Use a local account: zakaria@cognigrid.ai / zakaria2024')
      } else {
        setError(axiosErr.response?.data?.message ?? 'Invalid email or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12
        bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl animate-float" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl animate-float"
            style={{ animationDelay: '1.5s' }} />
          <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl animate-float"
            style={{ animationDelay: '3s' }} />
        </div>

        <div className="relative flex items-center gap-2">
          <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-9 h-9" />
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">CogniGrid</span>
            <span style={{ color: '#10B981' }}> AI</span>
          </span>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Turn your data into<br />
            <span className="text-blue-300">actionable intelligence</span>
          </h1>
          <p className="text-slate-300/80 text-base leading-relaxed mb-8 max-w-sm">
            CogniGrid AI transforms unstructured documents into a living knowledge graph
            you can query, explore, and reason over.
          </p>
          <ul className="space-y-3">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-white/85 text-sm">
                <span className={`shrink-0 w-8 h-8 rounded-xl ${f.bg} ${f.fg} flex items-center justify-center`}>{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            { value: '50K+',   label: 'Documents' },
            { value: '99.9%',  label: 'Uptime'    },
            { value: '<200ms', label: 'Query time' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
              <p className="text-blue-200 font-bold text-lg">{s.value}</p>
              <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-cg-bg">

        {/* Back to home */}
        <div className="w-full max-w-sm mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-cg-muted hover:text-cg-txt transition-colors">
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-8 h-8" />
          <span className="font-bold text-base tracking-tight">
            <span className="text-gray-900">CogniGrid</span>
            <span style={{ color: '#10B981' }}> AI</span>
          </span>
        </div>

        <div className="w-full max-w-sm anim-slide-up">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-cg-txt mb-1.5">Welcome back</h2>
            <p className="text-sm text-cg-muted">Sign in to your CogniGrid workspace</p>
          </div>

          {success && (
            <div className="mb-5 px-4 py-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> Signed in successfully! Redirecting…
            </div>
          )}

          {error && !success && (
            <div className="mb-5 px-4 py-3 bg-red-50 border-2 border-red-500 rounded-xl text-sm text-red-800 flex items-center gap-2">
              <span className="shrink-0 text-red-600">⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint pointer-events-none" />
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  className="w-full bg-cg-surface border border-cg-border rounded-xl pl-10 pr-4 py-2.5
                    text-sm text-cg-txt placeholder:text-cg-faint
                    focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-cg-surface border border-cg-border rounded-xl px-4 pr-11 py-2.5
                    text-sm text-cg-txt placeholder:text-cg-faint
                    focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/20 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cg-faint hover:text-cg-muted transition-colors">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm
                gradient-primary text-white shadow-cg hover:opacity-90 active:scale-[0.99]
                disabled:opacity-60 transition-all duration-150 mt-2"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Sign in <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p className="text-center text-sm text-cg-muted mt-6">
            No account?{' '}
            <Link to="/register" className="text-cg-primary font-semibold hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
