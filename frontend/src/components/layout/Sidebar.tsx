import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Upload, Share2, Cpu, MessageSquare,
  BellRing, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAppStore } from '../../store'

// ── Logo Icon Mark from cognigrid-ai-brand.html ─────────────────────────────
function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <defs>
        <linearGradient id="cgMark" x1="24" y1="6" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#3B82F6"/>
          <stop offset="100%" stopColor="#22C55E"/>
        </linearGradient>
      </defs>

      {/* Grid connections */}
      <line x1="6"  y1="6"  x2="24" y2="6"  stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="24" y1="6"  x2="42" y2="6"  stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="6"  y1="6"  x2="6"  y2="24" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="42" y1="6"  x2="42" y2="24" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="6"  y1="24" x2="6"  y2="42" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="42" y1="24" x2="42" y2="42" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="6"  y1="42" x2="24" y2="42" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="24" y1="42" x2="42" y2="42" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="6"  y1="6"  x2="24" y2="24" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="42" y1="6"  x2="24" y2="24" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="6"  y1="42" x2="24" y2="24" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>
      <line x1="42" y1="42" x2="24" y2="24" stroke="url(#cgMark)" strokeWidth="0.85" strokeOpacity="0.22"/>

      {/* Animated pulse halos — inner */}
      <circle className="cg-pulse-a" cx="24" cy="6"  r="8"  fill="none" stroke="url(#cgMark)" strokeWidth="0.9"/>
      <circle className="cg-pulse-b" cx="6"  cy="24" r="8"  fill="none" stroke="url(#cgMark)" strokeWidth="0.9"/>
      <circle className="cg-pulse-a" cx="42" cy="24" r="8"  fill="none" stroke="url(#cgMark)" strokeWidth="0.9"/>
      <circle className="cg-pulse-b" cx="24" cy="42" r="8"  fill="none" stroke="url(#cgMark)" strokeWidth="0.9"/>
      {/* Animated pulse halos — outer */}
      <circle className="cg-pulse-a" cx="24" cy="6"  r="12" fill="none" stroke="url(#cgMark)" strokeWidth="0.6" style={{ animationDelay: '0.5s' }}/>
      <circle className="cg-pulse-b" cx="6"  cy="24" r="12" fill="none" stroke="url(#cgMark)" strokeWidth="0.6" style={{ animationDelay: '2.2s' }}/>
      <circle className="cg-pulse-a" cx="42" cy="24" r="12" fill="none" stroke="url(#cgMark)" strokeWidth="0.6" style={{ animationDelay: '0.5s' }}/>
      <circle className="cg-pulse-b" cx="24" cy="42" r="12" fill="none" stroke="url(#cgMark)" strokeWidth="0.6" style={{ animationDelay: '2.2s' }}/>

      {/* Lightning bolt */}
      <polyline
        points="24,6 6,24 42,24 24,42"
        fill="none"
        stroke="url(#cgMark)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Background nodes — subtle */}
      <circle cx="6"  cy="6"  r="2.5" fill="#3B82F6" opacity="0.28"/>
      <circle cx="42" cy="6"  r="2.5" fill="#3B82F6" opacity="0.28"/>
      <circle cx="24" cy="24" r="2.5" fill="#3B82F6" opacity="0.28"/>
      <circle cx="6"  cy="42" r="2.5" fill="#22C55E" opacity="0.28"/>
      <circle cx="42" cy="42" r="2.5" fill="#22C55E" opacity="0.28"/>

      {/* Bolt nodes — prominent */}
      <circle cx="24" cy="6"  r="4.4" fill="url(#cgMark)"/>
      <circle cx="6"  cy="24" r="4.4" fill="url(#cgMark)"/>
      <circle cx="42" cy="24" r="4.4" fill="url(#cgMark)"/>
      <circle cx="24" cy="42" r="4.4" fill="url(#cgMark)"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/ingestion',  label: 'Data Ingestion',  icon: Upload          },
  { to: '/graph',      label: 'Knowledge Graph', icon: Share2          },
  { to: '/ai-engine',  label: 'AI Engine',       icon: Cpu             },
  { to: '/agent',      label: 'AI Agent',        icon: MessageSquare   },
  { to: '/alerts',     label: 'Alerts',          icon: BellRing        },
  { to: '/settings',   label: 'Settings',        icon: Settings        },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const location = useLocation()

  return (
    <aside
      className={`
        relative flex flex-col bg-cg-surface border-r border-cg-border
        transition-all duration-300 ease-in-out flex-shrink-0
        ${sidebarOpen ? 'w-60' : 'w-16'}
      `}
    >
      {/* Logo — Horizontal Lockup */}
      <div className={`flex items-center border-b border-cg-border transition-all duration-300 ${
        sidebarOpen ? 'gap-3 px-4 py-4' : 'justify-center px-0 py-4'
      }`}>
        {sidebarOpen ? (
          /* Full horizontal lockup */
          <>
            <LogoIcon size={36} />
            <div className="overflow-hidden leading-none">
              <p className="text-[15px] font-extrabold tracking-tight text-cg-txt whitespace-nowrap" style={{ letterSpacing: '-0.03em' }}>
                CogniGrid&thinsp;<span style={{ color: '#22C55E', fontWeight: 700 }}>AI</span>
              </p>
              <p className="text-[9px] font-semibold tracking-widest uppercase mt-0.5 whitespace-nowrap"
                style={{ background: 'linear-gradient(90deg,#3B82F6,#22C55E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Decision Intelligence
              </p>
            </div>
          </>
        ) : (
          /* Collapsed — icon only */
          <LogoIcon size={30} />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <NavLink
              key={to}
              to={to}
              title={!sidebarOpen ? label : undefined}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-150 relative
                ${active
                  ? 'bg-green-500/10 text-green-400 border-l-2 border-green-400 pl-[10px]'
                  : 'text-cg-muted hover:bg-cg-s2 hover:text-cg-txt border-l-2 border-transparent'
                }
                ${!sidebarOpen ? 'justify-center' : ''}
              `}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium whitespace-nowrap">{label}</span>
              )}
              {!sidebarOpen && (
                <span className="
                  absolute left-full ml-3 px-2 py-1 bg-cg-border text-cg-txt text-xs
                  rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100
                  pointer-events-none transition-opacity z-50 shadow-lg
                ">
                  {label}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-4">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors text-xs"
        >
          {sidebarOpen
            ? <><ChevronLeft size={14} /><span>Collapse</span></>
            : <ChevronRight size={14} />
          }
        </button>
      </div>
    </aside>
  )
}
