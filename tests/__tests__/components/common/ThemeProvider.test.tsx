import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@/components/common/ThemeProvider'
import { useUIStore } from '@/stores/uiStore'

const originalMatchMedia = window.matchMedia

function resetStore() {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
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

function mockPrefersDark(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    resetStore()
  })

  afterEach(() => {
    cleanup()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    })
    resetStore()
    vi.clearAllMocks()
  })

  test('renders children without adding wrapper markup', () => {
    render(
      <ThemeProvider>
        <span>Child content</span>
      </ThemeProvider>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  test('restores the persisted theme and reflects it on html', async () => {
    localStorage.setItem('kahi-web-music:ui:theme', '"light"')

    render(<ThemeProvider><span>Theme child</span></ThemeProvider>)

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    })
    expect(useUIStore.getState().theme).toBe('light')
  })

  test('resolves system theme through prefers-color-scheme', async () => {
    mockPrefersDark(true)
    localStorage.setItem('kahi-web-music:ui:theme', '"system"')

    render(<ThemeProvider><span>Theme child</span></ThemeProvider>)

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    })
    expect(useUIStore.getState().theme).toBe('system')
  })

  test('syncs theme changes from storage events', async () => {
    render(<ThemeProvider><span>Theme child</span></ThemeProvider>)

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    })

    localStorage.setItem('kahi-web-music:ui:theme', '"light"')
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'kahi-web-music:ui:theme',
          newValue: '"light"',
        })
      )
    })

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    })
    expect(useUIStore.getState().theme).toBe('light')
  })
})
