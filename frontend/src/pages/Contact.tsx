import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Send, MapPin, MessageSquare } from 'lucide-react'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setSent(true) }, 1000)
  }

  return (
    <div className="min-h-screen bg-cg-bg text-cg-txt">

      {/* Nav */}
      <header className="border-b border-cg-border bg-cg-surface">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <img src="/CogniGrid.AI.png" alt="CogniGrid AI" className="h-10 w-auto object-contain" />
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm text-cg-muted hover:text-cg-txt transition-colors">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-3xl font-bold text-cg-txt mb-3">Contact us</h1>
          <p className="text-cg-muted text-sm">Have a question or want to learn more? We're here to help.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-cg-surface border border-cg-border rounded-xl p-6 space-y-5">
              {[
                { icon: Mail,          label: 'Email',    value: 'hello@cognigrid.ai' },
                { icon: MessageSquare, label: 'Support',  value: 'support@cognigrid.ai' },
                { icon: MapPin,        label: 'Location', value: 'Remote — Worldwide' },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-cg-muted">{item.label}</p>
                      <p className="text-sm text-cg-txt font-medium">{item.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-cg-surface border border-cg-border rounded-xl p-8">
              {sent ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <Send size={20} className="text-green-400" />
                  </div>
                  <h3 className="font-semibold text-cg-txt mb-1">Message sent!</h3>
                  <p className="text-sm text-cg-muted">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {(['name', 'email'] as const).map(field => (
                      <div key={field} className="space-y-1.5">
                        <label className="text-xs font-medium text-cg-muted capitalize">{field}</label>
                        <input
                          type={field === 'email' ? 'email' : 'text'}
                          required
                          value={form[field]}
                          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                          className="w-full bg-cg-bg border border-cg-border rounded-lg px-3 py-2.5 text-sm text-cg-txt placeholder-cg-faint focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-cg-muted">Subject</label>
                    <input
                      type="text"
                      required
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      className="w-full bg-cg-bg border border-cg-border rounded-lg px-3 py-2.5 text-sm text-cg-txt placeholder-cg-faint focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-cg-muted">Message</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full bg-cg-bg border border-cg-border rounded-lg px-3 py-2.5 text-sm text-cg-txt placeholder-cg-faint focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {loading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Send size={14} /> Send message</>
                    }
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-cg-border mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-cg-faint">© 2026 CogniGrid AI</p>
          <div className="flex gap-5 text-xs text-cg-faint">
            <Link to="/privacy" className="hover:text-cg-muted transition-colors">Privacy</Link>
            <Link to="/terms"   className="hover:text-cg-muted transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
