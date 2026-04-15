import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react'

// Hardcoded admin credentials (replace with real backend auth when ready)
const ADMIN_EMAIL    = 'admin@cognigrid.ai'
const ADMIN_PASSWORD = 'CogniGrid@Admin2024'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Simulate async check
    setTimeout(() => {
      if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        sessionStorage.setItem('cg_admin', '1')
        navigate('/admin', { replace: true })
      } else {
        setError('Invalid admin credentials.')
      }
      setLoading(false)
    }, 400)
  }

  return (
    <div className="min-h-screen bg-cg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-cg mb-3">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-cg-txt">Admin Portal</h1>
          <p className="text-sm text-cg-muted mt-1">CogniGrid AI — Administration</p>
        </div>

        <div className="card p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-cg-muted uppercase tracking-wide mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@cognigrid.ai"
                required
                className="w-full px-4 py-2.5 bg-cg-bg border border-cg-border rounded-xl text-sm
                  text-cg-txt placeholder:text-cg-faint focus:outline-none focus:border-cg-primary
                  focus:ring-2 focus:ring-cg-primary/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-cg-muted uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 bg-cg-bg border border-cg-border rounded-xl text-sm
                    text-cg-txt placeholder:text-cg-faint focus:outline-none focus:border-cg-primary
                    focus:ring-2 focus:ring-cg-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cg-faint hover:text-cg-muted"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500">
                <AlertTriangle size={13} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold gradient-primary text-white
                shadow-cg hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {loading ? 'Signing in…' : 'Sign in as Admin'}
            </button>
          </form>

          <div className="pt-2 border-t border-cg-border text-center">
            <a href="/login" className="text-xs text-cg-muted hover:text-cg-primary transition-colors">
              ← Back to user login
            </a>
          </div>
        </div>

        <p className="text-center text-[10px] text-cg-faint mt-5">
          Admin access is restricted. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  )
}
