import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Upload, FileText, GitBranch,
  Bot, Sparkles, Bell, Settings,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { useAppStore } from '../../store'
import { Avatar } from '../ui/Avatar'

const NAV_GROUPS = [
  {
    label: 'Platform',
    items: [
      { to: '/app/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard'     },
      { to: '/app/ingestion', icon: <Upload          size={17} />, label: 'Data Ingestion' },
      { to: '/app/documents', icon: <FileText        size={17} />, label: 'Documents'      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/app/graph', icon: <GitBranch size={17} />, label: 'Graph Explorer' },
      { to: '/app/rag',   icon: <Sparkles  size={17} />, label: 'GraphRAG Chat'  },
      { to: '/app/agent', icon: <Bot       size={17} />, label: 'AI Agent'       },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/app/alerts',   icon: <Bell     size={17} />, label: 'Alerts'   },
      { to: '/app/settings', icon: <Settings size={17} />, label: 'Settings' },
    ],
  },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, currentUser, clearAuth } = useAppStore()
  const navigate = useNavigate()

  const handleSignOut = () => { clearAuth(); navigate('/login') }

  return (
    <aside className={[
      'flex flex-col shrink-0 h-screen sticky top-0 z-30',
      'bg-cg-surface border-r border-cg-border',
      'transition-all duration-300 ease-in-out',
      sidebarOpen ? 'w-[220px]' : 'w-[56px]',
    ].join(' ')}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className={`flex items-center h-14 border-b border-cg-border shrink-0 overflow-hidden ${sidebarOpen ? 'px-4' : 'justify-center'}`}>
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-7 h-7 shrink-0" />
            <span className="font-bold text-[13px] tracking-tight truncate">
              <span style={{ color: '#3B82F6' }}>CogniGrid</span>
              <span style={{ color: '#10B981' }}> AI</span>
            </span>
          </div>
        ) : (
          <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-7 h-7" />
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>

            {/* Group separator + label */}
            {gi > 0 && <div className="mx-3 my-2 h-px bg-cg-border" />}

            {sidebarOpen ? (
              <p className="px-4 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cg-faint select-none">
                {group.label}
              </p>
            ) : (
              <div className="h-2" />
            )}

            {/* Nav items */}
            <div className="space-y-0.5 px-2">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={!sidebarOpen ? item.label : undefined}
                  className={({ isActive }) => [
                    'relative flex items-center rounded-xl',
                    'text-[13px] font-medium transition-all duration-150 group',
                    sidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center py-2.5',
                    isActive
                      ? 'bg-cg-primary-s text-cg-primary'
                      : 'text-cg-muted hover:text-cg-txt hover:bg-cg-s2',
                  ].join(' ')}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-cg-primary rounded-r-full" />
                      )}

                      <span className={`shrink-0 ${isActive ? 'text-cg-primary' : ''}`}>
                        {item.icon}
                      </span>

                      {sidebarOpen && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {/* Collapsed tooltip */}
                      {!sidebarOpen && (
                        <span className={[
                          'absolute left-full ml-3 px-2.5 py-1.5 rounded-lg z-50',
                          'bg-cg-txt text-cg-bg text-xs font-medium whitespace-nowrap',
                          'shadow-lg pointer-events-none',
                          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                        ].join(' ')}>
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-cg-border p-2 space-y-1">

        {/* User card */}
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-cg-s2 transition-colors group cursor-default">
            <Avatar name={currentUser.name} size="sm" status="online" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-cg-txt truncate leading-snug">{currentUser.name}</p>
              <p className="text-[10px] text-cg-muted truncate">{currentUser.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-cg-faint hover:text-cg-danger opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-red-50"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-1 group relative">
            <Avatar name={currentUser.name} size="sm" status="online" />
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg z-50 bg-cg-txt text-cg-bg text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            >
              Sign out
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center h-7 rounded-xl text-cg-faint hover:text-cg-txt hover:bg-cg-s2 transition-all"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>
    </aside>
  )
}
