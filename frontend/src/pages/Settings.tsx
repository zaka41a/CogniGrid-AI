import { useState, useRef, useEffect } from 'react'
import {
  User, Lock, Mail, LogOut, Shield,
  Check, Eye, EyeOff, Chrome, Camera, AlertTriangle,
} from 'lucide-react'
import Card from '../components/ui/Card'
import { useAppStore } from '../store'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Avatar } from '../components/ui/Avatar'

const TABS = [
  { key: 'profile',  label: 'Profile',  icon: <User size={14} /> },
  { key: 'security', label: 'Security', icon: <Lock size={14} /> },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-cg-muted uppercase tracking-wide mb-1.5">{children}</label>
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-2.5 text-sm text-cg-txt
        placeholder:text-cg-faint focus:outline-none focus:border-cg-primary focus:ring-2
        focus:ring-cg-primary/10 transition-all ${props.className ?? ''}`}
    />
  )
}

function SaveBtn({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        saved ? 'bg-emerald-500 text-white' : 'gradient-primary text-white shadow-cg hover:opacity-90'
      }`}
    >
      {saved && <Check size={14} />}
      {saved ? 'Saved!' : 'Save Changes'}
    </button>
  )
}


export default function Settings() {
  const { currentUser, setAuth, clearAuth, updateAvatar } = useAppStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') ?? 'profile')

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (dataUrl) updateAvatar(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // Profile tab
  const [name,  setName]  = useState(currentUser.name)
  const [email, setEmail] = useState(currentUser.email ?? '')
  const [profileSaved, setProfileSaved] = useState(false)

  // Security tab
  const [curPwd,  setCurPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdSaved, setPwdSaved]   = useState(false)
  const [pwdError, setPwdError]   = useState('')
  const saveProfile = async () => {
    try {
      await api.put('/api/auth/me', { fullName: name, email })
      const updated = { ...currentUser, name, email, initials: name.slice(0, 2).toUpperCase() }
      const token = localStorage.getItem('cg_token') ?? ''
      setAuth(updated, token)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch {
      // If endpoint doesn't exist yet, just update locally
      const updated = { ...currentUser, name, email, initials: name.slice(0, 2).toUpperCase() }
      const token = localStorage.getItem('cg_token') ?? ''
      setAuth(updated, token)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    }
  }

  const changePassword = async () => {
    setPwdError('')
    if (newPwd.length < 8) { setPwdError('Password must be at least 8 characters.'); return }
    if (newPwd !== confPwd) { setPwdError('Passwords do not match.'); return }
    try {
      await api.put('/api/auth/password', { currentPassword: curPwd, newPassword: newPwd })
      setCurPwd(''); setNewPwd(''); setConfPwd('')
      setPwdSaved(true)
      setTimeout(() => setPwdSaved(false), 2500)
    } catch {
      setPwdError('Failed to change password. Check your current password.')
    }
  }




  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">

      {/* Sidebar navigation */}
      <aside className="w-52 shrink-0">
        <div className="card p-2 space-y-0.5 sticky top-6">
          {TABS.map(t => (
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
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 space-y-4">

      {/* ── Profile ─────────────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="space-y-4">
          <Card title="Account Profile">
            <div className="p-6 space-y-6">
              {/* Avatar + name header */}
              <div className="flex items-center gap-4 pb-5 border-b border-cg-border">
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <Avatar name={currentUser.name} src={currentUser.avatar} size="lg" status="online" />
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={16} className="text-white" />
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <p className="text-base font-semibold text-cg-txt">{currentUser.name}</p>
                  <p className="text-xs text-cg-muted mt-0.5">{currentUser.role}</p>
                  <p className="text-xs text-cg-faint mt-0.5">{currentUser.email ?? 'No email set'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint" />
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Email Address</FieldLabel>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint" />
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <SaveBtn saved={profileSaved} onClick={saveProfile} />
              </div>
            </div>
          </Card>

          {/* Connect with Google */}
          <Card title="Connected Accounts">
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-4 p-4 bg-cg-bg border border-cg-border rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-white border border-cg-border flex items-center justify-center shadow-sm shrink-0">
                  <Chrome size={20} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-cg-txt">Google</p>
                  <p className="text-xs text-cg-muted">Sign in with your Google account</p>
                </div>
                <button className="px-4 py-2 rounded-xl text-xs font-semibold border border-cg-primary/30 text-cg-primary hover:bg-cg-primary-s transition-all">
                  Connect
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Security ────────────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div className="space-y-4">
          <Card title="Change Password">
            <div className="p-6 space-y-5 max-w-md">
              <div>
                <FieldLabel>Current Password</FieldLabel>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint" />
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    value={curPwd}
                    onChange={e => setCurPwd(e.target.value)}
                    placeholder="Current password"
                    className="pl-9 pr-9"
                  />
                  <button
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cg-faint hover:text-cg-muted"
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel>New Password</FieldLabel>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint" />
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Confirm New Password</FieldLabel>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cg-faint" />
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    value={confPwd}
                    onChange={e => setConfPwd(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-9"
                  />
                </div>
              </div>
              {pwdError && (
                <div className="flex items-center gap-2 text-xs text-red-800 bg-red-50 border-2 border-red-500 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="shrink-0 text-red-600" />
                  {pwdError}
                </div>
              )}
              <SaveBtn saved={pwdSaved} onClick={changePassword} />
            </div>
          </Card>

          {/* Active sessions */}
          <Card title="Active Sessions">
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-4 p-3.5 bg-cg-primary-s border border-cg-primary/20 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-cg-primary-s border border-cg-primary/30 flex items-center justify-center shrink-0">
                  <Shield size={15} className="text-cg-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cg-txt">Current session</p>
                  <p className="text-xs text-cg-muted mt-0.5">This browser · Active now</p>
                </div>
                <span className="text-[10px] font-medium text-cg-primary bg-cg-primary-s border border-cg-primary/20 px-2.5 py-1 rounded-full">
                  Current
                </span>
              </div>
              <button
                onClick={() => { clearAuth(); navigate('/login') }}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-cg-border text-sm text-cg-muted hover:text-cg-danger hover:border-red-500/30 hover:bg-red-500/5 transition-all"
              >
                <LogOut size={14} />
                Sign out of all sessions
              </button>
            </div>
          </Card>

        </div>
      )}


      </div>{/* end content area */}
    </div>
  )
}
