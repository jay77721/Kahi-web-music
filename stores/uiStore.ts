import { create } from 'zustand'
import { storage, STORAGE_KEYS } from '@/lib/storage'

type Theme = 'dark' | 'light' | 'system'

interface UIState {
  // Sidebar (PC)
  sidebarOpen: boolean
  sidebarWidth: number

  // Full screen player (Mobile)
  fullScreenPlayerOpen: boolean

  // Play queue drawer
  playQueueOpen: boolean

  // Search
  searchOpen: boolean

  // Theme
  theme: Theme

  // Mobile
  isMobile: boolean

  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setFullScreenPlayerOpen: (open: boolean) => void
  togglePlayQueue: () => void
  setPlayQueueOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setTheme: (theme: Theme) => void
  restoreTheme: () => void
  setIsMobile: (isMobile: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarWidth: 240,
  fullScreenPlayerOpen: false,
  playQueueOpen: false,
  searchOpen: false,
  theme: 'dark' as Theme,
  isMobile: false,

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setFullScreenPlayerOpen: (open) => set({ fullScreenPlayerOpen: open }),
  togglePlayQueue: () => set(state => ({ playQueueOpen: !state.playQueueOpen })),
  setPlayQueueOpen: (open) => set({ playQueueOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setTheme: (theme) => {
    set({ theme })
    storage.set(STORAGE_KEYS.THEME, theme)
  },
  restoreTheme: () => {
    if (typeof window === 'undefined') return
    const saved = storage.get(STORAGE_KEYS.THEME, 'dark' as Theme)
    set({ theme: saved })
  },
  setIsMobile: (isMobile) => set({ isMobile }),
}))
