import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Upload, FileText, GitBranch,
  Cpu, Bot, BarChart2, Bell, Settings,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { useAppStore } from '../../store'
import { Avatar } from '../ui/Avatar'

const NAV_GROUPS = [
  {
    label: 'Platform',
    items: [
      { to: '/app/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { to: '/app/ingestion', icon: <Upload          size={18} />, label: 'Data Ingestion' },
      { to: '/app/documents', icon: <FileText        size={18} />, label: 'Documents' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/app/graph',     icon: <GitBranch size={18} />, label: 'Graph Explorer' },
      { to: '/app/rag',       icon: <Bot       size={18} />, label: 'GraphRAG Chat' },
      { to: '/app/ai-engine', icon: <Cpu       size={18} />, label: 'AI Engine' },
      { to: '/app/agent',     icon: <Bot       size={18} />, label: 'AI Agent' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/app/reports', icon: <BarChart2 size={18} />, label: 'Reports' },
      { to: '/app/alerts',  icon: <Bell      size={18} />, label: 'Alerts' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/app/settings', icon: <Settings size={18} />, label: 'Settings' },
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
      sidebarOpen ? 'w-60' : 'w-16',
    ].join(' ')}>

      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-cg-border shrink-0 overflow-hidden">
        {sidebarOpen ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <img src="/favicon.AI.png"    alt=""              className="w-7 h-7 shrink-0" />
            <img src="/CogniGrid.AI.png"  alt="CogniGrid AI"  className="h-6 object-contain" />
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <img src="/favicon.AI.png" alt="CogniGrid" className="w-7 h-7" />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar space-y-0.5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="mx-3 my-2 h-px bg-cg-border" />}
            {sidebarOpen && (
              <p className="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-cg-faint">
                {group.label}
              </p>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                title={!sidebarOpen ? item.label : undefined}
                className={({ isActive }) => [
                  'relative flex items-center gap-3 mx-2 px-2.5 py-2 rounded-xl',
                  'text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-cg-primary-s text-cg-primary'
                    : 'text-cg-muted hover:text-cg-txt2 hover:bg-cg-s2',
                ].join(' ')}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-cg-primary rounded-r-full" />
                    )}
                    <span className="shrink-0">{item.icon}</span>
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                    {/* Collapsed tooltip */}
                    {!sidebarOpen && (
                      <span className={[
                        'absolute left-full ml-3 px-2.5 py-1.5 rounded-lg z-50',
                        'bg-cg-txt text-cg-bg text-xs font-medium whitespace-nowrap shadow-cg-md',
                        'opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150',
                      ].join(' ')}>
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User + collapse */}
      <div className="shrink-0 border-t border-cg-border p-2 space-y-1">
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-cg-s2 transition-colors group cursor-pointer">
            <Avatar name={currentUser.name} size="sm" status="online" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-cg-txt truncate">{currentUser.name}</p>
              <p className="text-xs text-cg-muted truncate">{currentUser.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-cg-faint hover:text-cg-danger opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <Avatar name={currentUser.name} size="sm" status="online" />
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center h-8 rounded-xl text-cg-faint hover:text-cg-txt hover:bg-cg-s2 transition-all"
          title={sidebarOpen ? 'Collapse' : 'Expand'}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </aside>
  )
}
