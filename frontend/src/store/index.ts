import { create } from 'zustand'
import type { Notification, CurrentUser } from '../types'
import { mockNotifications } from '../mock'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

interface AppState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  theme: Theme
  toggleTheme: () => void

  currentUser: CurrentUser
  notifications: Notification[]
  markNotificationRead: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  theme: 'light',
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'light' ? 'dark' : 'light'
      applyTheme(next)
      return { theme: next }
    }),

  currentUser: {
    name: 'Alex Müller',
    role: 'Admin',
    initials: 'AM',
  },

  notifications: mockNotifications,
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
}))
