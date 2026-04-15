import { Crown, Zap, Infinity, Check } from 'lucide-react'
import Card from '../../components/ui/Card'
import { PLANS } from '../../types'
import type { PlanId } from '../../types'
import { MOCK_ADMIN_USERS } from './mockAdminData'

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  free:  <Zap     size={20} className="text-slate-400" />,
  pro:   <Crown   size={20} className="text-amber-400" />,
  ultra: <Infinity size={20} className="text-violet-400" />,
}

const PLAN_GRADIENT: Record<PlanId, string> = {
  free:  'from-slate-100 to-slate-50',
  pro:   'from-amber-50  to-orange-50',
  ultra: 'from-violet-50 to-indigo-50',
}

export default function AdminPlans() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cg-txt">Subscription Plans</h1>
        <p className="text-sm text-cg-muted mt-0.5">Manage pricing and plan features</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const usersOnPlan = MOCK_ADMIN_USERS.filter(u => u.plan === plan.id).length
          const mrr = plan.price * usersOnPlan
          return (
            <Card key={plan.id}>
              <div className={`p-5 bg-gradient-to-br ${PLAN_GRADIENT[plan.id]} rounded-t-2xl border-b border-cg-border`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                    {PLAN_ICONS[plan.id]}
                  </div>
                  <span className="text-2xl font-bold text-cg-txt">
                    {plan.price === 0 ? '€0' : `€${plan.price}`}
                    <span className="text-sm font-normal text-cg-muted">/mo</span>
                  </span>
                </div>
                <h3 className="text-lg font-bold text-cg-txt">{plan.name}</h3>
                <p className="text-xs text-cg-muted mt-0.5">
                  {plan.uploadsPerMonth === -1 ? 'Unlimited uploads' : `${plan.uploadsPerMonth} uploads / month`}
                </p>
              </div>
              <div className="p-5 space-y-4">
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-cg-muted">
                      <Check size={13} className="text-emerald-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-cg-border grid grid-cols-2 gap-3">
                  <div className="bg-cg-s2 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-cg-txt">{usersOnPlan}</p>
                    <p className="text-[10px] text-cg-faint">subscribers</p>
                  </div>
                  <div className="bg-cg-s2 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-cg-txt">€{mrr.toFixed(0)}</p>
                    <p className="text-[10px] text-cg-faint">MRR</p>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
