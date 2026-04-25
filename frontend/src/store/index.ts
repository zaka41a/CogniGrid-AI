import { create } from 'zustand'
import type { Notification, CurrentUser, PlanId } from '../types'

// ─── Per-user avatar key ───────────────────────────────────────────────────────
const avatarKey = (email?: string) =>
  email ? `cg_avatar_${email.toLowerCase().trim()}` : 'cg_avatar'

// ─── Persist helpers ──────────────────────────────────────────────────────────
function loadUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem('cg_user')
    if (!raw) return null
    const user = JSON.parse(raw) as CurrentUser
    // Avatar stored per-user to prevent cross-account leakage
    const avatar = localStorage.getItem(avatarKey(user.email))
    if (avatar) user.avatar = avatar
    return user
  } catch { return null }
}

// ─── State shape ──────────────────────────────────────────────────────────────
interface AppState {
  // Sidebar
  sidebarOpen:    boolean
  toggleSidebar:  () => void
  setSidebarOpen: (open: boolean) => void

  // Auth
  currentUser:     CurrentUser
  isAuthenticated: boolean
  token:           string | null
  setAuth:         (user: CurrentUser, token: string) => void
  clearAuth:       () => void

  // Profile
  updateAvatar:     (avatarDataUrl: string) => void
  updatePlan:       (plan: PlanId, uploadsUsed?: number) => void
  incrementUploads: () => void

  // Notifications
  notifications:        Notification[]
  markNotificationRead: (id: string) => void
  markAllRead:          () => void
  addNotification:      (n: Omit<Notification, 'id'>) => void
  clearNotification:    (id: string) => void
}

const DEFAULT_USER: CurrentUser = {
  name: 'Alex Müller', role: 'ANALYST', initials: 'AM',
  plan: 'free', uploadsUsed: 0,
}

export const useAppStore = create<AppState>((set) => ({
  // ── Sidebar ──────────────────────────────────────────────────────────────
  sidebarOpen:    true,
  toggleSidebar:  () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // ── Auth ──────────────────────────────────────────────────────────────────
  currentUser:     loadUser() ?? DEFAULT_USER,
  isAuthenticated: !!localStorage.getItem('cg_token'),
  token:           localStorage.getItem('cg_token'),

  setAuth: (user, token) => {
    const email = user.email
    // Preserve plan/usage from previous session for same user
    const existing = loadUser()
    const isSameUser = existing?.email && email && existing.email === email
    // Load avatar from the per-user key
    const savedAvatar = localStorage.getItem(avatarKey(email))
    const enriched: CurrentUser = {
      plan: 'free' as PlanId,
      uploadsUsed: 0,
      ...(isSameUser ? existing : {}),  // keep plan/uploads only if same user
      ...user,                          // new login data wins (name, email, role)
      avatar: savedAvatar ?? undefined,
    }
    localStorage.setItem('cg_token', token)
    const { avatar, ...withoutAvatar } = enriched
    localStorage.setItem('cg_user', JSON.stringify(withoutAvatar))
    if (avatar) localStorage.setItem(avatarKey(email), avatar)
    set({ currentUser: enriched, isAuthenticated: true, token })
  },

  clearAuth: () => {
    localStorage.removeItem('cg_token')
    localStorage.removeItem('cg_user')
    // Avatars are kept per-user key — they survive logout
    set({ currentUser: DEFAULT_USER, isAuthenticated: false, token: null })
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  updateAvatar: (avatarDataUrl) => {
    set(s => {
      const updated = { ...s.currentUser, avatar: avatarDataUrl }
      try {
        localStorage.setItem(avatarKey(s.currentUser.email), avatarDataUrl)
        const { avatar, ...withoutAvatar } = updated
        localStorage.setItem('cg_user', JSON.stringify(withoutAvatar))
      } catch { /* quota exceeded — in-memory only */ }
      return { currentUser: updated }
    })
  },

  updatePlan: (plan, uploadsUsed) => {
    set(s => {
      const updated = { ...s.currentUser, plan, uploadsUsed: uploadsUsed ?? s.currentUser.uploadsUsed ?? 0 }
      const { avatar, ...withoutAvatar } = updated
      localStorage.setItem('cg_user', JSON.stringify(withoutAvatar))
      if (avatar) localStorage.setItem(avatarKey(s.currentUser.email), avatar)
      return { currentUser: updated }
    })
  },

  incrementUploads: () => {
    set(s => {
      const updated = { ...s.currentUser, uploadsUsed: (s.currentUser.uploadsUsed ?? 0) + 1 }
      const { avatar, ...withoutAvatar } = updated
      localStorage.setItem('cg_user', JSON.stringify(withoutAvatar))
      return { currentUser: updated }
    })
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications: [],

  markNotificationRead: (id) =>
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    })),

  markAllRead: () =>
    set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),

  addNotification: (n) => {
    const notif: Notification = { ...n, id: `notif-${Date.now()}` }
    set(s => ({ notifications: [notif, ...s.notifications.slice(0, 49)] }))
  },

  clearNotification: (id) =>
    set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),
}))
