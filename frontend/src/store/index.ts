import { create } from 'zustand'
import type { Notification, CurrentUser } from '../types'
import { mockNotifications } from '../mock'

// ─── Persist helpers ──────────────────────────────────────────────────────────
function loadUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem('cg_user')
    return raw ? (JSON.parse(raw) as CurrentUser) : null
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

  // Notifications
  notifications:        Notification[]
  markNotificationRead: (id: string) => void
}

const DEFAULT_USER: CurrentUser = { name: 'Alex Müller', role: 'Admin', initials: 'AM' }

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
    localStorage.setItem('cg_token', token)
    localStorage.setItem('cg_user', JSON.stringify(user))
    set({ currentUser: user, isAuthenticated: true, token })
  },

  clearAuth: () => {
    localStorage.removeItem('cg_token')
    localStorage.removeItem('cg_user')
    set({ currentUser: DEFAULT_USER, isAuthenticated: false, token: null })
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications: mockNotifications,
  markNotificationRead: (id) =>
    set(s => ({
      notifications: s.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),
}))
