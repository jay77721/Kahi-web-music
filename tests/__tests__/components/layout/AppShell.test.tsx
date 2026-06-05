import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from '@/components/layout/AppShell'

describe('AppShell', () => {
  test('renders children inside main content', () => {
    render(
      <AppShell>
        <div data-testid="child">Hello</div>
      </AppShell>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
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
