import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Upload, FileText, GitBranch,
  Bot, Sparkles, Bell, Zap,
  ChevronLeft, ChevronRight, LogOut,
  BarChart3, ShieldCheck, Settings, Network, Shield,
} from 'lucide-react'
import { useAppStore } from '../../store'
import { Avatar } from '../ui/Avatar'
import { ServiceHealthBadge } from '../shared/ServiceHealthBadge'

const NAV_GROUPS = [
  {
    label: 'Platform',
    items: [
      { to: '/app/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard'      },
      { to: '/app/ingestion', icon: <Upload          size={17} />, label: 'Data Ingestion'  },
      { to: '/app/documents', icon: <FileText        size={17} />, label: 'Documents'       },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/app/graph',   icon: <GitBranch size={17} />, label: 'Graph Explorer'   },
      { to: '/app/network', icon: <Network   size={17} />, label: 'Network Topology' },
      { to: '/app/rag',     icon: <Sparkles  size={17} />, label: 'GraphRAG Chat'    },
      { to: '/app/agent',   icon: <Bot       size={17} />, label: 'AI Agent'         },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/app/alerts',        icon: <Bell        size={17} />, label: 'Alerts'       },
      { to: '/app/data-overview', icon: <BarChart3   size={17} />, label: 'Data Overview' },
      { to: '/app/data-quality',  icon: <ShieldCheck size={17} />, label: 'Data Quality'  },
    ],
  },
]

function NavItem({ to, icon, label, sidebarOpen, accent = false }: {
  to: string; icon: React.ReactNode; label: string; sidebarOpen: boolean; accent?: boolean
}) {
  return (
    <NavLink
      to={to}
      title={!sidebarOpen ? label : undefined}
      className={({ isActive }) => [
        'relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-150 group',
        sidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center py-2.5',
        isActive
          ? accent
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-emerald-500/15 text-emerald-400'
          : 'text-white/55 hover:text-white hover:bg-white/8',
      ].join(' ')}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${accent ? 'bg-blue-400' : 'bg-emerald-400'}`} />
          )}
          <span className={`shrink-0 ${isActive ? (accent ? 'text-blue-400' : 'text-emerald-400') : ''}`}>
            {icon}
          </span>
          {sidebarOpen && <span className="truncate">{label}</span>}
          {!sidebarOpen && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg z-50 bg-slate-800 border border-white/15 text-white text-xs font-medium whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, currentUser, clearAuth } = useAppStore()
  const navigate = useNavigate()
  const handleSignOut = () => { clearAuth(); navigate('/login') }

  return (
    <aside className={[
      'flex flex-col shrink-0 h-screen sticky top-0 z-30',
      'bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900',
      'border-r border-white/10',
      'transition-all duration-300 ease-in-out',
      sidebarOpen ? 'w-[220px]' : 'w-[56px]',
    ].join(' ')}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className={`flex items-center h-14 border-b border-white/10 shrink-0 overflow-hidden ${sidebarOpen ? 'px-4' : 'justify-center'}`}>
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-7 h-7 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[13px] tracking-tight truncate leading-tight">
                <span className="text-white">CogniGrid</span>
                <span style={{ color: '#10B981' }}> AI</span>
              </span>
              <span className="text-[9px] text-white/30 truncate leading-tight">
                Knowledge Graph + ASSUME
              </span>
            </div>
          </div>
        ) : (
          <img src="/favicon.AI.png" alt="CogniGrid AI" className="w-7 h-7" />
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar">

        {/* Main nav groups */}
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
            {gi > 0 && <div className="mx-3 my-2 h-px bg-white/10" />}
            {sidebarOpen ? (
              <p className="px-4 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/25 select-none">
                {group.label}
              </p>
            ) : <div className="h-2" />}
            <div className="space-y-0.5 px-2">
              {group.items.map(item => (
                <NavItem key={item.to} {...item} sidebarOpen={sidebarOpen} />
              ))}
            </div>
          </div>
        ))}

        {/* ── Simulation ────────────────────────────────────────────────── */}
        <div className="mx-3 my-2 h-px bg-white/10" />
        {sidebarOpen && (
          <p className="px-4 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/25 select-none">
            Simulation
          </p>
        )}
        {!sidebarOpen && <div className="h-2" />}
        <div className="space-y-0.5 px-2">
          <NavItem
            to="/app/assume"
            icon={<Zap size={17} />}
            label="ASSUME Workspace"
            sidebarOpen={sidebarOpen}
            accent
          />
        </div>

        {/* ── Administration (ADMIN only) ───────────────────────────────── */}
        {currentUser.role === 'ADMIN' && (
          <>
            <div className="mx-3 my-2 h-px bg-white/10" />
            {sidebarOpen && (
              <p className="px-4 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/25 select-none">
                Administration
              </p>
            )}
            {!sidebarOpen && <div className="h-2" />}
            <div className="space-y-0.5 px-2">
              <NavItem
                to="/app/admin"
                icon={<Shield size={17} />}
                label="Admin Console"
                sidebarOpen={sidebarOpen}
                accent
              />
            </div>
          </>
        )}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/10 p-2 space-y-1">

        {/* Global service health */}
        <ServiceHealthBadge compact={!sidebarOpen} />

        {/* User card */}
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/8 transition-colors group cursor-default">
            <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" status="online" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate leading-snug">{currentUser.name}</p>
              <p className="text-[10px] text-white/40 truncate">{currentUser.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-white/25 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-red-500/15"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-1 group relative">
            <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" status="online" />
            <button onClick={handleSignOut} title="Sign out"
              className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg z-50 bg-slate-800 border border-white/15 text-white text-xs font-medium whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              Sign out
            </button>
          </div>
        )}

        {/* Settings */}
        <NavLink to="/app/settings"
          className={({ isActive }) => [
            'flex items-center rounded-xl text-[12px] font-medium transition-all group relative',
            sidebarOpen ? 'gap-2.5 px-2.5 py-2' : 'justify-center py-2',
            isActive ? 'text-white/90 bg-white/10' : 'text-white/30 hover:text-white/70 hover:bg-white/8',
          ].join(' ')}
        >
          {({ isActive }) => (
            <>
              <Settings size={14} className={isActive ? 'text-white/80' : ''} />
              {sidebarOpen && <span>Settings</span>}
              {!sidebarOpen && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg z-50 bg-slate-800 border border-white/15 text-white text-xs font-medium whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  Settings
                </span>
              )}
            </>
          )}
        </NavLink>

        {/* Collapse toggle */}
        <button onClick={toggleSidebar}
          className="w-full flex items-center justify-center h-7 rounded-xl text-white/25 hover:text-white hover:bg-white/8 transition-all"
          title={sidebarOpen ? 'Collapse' : 'Expand'}>
          {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>
    </aside>
  )
}
