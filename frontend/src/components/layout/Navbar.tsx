import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, ChevronDown, AlertTriangle, Info, CheckCircle2,
  Settings, LogOut, User, Zap,
  LayoutDashboard, Upload, FileText, GitBranch,
  Bot, Sparkles,
} from 'lucide-react'
import { useAppStore } from '../../store'
import { Avatar } from '../ui'
import { Badge } from '../ui/Badge'

const PAGE_META: Record<string, { label: string; icon: React.ReactNode; section: string }> = {
  '/app/dashboard': { label: 'Dashboard',     icon: <LayoutDashboard size={15}/>, section: 'Platform'     },
  '/app/ingestion': { label: 'Data Ingestion', icon: <Upload          size={15}/>, section: 'Platform'     },
  '/app/documents': { label: 'Documents',      icon: <FileText        size={15}/>, section: 'Platform'     },
  '/app/graph':     { label: 'Graph Explorer',   icon: <GitBranch size={15}/>, section: 'Intelligence' },
  '/app/network':   { label: 'Network Topology', icon: <Zap       size={15}/>, section: 'Intelligence' },
  '/app/rag':       { label: 'GraphRAG Chat',     icon: <Sparkles  size={15}/>, section: 'Intelligence' },
  '/app/agent':     { label: 'AI Agent',       icon: <Bot             size={15}/>, section: 'Intelligence' },
  '/app/alerts':    { label: 'Alerts',         icon: <Bell            size={15}/>, section: 'Operations'   },
  '/app/settings':  { label: 'Settings',       icon: <Settings        size={15}/>, section: 'Operations'   },
  '/app/profile':   { label: 'My Profile',     icon: <User            size={15}/>, section: 'Account'      },
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  critical: <AlertTriangle size={14} className="text-red-500"     />,
  warning:  <AlertTriangle size={14} className="text-amber-500"   />,
  info:     <Info          size={14} className="text-blue-500"    />,
  success:  <CheckCircle2  size={14} className="text-emerald-500" />,
}

export default function Navbar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { currentUser, notifications, markNotificationRead, markAllRead, clearAuth } = useAppStore()

  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen,  setUserOpen]  = useState(false)

  const notifRef  = useRef<HTMLDivElement>(null)
  const userRef   = useRef<HTMLDivElement>(null)

  const meta   = PAGE_META[location.pathname]
  const unread = notifications.filter(n => !n.read).length

  // ── Keyboard shortcut (Escape) ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setNotifOpen(false); setUserOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Click-outside — NO overlay div, uses document listener ──────────────────
  useEffect(() => {
    if (!notifOpen && !userOpen) return
    const handler = (e: MouseEvent) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
      if (userOpen && userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    // Use capture phase so we get the event before anything else
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [notifOpen, userOpen])

  const go = (path: string) => { navigate(path); setUserOpen(false); setNotifOpen(false) }

  return (
    <>
      <header className="h-14 bg-cg-surface border-b border-cg-border flex items-center px-4 gap-3 shrink-0 relative z-20">

        {/* Breadcrumb */}
        <nav className="flex-1 flex items-center gap-1.5 text-sm min-w-0">
          {meta && (
            <>
              <span className="text-cg-faint text-xs hidden sm:block">{meta.section}</span>
              <span className="text-cg-faint text-xs hidden sm:block">/</span>
              <span className="flex items-center gap-1.5 text-cg-txt font-medium text-sm">
                <span className="text-cg-primary">{meta.icon}</span>
                {meta.label}
              </span>
            </>
          )}
        </nav>

        {/* ── Notifications ─────────────────────────────────────────────────── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(p => !p); setUserOpen(false) }}
            className="relative p-2 rounded-xl text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
          >
            <Bell size={17} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-cg-surface" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 card shadow-cg-lg anim-fade-slide-down overflow-hidden"
              style={{ zIndex: 9999 }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-cg-border">
                <p className="text-sm font-semibold text-cg-txt">Notifications</p>
                {unread > 0 && <Badge variant="primary">{unread} new</Badge>}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-cg-border">
                {notifications.length === 0 ? (
                  <p className="text-xs text-cg-muted text-center py-6">All caught up!</p>
                ) : notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-cg-s2 transition-colors ${!n.read ? 'bg-cg-primary-s' : ''}`}
                  >
                    <span className="mt-0.5 shrink-0">{NOTIF_ICONS[n.type] ?? NOTIF_ICONS.info}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-cg-txt truncate">{n.title}</p>
                      <p className="text-xs text-cg-muted truncate">{n.message}</p>
                      <p className="text-[10px] text-cg-faint mt-0.5">{n.time}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-cg-primary mt-1.5 shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-cg-border flex items-center justify-between">
                <button className="text-xs text-cg-primary hover:underline">View all</button>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-cg-muted hover:text-cg-txt transition-colors">
                    Mark all read
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── User menu ─────────────────────────────────────────────────────── */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setUserOpen(p => !p); setNotifOpen(false) }}
            className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl hover:bg-cg-s2 transition-colors"
          >
            <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" status="online" />
            <ChevronDown size={13} className="text-cg-faint" />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-12 w-52 card shadow-cg-lg anim-fade-slide-down overflow-hidden"
              style={{ zIndex: 9999 }}>
              <div className="p-1">
                <button
                  onClick={() => go('/app/profile')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
                >
                  <User size={14} /> Profile
                </button>
                <button
                  onClick={() => go('/app/settings')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
                >
                  <Settings size={14} /> Settings
                </button>
                <div className="mx-2 my-1 h-px bg-cg-border" />
                <button
                  onClick={() => { clearAuth(); navigate('/login') }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

    </>
  )
}
