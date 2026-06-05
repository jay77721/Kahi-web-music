import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PageTransitionRoute } from '@/components/layout/PageTransitionRoute'
import { PageTransitionShell } from '@/components/layout/PageTransitionShell'

describe('Layout PageTransitionRoute', () => {
  afterEach(() => {
    cleanup()
  })

  test('renders children inside the CSS transition wrapper', () => {
    const { container } = render(
      <PageTransitionRoute routeKey="/home">
        <span data-testid="route-content">Home page</span>
      </PageTransitionRoute>
    )

    const wrapper = container.querySelector('[data-page-transition-route="true"]')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('page-transition')
    expect(wrapper).toHaveClass('page-transition-enter')
    expect(wrapper).toHaveClass('w-full')
    expect(screen.getByTestId('route-content')).toBeInTheDocument()
  })

  test('remounts the transition wrapper when the route key changes', () => {
    const { container, rerender } = render(
      <PageTransitionRoute routeKey="/home">
        <span>A</span>
      </PageTransitionRoute>
    )
    const firstWrapper = container.querySelector('[data-page-transition-route="true"]')

    rerender(
      <PageTransitionRoute routeKey="/search">
        <span>B</span>
      </PageTransitionRoute>
    )

    const secondWrapper = container.querySelector('[data-page-transition-route="true"]')
    expect(secondWrapper).toBeInTheDocument()
    expect(secondWrapper).not.toBe(firstWrapper)
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  test('forwards custom className without importing framer-motion', () => {
    const { container } = render(
      <PageTransitionRoute routeKey="/custom" className="custom-shell">
        <span>Custom</span>
      </PageTransitionRoute>
    )

    const wrapper = container.querySelector('[data-page-transition-route="true"]')
    expect(wrapper).toHaveClass('custom-shell')
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })
})

describe('PageTransitionShell', () => {
  afterEach(() => {
    cleanup()
  })

  test('wraps children with the layout CSS transition route', () => {
    const { container } = render(
      <PageTransitionShell>
        <span>Shell content</span>
      </PageTransitionShell>
    )

    const wrapper = container.querySelector('[data-page-transition-route="true"]')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('page-transition')
    expect(screen.getByText('Shell content')).toBeInTheDocument()
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })
})
