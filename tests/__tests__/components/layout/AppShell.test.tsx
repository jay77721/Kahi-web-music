import { afterEach, describe, test, expect } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppShell } from '@/components/layout/AppShell'

describe('AppShell', () => {
  afterEach(() => {
    cleanup()
  })

  test('renders children inside main content', () => {
    render(
      <AppShell>
        <div data-testid="child">Hello</div>
      </AppShell>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  test('exposes a focusable main landmark for skip navigation', () => {
    render(<AppShell><span>Content</span></AppShell>)

    const main = screen.getByRole('main', { name: '主内容' })
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(main.className).toContain('pb-[calc(4rem+env(safe-area-inset-bottom))]')
  })

  test('keeps mobile navigation mounted under a responsive CSS guard', () => {
    render(<AppShell><span>Content</span></AppShell>)

    const mobileNav = screen.getByRole('navigation', { name: '移动主导航' })
    expect(mobileNav).toHaveClass('md:hidden')
  })

  test('renders without crashing', () => {
    const { container } = render(<AppShell><span>Content</span></AppShell>)
    expect(container.querySelector('div')).toBeTruthy()
  })

  test('renders header login as a single interactive link', () => {
    const { container } = render(<AppShell><span>Content</span></AppShell>)

    expect(container.querySelector('header a[href="/login"]')).toBeTruthy()
    expect(container.querySelector('header a[href="/login"] button')).toBeNull()
  })
})
