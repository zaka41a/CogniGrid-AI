import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Eye, EyeOff, User, ArrowRight, ArrowLeft, Brain, Network, Zap, Shield, CheckCircle2 } from 'lucide-react'

import { authApi } from '../lib/api'
import { useAppStore } from '../store'

const FEATURES = [
  { icon: <Brain size={16} />,   text: 'AI-powered knowledge graph intelligence', bg: 'bg-blue-500/30',    fg: 'text-blue-200'    },
  { icon: <Network size={16} />, text: 'Multi-hop GraphRAG semantic search',       bg: 'bg-indigo-500/30', fg: 'text-indigo-200'  },
  { icon: <Shield size={16} />,  text: 'Enterprise-grade security & compliance',   bg: 'bg-emerald-500/30',fg: 'text-emerald-200' },
  { icon: <Zap size={16} />,     text: 'Real-time analytics & AI insights',        bg: 'bg-violet-500/30', fg: 'text-violet-200'  },
]

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)          score++
  if (pw.length >= 12)         score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',       color: 'bg-red-500'     }
  if (score <= 2) return { score, label: 'Fair',       color: 'bg-amber-500'   }
  if (score <= 3) return { score, label: 'Good',       color: 'bg-yellow-400'  }
  if (score <= 4) return { score, label: 'Strong',     color: 'bg-emerald-500' }
  return               { score, label: 'Very strong', color: 'bg-emerald-600' }
}

export default function Register() {
  const navigate = useNavigate()
  const setAuth  = useAppStore(s => s.setAuth)

  const [showPassword, setShowPassword] = useState(false)
  const [form,    setForm]    = useState({ fullName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const strength = useMemo(() => passwordStrength(form.password), [form.password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const { data } = await authApi.register({
        fullName: form.fullName,
        email:    form.email,
        password: form.password,
      })
      setAuth(
        { name: data.user.fullName, role: data.user.role, initials: data.user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() },
        data.accessToken,
      )
      setSuccess(true)
      setTimeout(() => navigate('/app/dashboard', { replace: true }), 1000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Registration failed. Please try again.')
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
            <span className="text-blue-300">CogniGrid</span> <span className="text-emerald-400">AI</span>
          </span>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Build your<br />
            <span className="text-blue-300">knowledge graph today</span>
          </h1>
          <p className="text-slate-300/80 text-base leading-relaxed mb-8 max-w-sm">
            Import your documents, let our AI extract entities and relationships,
            then query your knowledge using natural language or GraphRAG.
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
            <span style={{ color: '#3B82F6' }}>CogniGrid</span>
            <span style={{ color: '#10B981' }}> AI</span>
          </span>
        </div>

        <div className="w-full max-w-sm anim-slide-up">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-cg-txt mb-1.5">Create your account</h2>
            <p className="text-sm text-cg-muted">Start using CogniGrid AI for free</p>
          </div>

          {success && (
            <div className="mb-5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> Account created! Redirecting to dashboard…
            </div>
          )}

          {error && !success && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
              <span className="shrink-0">⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Full name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint pointer-events-none" />
                <input
                  type="text" required
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Jane Doe"
                  className="w-full bg-cg-surface border border-cg-border rounded-xl pl-10 pr-4 py-2.5
                    text-sm text-cg-txt placeholder:text-cg-faint
                    focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/20 transition-all"
                />
              </div>
            </div>

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
              <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="w-full bg-cg-surface border border-cg-border rounded-xl px-4 pr-11 py-2.5
                    text-sm text-cg-txt placeholder:text-cg-faint
                    focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/20 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cg-faint hover:text-cg-muted transition-colors">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {form.password && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.score ? strength.color : 'bg-cg-border'
                      }`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-cg-faint">
                    Strength: <span className="font-medium text-cg-muted">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-cg-faint leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="#" className="text-cg-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-cg-primary hover:underline">Privacy Policy</a>.
            </p>

            <button
              type="submit" disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm
                gradient-primary text-white shadow-cg hover:opacity-90 active:scale-[0.99]
                disabled:opacity-60 transition-all duration-150"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Create account <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p className="text-center text-sm text-cg-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-cg-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
