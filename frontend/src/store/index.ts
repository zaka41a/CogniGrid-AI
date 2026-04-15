import { create } from 'zustand'
import type { Notification, CurrentUser, PlanId } from '../types'
import { mockNotifications } from '../mock'

// ─── Persist helpers ──────────────────────────────────────────────────────────
function loadUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem('cg_user')
    if (!raw) return null
    const user = JSON.parse(raw) as CurrentUser
    // Avatar is stored separately to avoid localStorage quota issues with large base64
    const avatar = localStorage.getItem('cg_avatar')
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
    // Preserve plan/usage from previous session
    const existing = loadUser()
    // Always read avatar from its dedicated key (survives logout)
    const savedAvatar = localStorage.getItem('cg_avatar') ?? existing?.avatar
    const enriched: CurrentUser = {
      plan: 'free' as PlanId,
      uploadsUsed: 0,
      ...existing,            // keep plan, uploadsUsed
      ...user,                // new login data wins (name, email, role)
      avatar: savedAvatar ?? undefined,
    }
    localStorage.setItem('cg_token', token)
    const { avatar, ...withoutAvatar } = enriched
    localStorage.setItem('cg_user', JSON.stringify(withoutAvatar))
    if (avatar) localStorage.setItem('cg_avatar', avatar)
    set({ currentUser: enriched, isAuthenticated: true, token })
  },

  clearAuth: () => {
    localStorage.removeItem('cg_token')
    localStorage.removeItem('cg_user')
    // Keep avatar so it survives re-login
    set({ currentUser: DEFAULT_USER, isAuthenticated: false, token: null })
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  updateAvatar: (avatarDataUrl) => {
    set(s => {
      const updated = { ...s.currentUser, avatar: avatarDataUrl }
      // Store avatar separately to avoid localStorage 5MB quota with base64
      try {
        localStorage.setItem('cg_avatar', avatarDataUrl)
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
      if (avatar) localStorage.setItem('cg_avatar', avatar)
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
  notifications: mockNotifications,

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
