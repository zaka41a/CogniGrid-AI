import { useState, useRef } from 'react'
import {
  Camera, User, Mail, Crown, Zap, Infinity,
  Check, Shield, ChevronRight,
} from 'lucide-react'
import Card from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { useAppStore } from '../store'
import { PLANS } from '../types'
import type { PlanId } from '../types'

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  free:  <Zap     size={16} className="text-slate-400" />,
  pro:   <Crown   size={16} className="text-amber-400" />,
  ultra: <Infinity size={16} className="text-violet-400" />,
}

const PLAN_COLORS: Record<PlanId, string> = {
  free:  'border-slate-200  bg-slate-50  dark:border-slate-700  dark:bg-slate-800/30',
  pro:   'border-amber-300  bg-amber-50  dark:border-amber-700  dark:bg-amber-900/20',
  ultra: 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20',
}

function UsageMeter({ used, limit }: { used: number; limit: number }) {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-cg-muted">Uploads this month</span>
        <span className="font-semibold text-cg-txt">
          {used} / {limit === -1 ? '∞' : limit}
        </span>
      </div>
      {limit !== -1 && (
        <div className="h-2 bg-cg-border rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

const PROFILE_TABS = [
  { key: 'info',         label: 'Personal Info',  icon: <User   size={14} /> },
  { key: 'subscription', label: 'Subscription',   icon: <Crown  size={14} /> },
]

export default function Profile() {
  const { currentUser, setAuth, updateAvatar } = useAppStore()
  const token = localStorage.getItem('cg_token') ?? ''

  const [tab,   setTab]   = useState('info')
  const [name,  setName]  = useState(currentUser.name)
  const [email, setEmail] = useState(currentUser.email ?? '')
  const [saved, setSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const plan        = PLANS.find(p => p.id === (currentUser.plan ?? 'free'))!
  const uploadsUsed = currentUser.uploadsUsed ?? 0

  const saveProfile = () => {
    const updated = { ...currentUser, name, email, initials: name.slice(0, 2).toUpperCase() }
    setAuth(updated, token)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB'); return }
    setAvatarUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      updateAvatar(reader.result as string)
      setAvatarUploading(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">

      {/* Sidebar */}
      <aside className="w-52 shrink-0">
        <div className="card overflow-hidden sticky top-6">
          {/* Avatar block */}
          <div className="p-4 border-b border-cg-border">
            {/* Avatar + change photo */}
            <div className="flex justify-center mb-3">
              <div className="relative group">
                <Avatar name={currentUser.name} src={currentUser.avatar} size="lg"
                  status="online" className="!w-14 !h-14" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100
                    flex items-center justify-center transition-all cursor-pointer"
                  title="Change photo"
                >
                  {avatarUploading
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={14} className="text-white" />}
                </button>
                <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </div>
            </div>
            {/* Name + role + plan — single block, no repetition */}
            <div className="text-center space-y-0.5">
              <p className="text-sm font-semibold text-cg-txt truncate">{currentUser.name}</p>
              <p className="text-[10px] text-cg-faint uppercase tracking-wide">{currentUser.role}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PLAN_COLORS[currentUser.plan ?? 'free']}`}>
                {PLAN_ICONS[currentUser.plan ?? 'free']}
                {plan.name} plan
              </span>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="p-2 space-y-0.5">
            {PROFILE_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  tab === t.key
                    ? 'bg-cg-primary-s text-cg-primary border border-cg-primary/20'
                    : 'text-cg-muted hover:text-cg-txt hover:bg-cg-s2'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 space-y-5 min-w-0">

        {tab === 'info' && (
          <Card title="Personal Information">
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-cg-muted uppercase tracking-wide mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint" />
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-9 pr-4 py-2.5 bg-cg-bg border border-cg-border rounded-xl text-sm
                        text-cg-txt focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cg-muted uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-cg-bg border border-cg-border rounded-xl text-sm
                        text-cg-txt focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/10"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-cg-muted uppercase tracking-wide mb-1.5">Role</label>
                <input
                  value={currentUser.role}
                  readOnly
                  className="w-full px-4 py-2.5 bg-cg-s2 border border-cg-border rounded-xl text-sm text-cg-muted cursor-not-allowed"
                />
              </div>
              <button
                onClick={saveProfile}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  saved ? 'bg-emerald-500 text-white' : 'gradient-primary text-white shadow-cg hover:opacity-90'
                }`}
              >
                {saved && <Check size={14} />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </Card>
        )}

        {tab === 'subscription' && (
          <Card title="Subscription & Usage">
            <div className="p-6 space-y-5">

              {/* Current plan */}
              <div className={`p-4 rounded-xl border ${PLAN_COLORS[currentUser.plan ?? 'free']}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {PLAN_ICONS[currentUser.plan ?? 'free']}
                    <span className="font-semibold text-cg-txt">{plan.name} Plan</span>
                  </div>
                  <span className="text-sm font-bold text-cg-txt">
                    {plan.price === 0 ? 'Free' : `€${plan.price}/mo`}
                  </span>
                </div>
                <UsageMeter used={uploadsUsed} limit={plan.uploadsPerMonth} />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.features.map(f => (
                    <span key={f} className="flex items-center gap-1 text-[10px] text-cg-muted">
                      <Check size={9} className="text-emerald-500" />{f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Available plans */}
              <div>
                <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide mb-3">Available Plans</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLANS.map(p => {
                    const isCurrent = p.id === (currentUser.plan ?? 'free')
                    return (
                      <div
                        key={p.id}
                        className={`relative p-4 rounded-xl border transition-all ${
                          isCurrent
                            ? 'border-cg-primary bg-cg-primary-s'
                            : 'border-cg-border hover:border-cg-primary/40 cursor-pointer'
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute top-2 right-2 text-[9px] bg-cg-primary text-white px-2 py-0.5 rounded-full font-bold">
                            CURRENT
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          {PLAN_ICONS[p.id]}
                          <span className="font-semibold text-sm text-cg-txt">{p.name}</span>
                        </div>
                        <p className="text-lg font-bold text-cg-txt mb-3">
                          {p.price === 0 ? 'Free' : `€${p.price}`}
                          {p.price > 0 && <span className="text-xs font-normal text-cg-muted">/mo</span>}
                        </p>
                        <ul className="space-y-1 mb-4">
                          {p.features.map(f => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-cg-muted">
                              <Check size={10} className="text-emerald-500 shrink-0" />{f}
                            </li>
                          ))}
                        </ul>
                        {!isCurrent && (
                          <button
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold
                              gradient-primary text-white hover:opacity-90 transition-all"
                            onClick={() => alert(`Stripe checkout for ${p.name} plan — integrate Stripe publishable key`)}
                          >
                            {p.price === 0 ? 'Downgrade' : 'Upgrade'}
                            <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-cg-s2 border border-cg-border rounded-xl text-xs text-cg-muted">
                <Shield size={14} className="text-cg-primary shrink-0 mt-0.5" />
                <span>Payments are processed securely via <strong className="text-cg-txt">Stripe</strong>. Your card details are never stored on our servers.</span>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
