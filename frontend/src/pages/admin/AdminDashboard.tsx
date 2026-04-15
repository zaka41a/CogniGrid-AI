import { Users, Upload, CreditCard, TrendingUp, Crown, Zap, Infinity } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import { MOCK_ADMIN_USERS } from './mockAdminData'
import { Avatar } from '../../components/ui/Avatar'
import { PLANS } from '../../types'

const planCounts = PLANS.map(plan => ({
  ...plan,
  count: MOCK_ADMIN_USERS.filter(u => u.plan === plan.id).length,
}))

const recentUsers = MOCK_ADMIN_USERS.slice(0, 5)

const PLAN_ICONS = {
  free:  <Zap     size={13} className="text-slate-400" />,
  pro:   <Crown   size={13} className="text-amber-400" />,
  ultra: <Infinity size={13} className="text-violet-400" />,
}

export default function AdminDashboard() {
  const totalUsers    = MOCK_ADMIN_USERS.length
  const activeUsers   = MOCK_ADMIN_USERS.filter(u => u.status === 'active').length
  const proUsers      = MOCK_ADMIN_USERS.filter(u => u.plan === 'pro').length
  const ultraUsers    = MOCK_ADMIN_USERS.filter(u => u.plan === 'ultra').length
  const totalRevenue  = (proUsers * 11.99 + ultraUsers * 24.99).toFixed(2)

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-cg-txt">Admin Overview</h1>
        <p className="text-sm text-cg-muted mt-0.5">Platform health at a glance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users"     value={totalUsers}    icon={<Users      size={17}/>} iconColor="#6366F1" />
        <StatCard label="Active Users"    value={activeUsers}   icon={<TrendingUp size={17}/>} iconColor="#10B981" />
        <StatCard label="Paid Accounts"   value={proUsers + ultraUsers} icon={<CreditCard size={17}/>} iconColor="#F59E0B" />
        <StatCard label="MRR (€)"         value={totalRevenue}  icon={<Upload     size={17}/>} iconColor="#8B5CF6" suffix="" />
      </div>

      {/* Plan distribution + recent users */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Plan distribution */}
        <Card title="Plan Distribution">
          <div className="p-5 space-y-4">
            {planCounts.map(plan => {
              const pct = Math.round((plan.count / totalUsers) * 100)
              return (
                <div key={plan.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {PLAN_ICONS[plan.id]}
                      <span className="text-sm font-medium text-cg-txt">{plan.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-cg-muted">
                      <span className="font-semibold text-cg-txt">{plan.count}</span>
                      <span>({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-cg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        plan.id === 'free'  ? 'bg-slate-400' :
                        plan.id === 'pro'   ? 'bg-amber-400' : 'bg-violet-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="pt-2 border-t border-cg-border">
              <p className="text-xs text-cg-muted">
                Monthly Revenue: <span className="font-bold text-cg-txt">€{totalRevenue}</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Recent users */}
        <Card title="Recent Users" className="xl:col-span-2">
          <div className="divide-y divide-cg-border">
            {recentUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar name={user.name} src={user.avatar} size="sm" status="online" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cg-txt truncate">{user.name}</p>
                  <p className="text-xs text-cg-faint truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-[10px] font-medium text-cg-muted">
                    {PLAN_ICONS[user.plan]}
                    {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {user.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
