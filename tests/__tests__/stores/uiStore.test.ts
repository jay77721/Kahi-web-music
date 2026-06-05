import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/uiStore'

function resetStore() {
  localStorage.clear()
  useUIStore.setState({
    sidebarOpen: true,
    sidebarWidth: 240,
    fullScreenPlayerOpen: false,
    playQueueOpen: false,
    searchOpen: false,
    theme: 'dark',
    isMobile: false,
  })
}

describe('uiStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useUIStore.getState()
      expect(state.sidebarOpen).toBe(true)
      expect(state.sidebarWidth).toBe(240)
      expect(state.theme).toBe('dark')
      expect(state.isMobile).toBe(false)
      expect(state.fullScreenPlayerOpen).toBe(false)
      expect(state.playQueueOpen).toBe(false)
      expect(state.searchOpen).toBe(false)
    })
  })

  describe('toggleSidebar', () => {
    it('flips sidebarOpen', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true)
      useUIStore.getState().toggleSidebar()
      expect(useUIStore.getState().sidebarOpen).toBe(false)
      useUIStore.getState().toggleSidebar()
      expect(useUIStore.getState().sidebarOpen).toBe(true)
    })
  })

  describe('setSidebarOpen', () => {
    it('sets sidebarOpen', () => {
      useUIStore.getState().setSidebarOpen(false)
      expect(useUIStore.getState().sidebarOpen).toBe(false)
      useUIStore.getState().setSidebarOpen(true)
      expect(useUIStore.getState().sidebarOpen).toBe(true)
    })
  })

  describe('setTheme', () => {
    it('updates theme and persists to localStorage', () => {
      useUIStore.getState().setTheme('light')
      expect(useUIStore.getState().theme).toBe('light')
      expect(localStorage.getItem('kahi-web-music:ui:theme')).toBe('"light"')
    })

    it('accepts all three theme values', () => {
      useUIStore.getState().setTheme('dark')
      expect(useUIStore.getState().theme).toBe('dark')

      useUIStore.getState().setTheme('light')
      expect(useUIStore.getState().theme).toBe('light')

      useUIStore.getState().setTheme('system')
      expect(useUIStore.getState().theme).toBe('system')
    })
  })

  describe('restoreTheme', () => {
    it('falls back to dark when persisted theme is invalid', () => {
      localStorage.setItem('kahi-web-music:ui:theme', '"neon"')
      useUIStore.setState({ theme: 'light' })

      useUIStore.getState().restoreTheme()

      expect(useUIStore.getState().theme).toBe('dark')
    })
  })

  describe('setIsMobile', () => {
    it('updates isMobile', () => {
      useUIStore.getState().setIsMobile(true)
      expect(useUIStore.getState().isMobile).toBe(true)
      useUIStore.getState().setIsMobile(false)
      expect(useUIStore.getState().isMobile).toBe(false)
    })
  })

  describe('drawer setters', () => {
    it('setSearchOpen toggles searchOpen', () => {
      useUIStore.getState().setSearchOpen(true)
      expect(useUIStore.getState().searchOpen).toBe(true)
      useUIStore.getState().setSearchOpen(false)
      expect(useUIStore.getState().searchOpen).toBe(false)
    })

    it('setFullScreenPlayerOpen toggles fullScreenPlayerOpen', () => {
      useUIStore.getState().setFullScreenPlayerOpen(true)
      expect(useUIStore.getState().fullScreenPlayerOpen).toBe(true)
      useUIStore.getState().setFullScreenPlayerOpen(false)
      expect(useUIStore.getState().fullScreenPlayerOpen).toBe(false)
    })

    it('setPlayQueueOpen toggles playQueueOpen', () => {
      useUIStore.getState().setPlayQueueOpen(true)
      expect(useUIStore.getState().playQueueOpen).toBe(true)
      useUIStore.getState().setPlayQueueOpen(false)
      expect(useUIStore.getState().playQueueOpen).toBe(false)
    })
  })

  describe('togglePlayQueue', () => {
    it('flips playQueueOpen', () => {
      expect(useUIStore.getState().playQueueOpen).toBe(false)
      useUIStore.getState().togglePlayQueue()
      expect(useUIStore.getState().playQueueOpen).toBe(true)
      useUIStore.getState().togglePlayQueue()
      expect(useUIStore.getState().playQueueOpen).toBe(false)
    })
  })
})
