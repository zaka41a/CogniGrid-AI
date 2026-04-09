import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Eye, EyeOff, ArrowRight, Zap, Shield, Brain, Network, CheckCircle2 } from 'lucide-react'
import { authApi } from '../lib/api'
import { useAppStore } from '../store'

const FEATURES = [
  { icon: <Brain size={16} />,   text: 'AI-powered knowledge graph intelligence' },
  { icon: <Network size={16} />, text: 'Multi-hop GraphRAG semantic search'       },
  { icon: <Shield size={16} />,  text: 'Enterprise-grade security & compliance'   },
  { icon: <Zap size={16} />,     text: 'Real-time analytics & AI insights'        },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login({ email: form.email, password: form.password })
      setAuth(
        { name: data.name, role: data.role, initials: data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() },
        data.token,
      )
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => setForm({ email: 'admin@cognigrid.ai', password: 'demo1234' })

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12
        bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-float" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-indigo-300/20 blur-3xl animate-float"
            style={{ animationDelay: '1.5s' }} />
          <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-purple-300/15 blur-3xl animate-float"
            style={{ animationDelay: '3s' }} />
        </div>

        <div className="relative flex items-center gap-3">
          <img src="/favicon.AI.png" alt="" className="w-10 h-10" />
          <img src="/CogniGrid.AI.png" alt="CogniGrid AI" className="h-7 brightness-0 invert" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm
            border border-white/20 text-white/90 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Knowledge Graph Platform
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Turn your data into<br />
            <span className="text-indigo-200">actionable intelligence</span>
          </h1>
          <p className="text-indigo-100/80 text-base leading-relaxed mb-8 max-w-sm">
            CogniGrid AI transforms unstructured documents into a living knowledge graph
            you can query, explore, and reason over.
          </p>
          <ul className="space-y-3">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-white/85 text-sm">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
          <p className="text-white/90 text-sm leading-relaxed italic mb-3">
            "CogniGrid helped us connect 50,000 documents into a single queryable knowledge graph.
            Our analysts now get answers in seconds instead of hours."
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-300 to-purple-300 flex items-center justify-center text-xs font-bold text-white">S</div>
            <div>
              <p className="text-white text-xs font-semibold">Sarah Chen</p>
              <p className="text-white/60 text-[10px]">Data Architect, TechCorp</p>
            </div>
            <div className="ml-auto flex gap-0.5">
              {[...Array(5)].map((_, i) => <CheckCircle2 key={i} size={11} className="text-emerald-400" />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-cg-bg">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <img src="/favicon.AI.png" alt="" className="w-8 h-8" />
          <img src="/CogniGrid.AI.png" alt="CogniGrid AI" className="h-6 object-contain" />
        </div>

        <div className="w-full max-w-sm anim-slide-up">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-cg-txt mb-1.5">Welcome back</h2>
            <p className="text-sm text-cg-muted">Sign in to your CogniGrid workspace</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
              <span className="shrink-0">⚠</span> {error}
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Password</label>
                <a href="#" className="text-xs text-cg-primary hover:underline">Forgot password?</a>
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
              type="submit" disabled={loading}
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

          {/* Demo shortcut */}
          <div className="mt-4 p-3 bg-cg-surface border border-cg-border rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-cg-txt">Demo credentials</p>
                <p className="text-[11px] text-cg-faint mt-0.5">admin@cognigrid.ai / demo1234</p>
              </div>
              <button onClick={fillDemo} className="text-xs text-cg-primary hover:underline font-medium">
                Use demo
              </button>
            </div>
          </div>

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
