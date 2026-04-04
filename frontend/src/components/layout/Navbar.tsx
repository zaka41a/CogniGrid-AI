import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, ChevronDown, Check, AlertTriangle, Info, Sun, Moon } from 'lucide-react'
import { useAppStore } from '../../store'

const BREADCRUMB_MAP: Record<string, string[]> = {
  '/dashboard':  ['Platform', 'Dashboard'],
  '/ingestion':  ['Platform', 'Data Ingestion'],
  '/graph':      ['Platform', 'Knowledge Graph'],
  '/ai-engine':  ['Platform', 'AI Engine'],
  '/agent':      ['Platform', 'AI Agent'],
  '/alerts':     ['Platform', 'Alerts Center'],
  '/settings':   ['Platform', 'Settings'],
}

export default function Navbar() {
  const location = useLocation()
  const { currentUser, notifications, markNotificationRead, theme, toggleTheme } = useAppStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const crumbs = BREADCRUMB_MAP[location.pathname] ?? ['Platform']
  const unread = notifications.filter((n) => !n.read).length

  return (
    <header className="h-14 bg-cg-surface border-b border-cg-border flex items-center px-5 gap-4 flex-shrink-0 z-10">
      {/* Breadcrumb */}
      <nav className="flex-1 flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-cg-faint">/</span>}
            <span className={i === crumbs.length - 1 ? 'text-cg-txt font-medium' : 'text-cg-faint'}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        className="p-2 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
      >
        {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen((p) => !p); setUserOpen(false) }}
          className="relative p-2 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-11 w-80 bg-cg-surface border border-cg-border rounded-xl shadow-xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cg-border">
              <p className="text-sm font-semibold text-cg-txt">Notifications</p>
              {unread > 0 && <span className="text-xs text-green-400">{unread} unread</span>}
            </div>
            <div className="divide-y divide-cg-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`px-4 py-3 flex gap-3 cursor-pointer hover:bg-cg-s2 transition-colors ${!n.read ? 'bg-green-500/5' : ''}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {n.type === 'critical' && <AlertTriangle size={14} className="text-red-400" />}
                    {n.type === 'warning'  && <AlertTriangle size={14} className="text-yellow-400" />}
                    {n.type === 'info'     && <Info size={14} className="text-green-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-cg-txt truncate">{n.title}</p>
                    <p className="text-xs text-cg-muted truncate">{n.message}</p>
                    <p className="text-[10px] text-cg-faint mt-0.5">{n.time}</p>
                  </div>
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => { setUserOpen((p) => !p); setNotifOpen(false) }}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-cg-s2 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow shadow-green-500/20">
            {currentUser.initials}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-medium text-cg-txt leading-tight">{currentUser.name}</p>
            <p className="text-[10px] text-cg-muted">{currentUser.role}</p>
          </div>
          <ChevronDown size={14} className="text-cg-muted" />
        </button>

        {userOpen && (
          <div className="absolute right-0 top-11 w-48 bg-cg-surface border border-cg-border rounded-xl shadow-xl z-50">
            <div className="px-4 py-3 border-b border-cg-border">
              <p className="text-xs font-semibold text-cg-txt">{currentUser.name}</p>
              <p className="text-[10px] text-cg-muted">{currentUser.role}</p>
            </div>
            {[
              { label: 'Profile', icon: Check },
              { label: 'Settings', icon: Check },
              { label: 'Sign out', icon: Check },
            ].map(({ label }) => (
              <button
                key={label}
                className="w-full text-left px-4 py-2.5 text-xs text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click-outside overlay */}
      {(notifOpen || userOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setNotifOpen(false); setUserOpen(false) }}
        />
      )}
    </header>
  )
}
