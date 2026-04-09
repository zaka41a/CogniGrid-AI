import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, ChevronDown, AlertTriangle, Info, CheckCircle2,
  Sun, Moon, Search, Settings, LogOut, User,
  LayoutDashboard, Upload, FileText, GitBranch,
  Cpu, Bot, BarChart2,
} from 'lucide-react'
import { useAppStore } from '../../store'
import { Avatar } from '../ui'
import { Badge } from '../ui/Badge'

const PAGE_META: Record<string, { label: string; icon: React.ReactNode; section: string }> = {
  '/app/dashboard': { label: 'Dashboard',     icon: <LayoutDashboard size={15}/>, section: 'Platform' },
  '/app/ingestion': { label: 'Data Ingestion', icon: <Upload          size={15}/>, section: 'Platform' },
  '/app/documents': { label: 'Documents',      icon: <FileText        size={15}/>, section: 'Platform' },
  '/app/graph':     { label: 'Graph Explorer', icon: <GitBranch       size={15}/>, section: 'Intelligence' },
  '/app/rag':       { label: 'GraphRAG Chat',  icon: <Bot             size={15}/>, section: 'Intelligence' },
  '/app/ai-engine': { label: 'AI Engine',      icon: <Cpu             size={15}/>, section: 'Intelligence' },
  '/app/agent':     { label: 'AI Agent',       icon: <Bot             size={15}/>, section: 'Intelligence' },
  '/app/reports':   { label: 'Reports',        icon: <BarChart2       size={15}/>, section: 'Insights' },
  '/app/alerts':    { label: 'Alerts',         icon: <Bell            size={15}/>, section: 'Insights' },
  '/app/settings':  { label: 'Settings',       icon: <Settings        size={15}/>, section: 'Admin' },
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  critical: <AlertTriangle  size={14} className="text-red-500" />,
  warning:  <AlertTriangle  size={14} className="text-amber-500" />,
  info:     <Info           size={14} className="text-blue-500" />,
  success:  <CheckCircle2   size={14} className="text-emerald-500" />,
}

export default function Navbar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { currentUser, notifications, markNotificationRead, theme, toggleTheme, clearAuth } = useAppStore()

  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen,  setUserOpen]  = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const meta   = PAGE_META[location.pathname]
  const unread = notifications.filter(n => !n.read).length

  /* Cmd+K search shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(s => !s)
      }
      if (e.key === 'Escape') { setSearchOpen(false); setNotifOpen(false); setUserOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const closeAll = () => { setNotifOpen(false); setUserOpen(false); setSearchOpen(false) }

  return (
    <>
      <header className="h-14 bg-cg-surface border-b border-cg-border flex items-center px-4 gap-3 shrink-0 z-10">

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

        {/* Search bar */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded-xl border border-cg-border
            bg-cg-s2 text-cg-muted text-xs hover:border-cg-primary hover:text-cg-txt transition-all"
        >
          <Search size={13} />
          <span>Search…</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded-md bg-cg-surface border border-cg-border text-[10px] font-mono">⌘K</kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        {/* Notifications */}
        <div className="relative">
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
            <div className="absolute right-0 top-12 w-80 card shadow-cg-lg anim-fade-slide-down overflow-hidden z-50">
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
                    onClick={() => { markNotificationRead(n.id) }}
                    className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-cg-s2 transition-colors ${!n.read ? 'bg-indigo-500/5' : ''}`}
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
              <div className="px-4 py-2.5 border-t border-cg-border">
                <button className="text-xs text-cg-primary hover:underline">View all</button>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen(p => !p); setNotifOpen(false) }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-cg-s2 transition-colors"
          >
            <Avatar name={currentUser.name} size="sm" status="online" />
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-cg-txt leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-cg-muted">{currentUser.role}</p>
            </div>
            <ChevronDown size={13} className="text-cg-faint ml-0.5" />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-12 w-52 card shadow-cg-lg anim-fade-slide-down overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-cg-border bg-cg-s2">
                <p className="text-sm font-semibold text-cg-txt">{currentUser.name}</p>
                <p className="text-xs text-cg-muted">{currentUser.role}</p>
              </div>
              <div className="p-1">
                {[
                  { label: 'Profile',   icon: <User     size={14}/>, action: () => navigate('/app/settings') },
                  { label: 'Settings',  icon: <Settings size={14}/>, action: () => navigate('/app/settings') },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => { item.action(); closeAll() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
                <div className="mx-2 my-1 h-px bg-cg-border" />
                <button
                  onClick={() => { clearAuth(); navigate('/login'); closeAll() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Click-outside */}
      {(notifOpen || userOpen || searchOpen) && (
        <div className="fixed inset-0 z-40" onClick={closeAll} />
      )}

      {/* Search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAll} />
          <div className="relative w-full max-w-lg card shadow-cg-lg anim-scale-in">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-cg-border">
              <Search size={16} className="text-cg-muted" />
              <input
                autoFocus
                placeholder="Search documents, nodes, or ask a question…"
                className="flex-1 bg-transparent text-sm text-cg-txt placeholder:text-cg-faint outline-none"
              />
              <kbd className="px-1.5 py-0.5 rounded border border-cg-border text-[10px] text-cg-faint font-mono">ESC</kbd>
            </div>
            <div className="p-4 text-xs text-cg-muted text-center">
              Type to search across your knowledge base…
            </div>
          </div>
        </div>
      )}
    </>
  )
}
