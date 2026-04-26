import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Users, ShieldCheck, UserX, UserCheck, KeyRound, Trash2, RefreshCw,
  Search, Eye, EyeOff, Crown, AlertTriangle, CheckCircle2, Clock, Mail,
  Calendar, Loader2, Shield,
} from 'lucide-react'
import Card from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Avatar } from '../components/ui/Avatar'
import { useAppStore } from '../store'
import { adminApi, type AdminUser, type AdminStats } from '../lib/api'

type RoleFilter   = 'all' | 'ADMIN' | 'ANALYST' | 'VIEWER'
type StatusFilter = 'all' | 'active' | 'suspended'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch { return '—' }
}

function roleBadge(role: string) {
  if (role === 'ADMIN')   return <Badge variant="accent"  dot><Crown size={10} className="mr-0.5" />Admin</Badge>
  if (role === 'ANALYST') return <Badge variant="primary" dot>Analyst</Badge>
  return <Badge variant="neutral" dot>Viewer</Badge>
}

function initials(name: string): string {
  return name.split(' ').map(s => s[0] ?? '').filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

export default function Admin() {
  const { currentUser } = useAppStore()
  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [stats,   setStats]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string>('')
  const [search,  setSearch]  = useState('')
  const [roleFilter,   setRoleFilter]   = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [viewing,         setViewing]         = useState<AdminUser | null>(null)
  const [resettingFor,    setResettingFor]    = useState<AdminUser | null>(null)
  const [confirmDelete,   setConfirmDelete]   = useState<AdminUser | null>(null)
  const [busyId,          setBusyId]          = useState<string | null>(null)
  const [toast,           setToast]           = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [u, s] = await Promise.all([adminApi.users(), adminApi.stats()])
      setUsers(u.data)
      setStats(s.data)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      if (e.response?.status === 403) {
        setError('Forbidden — your account does not have admin rights.')
      } else if (!e.response) {
        setError('Gateway unreachable. Make sure the backend gateway is running on :8080.')
      } else {
        setError(e.response?.data?.message ?? 'Failed to load admin data.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Auto-clear toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = useMemo(() => users.filter(u => {
    const matchSearch =
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.fullName ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter   === 'all' || u.role === roleFilter
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.active : !u.active)
    return matchSearch && matchRole && matchStatus
  }), [users, search, roleFilter, statusFilter])

  const updateLocal = (updated: AdminUser) =>
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSuspend = async (u: AdminUser) => {
    if (u.email.toLowerCase() === currentUser.email?.toLowerCase()) {
      setToast({ kind: 'err', msg: "You can't suspend your own account" })
      return
    }
    setBusyId(u.id)
    try {
      const { data } = await adminApi.suspendUser(u.id)
      updateLocal(data)
      setToast({ kind: 'ok', msg: `${data.email} suspended` })
    } catch {
      setToast({ kind: 'err', msg: 'Suspend failed' })
    } finally {
      setBusyId(null)
    }
  }

  const handleActivate = async (u: AdminUser) => {
    setBusyId(u.id)
    try {
      const { data } = await adminApi.activateUser(u.id)
      updateLocal(data)
      setToast({ kind: 'ok', msg: `${data.email} activated` })
    } catch {
      setToast({ kind: 'err', msg: 'Activate failed' })
    } finally {
      setBusyId(null)
    }
  }

  const handleRoleChange = async (u: AdminUser, role: 'ADMIN' | 'ANALYST' | 'VIEWER') => {
    setBusyId(u.id)
    try {
      const { data } = await adminApi.updateUser(u.id, { role })
      updateLocal(data)
      setToast({ kind: 'ok', msg: `${data.email} → ${role}` })
    } catch {
      setToast({ kind: 'err', msg: 'Role update failed' })
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    const u = confirmDelete
    setBusyId(u.id)
    try {
      await adminApi.deleteUser(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
      setToast({ kind: 'ok', msg: `${u.email} deleted` })
      setConfirmDelete(null)
      // Refresh stats
      adminApi.stats().then(r => setStats(r.data)).catch(() => undefined)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setToast({ kind: 'err', msg: e.response?.data?.message ?? 'Delete failed' })
    } finally {
      setBusyId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-cg-txt flex items-center gap-2">
            <Shield size={18} className="text-violet-500" />
            Admin Console
          </h1>
          <p className="text-xs text-cg-muted">User management — visible only to administrators</p>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cg-border text-sm font-medium text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={[
          'fixed top-5 right-5 z-50 anim-slide-up px-4 py-3 rounded-xl shadow-cg-lg flex items-center gap-2 text-sm font-medium',
          toast.kind === 'ok'
            ? 'bg-emerald-500 text-white'
            : 'bg-red-500 text-white',
        ].join(' ')}>
          {toast.kind === 'ok'
            ? <CheckCircle2 size={16} />
            : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users"  value={loading ? '…' : (stats?.totalUsers ?? users.length)}
          icon={<Users size={17} />}        iconColor="#6366F1" />
        <StatCard label="Active"        value={loading ? '…' : (stats?.activeUsers ?? users.filter(u => u.active).length)}
          icon={<UserCheck size={17} />}    iconColor="#10B981" />
        <StatCard label="Suspended"     value={loading ? '…' : (stats?.suspendedUsers ?? users.filter(u => !u.active).length)}
          icon={<UserX size={17} />}        iconColor="#F59E0B" />
        <StatCard label="Administrators" value={loading ? '…' : (stats?.admins ?? users.filter(u => u.role === 'ADMIN').length)}
          icon={<ShieldCheck size={17} />}  iconColor="#8B5CF6" />
      </div>

      {/* Error banner */}
      {error && (
        <div className="card p-4 border-l-4 border-l-red-500 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-cg-txt mb-0.5">Couldn't load admin data</p>
            <p className="text-cg-muted">{error}</p>
          </div>
        </div>
      )}

      {/* Users table */}
      <Card>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-cg-border flex-wrap">
          <div className="relative flex-1 min-w-52">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-faint pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-cg-bg border border-cg-border rounded-lg pl-8 pr-3 py-2 text-sm text-cg-txt
                placeholder:text-cg-faint focus:outline-none focus:border-cg-primary focus:ring-2
                focus:ring-cg-primary/15 transition-all"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'ADMIN', 'ANALYST', 'VIEWER'] as const).map(r => (
              <button key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  roleFilter === r
                    ? 'bg-cg-primary-s text-cg-primary border border-cg-primary/30'
                    : 'text-cg-muted hover:text-cg-txt hover:bg-cg-s2'
                }`}>
                {r === 'all' ? 'All roles' : r.toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'suspended'] as const).map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  statusFilter === s
                    ? 'bg-cg-primary-s text-cg-primary border border-cg-primary/30'
                    : 'text-cg-muted hover:text-cg-txt hover:bg-cg-s2'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-border">
                {['User', 'Role', 'Status', 'Last login', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-cg-faint text-sm">
                  <Loader2 size={18} className="inline-block animate-spin mr-2" /> Loading users…
                </td></tr>
              )}
              {!loading && filtered.map(u => {
                const isSelf = u.email.toLowerCase() === currentUser.email?.toLowerCase()
                return (
                  <tr key={u.id} className="border-b border-cg-border/50 hover:bg-cg-s2 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName || u.email} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 leading-tight">
                            <span className="text-cg-txt font-medium truncate max-w-[180px]">
                              {u.fullName || '—'}
                            </span>
                            {isSelf && <Badge variant="info">You</Badge>}
                          </div>
                          <span className="text-xs text-cg-faint flex items-center gap-1 mt-0.5">
                            <Mail size={10} />
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u, e.target.value as 'ADMIN' | 'ANALYST' | 'VIEWER')}
                        disabled={busyId === u.id || isSelf}
                        className="bg-cg-bg border border-cg-border rounded-lg px-2 py-1 text-xs font-medium text-cg-txt
                          focus:outline-none focus:border-cg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="ANALYST">ANALYST</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.active
                        ? <Badge variant="success" dot>Active</Badge>
                        : <Badge variant="warning" dot>Suspended</Badge>}
                    </td>
                    <td className="px-5 py-3.5 text-cg-muted text-xs whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Clock size={11} />{fmtDate(u.lastLoginAt)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-cg-faint text-xs whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Calendar size={11} />{fmtDate(u.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewing(u)}
                          title="View details"
                          className="p-1.5 rounded-lg text-cg-muted hover:text-cg-primary hover:bg-cg-primary/10 transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setResettingFor(u)}
                          title="Reset password"
                          className="p-1.5 rounded-lg text-cg-muted hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        >
                          <KeyRound size={14} />
                        </button>
                        {u.active ? (
                          <button
                            onClick={() => handleSuspend(u)}
                            disabled={busyId === u.id || isSelf}
                            title={isSelf ? "You can't suspend yourself" : 'Suspend user'}
                            className="p-1.5 rounded-lg text-cg-muted hover:text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <UserX size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(u)}
                            disabled={busyId === u.id}
                            title="Re-activate user"
                            className="p-1.5 rounded-lg text-cg-muted hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-30"
                          >
                            <UserCheck size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(u)}
                          disabled={busyId === u.id || isSelf}
                          title={isSelf ? "You can't delete yourself" : 'Delete user'}
                          className="p-1.5 rounded-lg text-cg-muted hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <EmptyState
              icon={<Users size={28} />}
              title="No users found"
              description={users.length === 0 ? 'No accounts yet — invite users to register.' : 'Try adjusting your filters.'}
            />
          )}
        </div>

        <div className="px-5 py-3 border-t border-cg-border flex items-center justify-between">
          <p className="text-xs text-cg-faint">{filtered.length} of {users.length} users</p>
          {stats && (
            <p className="text-xs text-cg-faint">
              {stats.admins} admin · {stats.activeUsers} active · {stats.suspendedUsers} suspended
            </p>
          )}
        </div>
      </Card>

      {/* User detail modal */}
      <UserDetailModal user={viewing} onClose={() => setViewing(null)} />

      {/* Password reset modal */}
      <PasswordResetModal
        user={resettingFor}
        onClose={() => setResettingFor(null)}
        onDone={() => {
          setResettingFor(null)
          setToast({ kind: 'ok', msg: 'Password reset' })
        }}
      />

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete user"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-xl border border-cg-border text-sm text-cg-muted hover:bg-cg-s2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={busyId === confirmDelete?.id}
              className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {busyId === confirmDelete?.id && <Loader2 size={14} className="animate-spin" />}
              Delete user
            </button>
          </>
        }
      >
        {confirmDelete && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm text-cg-txt font-medium">Permanently delete this user?</p>
                <p className="text-xs text-cg-muted mt-1">
                  <span className="font-mono">{confirmDelete.email}</span> will be removed and any active sessions revoked. This cannot be undone.
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── Detail modal ──────────────────────────────────────────────────────────────
function UserDetailModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  return (
    <Modal open={!!user} onClose={onClose} title="User details" size="md">
      {user && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-cg-border">
            <div className="w-12 h-12 rounded-xl bg-cg-primary-s text-cg-primary flex items-center justify-center font-bold text-base">
              {initials(user.fullName || user.email)}
            </div>
            <div>
              <p className="font-semibold text-cg-txt">{user.fullName || '—'}</p>
              <p className="text-xs text-cg-muted">{user.email}</p>
            </div>
            <div className="ml-auto">{roleBadge(user.role)}</div>
          </div>
          <Field label="User ID"     value={<span className="font-mono text-xs">{user.id}</span>} />
          <Field label="Email"       value={user.email} />
          <Field label="Full name"   value={user.fullName || '—'} />
          <Field label="Role"        value={user.role} />
          <Field label="Status"      value={user.active
            ? <Badge variant="success" dot>Active</Badge>
            : <Badge variant="warning" dot>Suspended</Badge>} />
          <Field label="Last login"  value={fmtDate(user.lastLoginAt)} />
          <Field label="Created at"  value={fmtDate(user.createdAt)} />
          <Field label="Updated at"  value={fmtDate(user.updatedAt)} />
        </div>
      )}
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <span className="text-xs font-medium text-cg-muted uppercase tracking-wide pt-0.5">{label}</span>
      <span className="col-span-2 text-cg-txt break-all">{value}</span>
    </div>
  )
}

// ─── Password reset modal ─────────────────────────────────────────────────────
function PasswordResetModal({
  user, onClose, onDone,
}: {
  user: AdminUser | null
  onClose: () => void
  onDone: () => void
}) {
  const [pwd,   setPwd]   = useState('')
  const [pwd2,  setPwd2]  = useState('')
  const [show,  setShow]  = useState(false)
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState('')

  useEffect(() => {
    if (!user) { setPwd(''); setPwd2(''); setErr(''); setBusy(false); setShow(false) }
  }, [user])

  const submit = async () => {
    setErr('')
    if (pwd.length < 6) { setErr('Password must be at least 6 characters'); return }
    if (pwd !== pwd2)   { setErr('Passwords do not match');                  return }
    if (!user) return
    setBusy(true)
    try {
      await adminApi.resetPassword(user.id, pwd)
      onDone()
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      setErr(ax.response?.data?.message ?? 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Reset password"
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-cg-border text-sm text-cg-muted hover:bg-cg-s2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !pwd || !pwd2}
            className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all flex items-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Reset password
          </button>
        </>
      }
    >
      {user && (
        <div className="space-y-4">
          <p className="text-sm text-cg-muted">
            Set a new password for <span className="font-mono text-cg-txt">{user.email}</span>.
            Their existing sessions will be revoked.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">New password</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 pr-11 py-2.5 text-sm text-cg-txt
                  focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/20 transition-all"
                autoFocus
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cg-faint hover:text-cg-muted transition-colors">
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Confirm</label>
            <input
              type={show ? 'text' : 'password'}
              value={pwd2}
              onChange={e => setPwd2(e.target.value)}
              placeholder="Repeat the new password"
              className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-2.5 text-sm text-cg-txt
                focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/20 transition-all"
            />
          </div>

          {err && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 flex items-center gap-2">
              <AlertTriangle size={13} /> {err}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
