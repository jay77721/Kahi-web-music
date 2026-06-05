import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Header } from '@/components/layout/Header'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  prefetch: vi.fn(),
  setTheme: vi.fn(),
  setSearchOpen: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    prefetch: mocks.prefetch,
  }),
}))

vi.mock('@/stores/uiStore', () => ({
  useUIStore: () => ({
    theme: 'dark',
    setTheme: mocks.setTheme,
    setSearchOpen: mocks.setSearchOpen,
  }),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    isLoggedIn: false,
    profile: null,
  }),
}))

describe('Header', () => {
  beforeEach(() => {
    mocks.push.mockReset()
    mocks.prefetch.mockReset()
    mocks.setTheme.mockReset()
    mocks.setSearchOpen.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  test('search form has a native GET fallback to the search page', () => {
    render(<Header />)

    const form = screen.getByRole('search', { name: '站内搜索' })
    const input = screen.getByRole('searchbox', { name: '搜索音乐' })

    expect(form).toHaveAttribute('action', '/search')
    expect(form).toHaveAttribute('method', 'get')
    expect(input).toHaveAttribute('name', 'q')
  })

  test('hydrated submit still navigates through the router', () => {
    render(<Header />)

    const input = screen.getByRole('searchbox', { name: '搜索音乐' })
    fireEvent.change(input, { target: { value: ' jay ' } })
    fireEvent.submit(screen.getByRole('search', { name: '站内搜索' }))

    expect(mocks.push).toHaveBeenCalledWith('/search?q=jay')
  })
})
