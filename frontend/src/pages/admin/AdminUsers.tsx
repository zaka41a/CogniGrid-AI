import { useState } from 'react'
import {
  Search, Crown, Zap, Infinity, X,
  Mail, Calendar, Activity, ShieldOff, Trash2, Eye,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { MOCK_ADMIN_USERS } from './mockAdminData'
import type { AdminUser, PlanId } from '../../types'
import { PLANS } from '../../types'

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  free:  <Zap     size={12} className="text-slate-400" />,
  pro:   <Crown   size={12} className="text-amber-400" />,
  ultra: <Infinity size={12} className="text-violet-400" />,
}

const PLAN_BADGE: Record<PlanId, string> = {
  free:  'bg-slate-100  text-slate-600  border-slate-200',
  pro:   'bg-amber-50   text-amber-700  border-amber-200',
  ultra: 'bg-violet-50  text-violet-700 border-violet-200',
}

function UserDetailPanel({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const plan = PLANS.find(p => p.id === user.plan)!
  const uploadsLimit = plan.uploadsPerMonth
  const pct = uploadsLimit === -1 ? 0 : Math.min(100, Math.round((user.uploadsUsed / uploadsLimit) * 100))

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} src={user.avatar} size="lg" status={user.status === 'active' ? 'online' : 'offline'} />
          <div>
            <h3 className="text-base font-bold text-cg-txt">{user.name}</h3>
            <p className="text-xs text-cg-faint">{user.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PLAN_BADGE[user.plan]}`}>
                {PLAN_ICONS[user.plan]} {plan.name}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
              }`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cg-s2 text-cg-faint hover:text-cg-txt transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Mail      size={13}/>, label: 'Email',       value: user.email },
          { icon: <Activity  size={13}/>, label: 'Role',        value: user.role },
          { icon: <Calendar  size={13}/>, label: 'Joined',      value: user.createdAt },
          { icon: <Calendar  size={13}/>, label: 'Last login',  value: user.lastLogin },
        ].map(item => (
          <div key={item.label} className="bg-cg-s2 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-cg-faint mb-0.5">{item.icon}
              <span className="text-[10px] uppercase tracking-wide">{item.label}</span>
            </div>
            <p className="text-xs font-medium text-cg-txt truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Upload usage */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-cg-muted">Uploads this month</span>
          <span className="font-semibold text-cg-txt">
            {user.uploadsUsed} / {uploadsLimit === -1 ? '∞' : uploadsLimit}
          </span>
        </div>
        {uploadsLimit !== -1 && (
          <div className="h-2 bg-cg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Change plan */}
      <div>
        <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide mb-2">Change Plan</p>
        <div className="flex gap-2">
          {PLANS.map(p => (
            <button
              key={p.id}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                p.id === user.plan
                  ? 'border-cg-primary bg-cg-primary-s text-cg-primary'
                  : 'border-cg-border text-cg-muted hover:border-cg-primary/40 hover:text-cg-txt'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-cg-border">
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
          border border-amber-300 text-amber-600 hover:bg-amber-50 transition-all">
          <ShieldOff size={12} />
          {user.status === 'active' ? 'Suspend' : 'Reactivate'}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
          border border-red-300 text-red-500 hover:bg-red-50 transition-all ml-auto">
          <Trash2 size={12} />
          Delete Account
        </button>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [search,      setSearch]      = useState('')
  const [planFilter,  setPlanFilter]  = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [selected,    setSelected]    = useState<AdminUser | null>(null)

  const filtered = MOCK_ADMIN_USERS.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase())
    const matchPlan   = planFilter   === 'All' || u.plan   === planFilter
    const matchStatus = statusFilter === 'All' || u.status === statusFilter
    return matchSearch && matchPlan && matchStatus
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-cg-txt">User Management</h1>
        <p className="text-sm text-cg-muted mt-0.5">{MOCK_ADMIN_USERS.length} registered users</p>
      </div>

      <div className={`grid gap-6 ${selected ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'}`}>

        {/* Table */}
        <div className={selected ? 'xl:col-span-2' : ''}>
          <Card title={`Users (${filtered.length})`}>
            {/* Filters */}
            <div className="px-5 py-3.5 border-b border-cg-border flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-44">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-faint" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or email…"
                  className="w-full pl-8 pr-3 py-2 bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt
                    placeholder:text-cg-faint focus:outline-none focus:border-cg-primary transition-all"
                />
              </div>
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2 focus:outline-none"
              >
                <option value="All">All Plans</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="ultra">Ultra</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Table body */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cg-border">
                    {['User', 'Plan', 'Uploads', 'Status', 'Last Login', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <tr
                      key={user.id}
                      className={`border-b border-cg-border/50 transition-colors cursor-pointer ${
                        selected?.id === user.id ? 'bg-cg-primary-s' : 'hover:bg-cg-s2'
                      }`}
                      onClick={() => setSelected(selected?.id === user.id ? null : user)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} src={user.avatar} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-cg-txt truncate">{user.name}</p>
                            <p className="text-[10px] text-cg-faint truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1 w-fit px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${PLAN_BADGE[user.plan]}`}>
                          {PLAN_ICONS[user.plan]}
                          {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-cg-muted">
                        {user.uploadsUsed}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-cg-muted whitespace-nowrap">
                        {user.lastLogin}
                      </td>
                      <td className="px-5 py-3.5">
                        <button className="p-1.5 rounded-lg hover:bg-cg-primary-s text-cg-faint hover:text-cg-primary transition-colors">
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-cg-faint text-sm">
                        No users match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="xl:col-span-1">
            <UserDetailPanel user={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
