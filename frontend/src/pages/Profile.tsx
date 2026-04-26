import { useState, useRef } from 'react'
import { Camera, User, Mail, Check, Shield } from 'lucide-react'
import Card from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { useAppStore } from '../store'

export default function Profile() {
  const { currentUser, setAuth, updateAvatar } = useAppStore()
  const token = localStorage.getItem('cg_token') ?? ''

  const [name,  setName]  = useState(currentUser.name)
  const [email, setEmail] = useState(currentUser.email ?? '')
  const [saved, setSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
    <div className="max-w-2xl space-y-6">

      {/* Avatar card */}
      <Card title="Profile Photo">
        <div className="p-6 flex items-center gap-6">
          <div className="relative group shrink-0">
            <Avatar name={currentUser.name} src={currentUser.avatar} size="lg"
              status="online" className="!w-20 !h-20" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100
                flex items-center justify-center transition-all cursor-pointer"
              title="Change photo"
            >
              {avatarUploading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={16} className="text-white" />}
            </button>
            <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="text-base font-semibold text-cg-txt">{currentUser.name}</p>
            <p className="text-sm text-cg-muted mt-0.5">{currentUser.email ?? ''}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold
              bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {currentUser.role}
            </span>
          </div>
        </div>
      </Card>

      {/* Personal info card */}
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

      {/* Security note */}
      <div className="flex items-start gap-3 p-4 bg-cg-s2 border border-cg-border rounded-xl text-xs text-cg-muted">
        <Shield size={14} className="text-cg-primary shrink-0 mt-0.5" />
        <span>Your data is stored locally and never shared with third parties. Authentication is secured via JWT tokens.</span>
      </div>
    </div>
  )
}
