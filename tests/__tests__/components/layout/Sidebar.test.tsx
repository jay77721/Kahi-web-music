import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/layout/Sidebar'

const mocks = vi.hoisted(() => ({
  pathname: '/',
  searchParams: new URLSearchParams(),
  sidebarOpen: true,
  toggleSidebar: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/stores/uiStore', () => ({
  useUIStore: () => ({
    sidebarOpen: mocks.sidebarOpen,
    toggleSidebar: mocks.toggleSidebar,
  }),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    isLoggedIn: false,
    profile: null,
  }),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    mocks.pathname = '/'
    mocks.searchParams = new URLSearchParams()
    mocks.sidebarOpen = true
    mocks.toggleSidebar.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  test('renders the expanded active indicator with CSS instead of framer-motion', () => {
    const { container } = render(<Sidebar />)

    const activeLink = screen.getByRole('link', { name: '发现音乐' })
    const indicator = activeLink.querySelector('span[aria-hidden="true"]')

    expect(activeLink).toHaveAttribute('aria-current', 'page')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveClass('transition-all')
    expect(indicator).toHaveClass('opacity-100')
    expect(indicator).toHaveClass('scale-y-100')
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })

  test('keeps collapsed indicators on the same CSS path', () => {
    mocks.sidebarOpen = false

    const { container } = render(<Sidebar />)

    const activeLink = screen.getByRole('link', { name: '发现音乐' })
    const indicator = activeLink.querySelector('span[aria-hidden="true"]')

    expect(activeLink).toHaveAttribute('aria-current', 'page')
    expect(indicator).toHaveClass('h-5')
    expect(indicator).toHaveClass('opacity-100')
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })
})
