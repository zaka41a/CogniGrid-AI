import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, Settings,
  ChevronLeft, Shield, LogOut,
} from 'lucide-react'
import { useAppStore } from '../../store'
import { Avatar } from '../../components/ui/Avatar'

const NAV = [
  { to: '/admin',        icon: <LayoutDashboard size={16}/>, label: 'Overview',        end: true },
  { to: '/admin/users',  icon: <Users           size={16}/>, label: 'Users'            },
  { to: '/admin/plans',  icon: <CreditCard      size={16}/>, label: 'Subscriptions'    },
  { to: '/admin/settings', icon: <Settings      size={16}/>, label: 'Platform Settings'},
]

export default function AdminLayout() {
  const { currentUser } = useAppStore()
  const navigate = useNavigate()

  const handleAdminSignOut = () => {
    sessionStorage.removeItem('cg_admin')
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-cg-bg">

      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-cg-surface border-r border-cg-border flex flex-col sticky top-0 h-screen">

        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-cg-border shrink-0">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-cg">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-cg-txt">Admin Panel</p>
            <p className="text-[9px] text-cg-faint">CogniGrid AI</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-cg-primary-s text-cg-primary border border-cg-primary/20'
                  : 'text-cg-muted hover:text-cg-txt hover:bg-cg-s2',
              ].join(' ')}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-cg-border space-y-1">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-all"
          >
            <ChevronLeft size={13} /> Back to App
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-cg-s2 transition-colors group">
            <Avatar name={currentUser.name} src={currentUser.avatar} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-cg-txt truncate">{currentUser.name}</p>
              <p className="text-[9px] text-cg-faint">Super Admin</p>
            </div>
            <button
              onClick={handleAdminSignOut}
              className="text-cg-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              title="Sign out of admin"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
