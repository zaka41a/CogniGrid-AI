import { useState } from 'react'
import {
  User, Lock, Mail, Trash2, LogOut, Shield,
  Check, Eye, EyeOff, AlertTriangle, Chrome,
  Cpu, Link2, Bell,
} from 'lucide-react'
import Card from '../components/ui/Card'
import { useAppStore } from '../store'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Avatar } from '../components/ui/Avatar'

const TABS = [
  { key: 'profile',    label: 'Profile',       icon: <User      size={14} /> },
  { key: 'security',   label: 'Security',      icon: <Lock      size={14} /> },
  { key: 'models',     label: 'AI Models',     icon: <Cpu       size={14} /> },
  { key: 'integrations', label: 'Integrations', icon: <Link2    size={14} /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell   size={14} /> },
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

const AI_MODELS = [
  { id: 'embed',    name: 'Sentence Transformer',   type: 'Embedding',     desc: 'MiniLM-L6-v2 — document vectorization',       enabled: true,  threshold: 0.75 },
  { id: 'ner',      name: 'SpaCy NER',               type: 'NER',           desc: 'Named entity recognition for graph building',  enabled: true,  threshold: 0.60 },
  { id: 'rerank',   name: 'Cross-Encoder Reranker',  type: 'Reranker',      desc: 'Result reranking for GraphRAG queries',        enabled: false, threshold: 0.70 },
  { id: 'classify', name: 'Zero-Shot Classifier',    type: 'Classification','desc': 'Document type classification',               enabled: false, threshold: 0.80 },
]

const INTEGRATIONS = [
  { name: 'Apache Kafka',   desc: 'Real-time streaming data ingestion', connected: true,  icon: '⚡' },
  { name: 'Apache Jena',    desc: 'RDF triple store & SPARQL engine',   connected: true,  icon: '🔗' },
  { name: 'Elasticsearch',  desc: 'Log and event search backend',       connected: false, icon: '🔍' },
  { name: 'Grafana',        desc: 'Metrics visualization & dashboards', connected: false, icon: '📊' },
  { name: 'AWS S3',         desc: 'Object storage for data exports',    connected: true,  icon: '☁️' },
]

export default function Settings() {
  const { currentUser, setAuth, clearAuth } = useAppStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')

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
  const [deleteConfirm, setDeleteConfirm] = useState('')

  // AI Models tab
  const [models, setModels] = useState(AI_MODELS)

  // Notification tab
  const [notifSettings, setNotifSettings] = useState({
    emailAlerts:    true,
    ingestionDone:  true,
    agentResponses: false,
    weeklyReport:   true,
  })

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

  const deleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') return
    try {
      await api.delete('/api/auth/me')
    } catch { /* proceed anyway */ }
    clearAuth()
    navigate('/login')
  }

  const toggleModel = (id: string) =>
    setModels(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))

  const setThreshold = (id: string, val: number) =>
    setModels(prev => prev.map(m => m.id === id ? { ...m, threshold: val } : m))

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
                <Avatar name={currentUser.name} src={currentUser.avatar} size="lg" status="online" />
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
                <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} />
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

          {/* Danger zone */}
          <Card title="Danger Zone">
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-cg-txt">Delete Account</p>
                    <p className="text-xs text-cg-muted mt-0.5">
                      This will permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div>
                  <FieldLabel>Type "delete" to confirm</FieldLabel>
                  <Input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="delete"
                  />
                </div>
                <button
                  onClick={deleteAccount}
                  disabled={deleteConfirm.toLowerCase() !== 'delete'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                    bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Trash2 size={14} />
                  Delete My Account
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── AI Models ─────────────────────────────────────────────────────── */}
      {tab === 'models' && (
        <Card title="AI Model Configuration">
          <div className="divide-y divide-cg-border">
            {models.map(model => (
              <div key={model.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-cg-txt">{model.name}</p>
                    <span className="px-2 py-0.5 text-[10px] bg-cg-s2 text-cg-muted rounded border border-cg-border uppercase tracking-wide">
                      {model.type}
                    </span>
                  </div>
                  <p className="text-xs text-cg-muted mt-0.5">{model.desc}</p>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="space-y-1 min-w-44">
                    <p className="text-xs text-cg-muted">
                      Threshold — <span className="text-cg-txt font-semibold">{model.threshold.toFixed(2)}</span>
                    </p>
                    <input
                      type="range" min={0} max={1} step={0.05} value={model.threshold}
                      onChange={e => setThreshold(model.id, Number(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleModel(model.id)}
                      className={`w-11 h-6 rounded-full transition-all relative ${model.enabled ? 'gradient-primary' : 'bg-cg-border'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${model.enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                    <span className={`text-xs font-medium ${model.enabled ? 'text-emerald-500' : 'text-cg-faint'}`}>
                      {model.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Integrations ──────────────────────────────────────────────────── */}
      {tab === 'integrations' && (
        <Card title="Service Integrations">
          <div className="divide-y divide-cg-border">
            {INTEGRATIONS.map(int => (
              <div key={int.name} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-cg-s2 border border-cg-border flex items-center justify-center text-xl flex-shrink-0">
                  {int.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-cg-txt">{int.name}</p>
                  <p className="text-xs text-cg-muted mt-0.5">{int.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${int.connected ? 'text-emerald-500' : 'text-cg-faint'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${int.connected ? 'bg-emerald-500' : 'bg-cg-border'}`} />
                    {int.connected ? 'Connected' : 'Not connected'}
                  </div>
                  <button className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    int.connected
                      ? 'border-red-500/30 text-red-500 hover:bg-red-500/10'
                      : 'border-cg-primary/30 text-cg-primary hover:bg-cg-primary-s'
                  }`}>
                    {int.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      {tab === 'notifications' && (
        <Card title="Notification Preferences">
          <div className="p-6 space-y-4">
            {[
              { key: 'emailAlerts',    label: 'Email Alerts',          desc: 'Receive critical alert notifications by email' },
              { key: 'ingestionDone',  label: 'Ingestion Complete',    desc: 'Notify when a document finishes processing' },
              { key: 'agentResponses', label: 'Agent Responses',       desc: 'Email digest of AI agent activity' },
              { key: 'weeklyReport',   label: 'Weekly Summary Report', desc: 'Weekly digest of platform activity and insights' },
            ].map(item => (
              <div key={item.key} className="flex items-start justify-between gap-4 py-3 border-b border-cg-border/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cg-txt">{item.label}</p>
                  <p className="text-xs text-cg-muted mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 mt-0.5 ${notifSettings[item.key as keyof typeof notifSettings] ? 'gradient-primary' : 'bg-cg-border'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${notifSettings[item.key as keyof typeof notifSettings] ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}
            <SaveBtn saved={false} onClick={() => {}} />
          </div>
        </Card>
      )}

      </div>{/* end content area */}
    </div>
  )
}
