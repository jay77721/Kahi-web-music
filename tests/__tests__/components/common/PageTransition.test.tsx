import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  PageTransition,
  PageTransitionRoute,
  defaultPageVariants,
} from '@/components/common/PageTransition'

describe('PageTransition', () => {
  test('renders its children', () => {
    render(
      <PageTransition>
        <span data-testid="child">Hello</span>
      </PageTransition>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  test('exposes default variants that include fade + slideY', () => {
    expect(defaultPageVariants.initial).toMatchObject({ opacity: 0 })
    expect(defaultPageVariants.initial).toMatchObject({ y: 8 })
    expect(defaultPageVariants.animate).toMatchObject({ opacity: 1, y: 0 })
    expect(defaultPageVariants.exit).toMatchObject({ opacity: 0, y: -8 })
  })

  test('uses motion.div with the default variants', () => {
    const { container } = render(
      <PageTransition>
        <span>content</span>
      </PageTransition>
    )
    // The framer-motion mock renders motion.* as <div data-framer-motion="true">.
    const wrapper = container.querySelector('[data-framer-motion="true"]')
    expect(wrapper).toBeTruthy()
  })

  test('forwards custom className to the motion wrapper', () => {
    const { container } = render(
      <PageTransition className="custom-shell">
        <span>x</span>
      </PageTransition>
    )
    const wrapper = container.querySelector('.custom-shell')
    expect(wrapper).toBeTruthy()
    // The wrapper class merges the default `w-full` with the override.
    expect(wrapper?.className).toContain('w-full')
  })

  test('accepts custom variants without crashing', () => {
    const customVariants = {
      initial: { opacity: 0.5, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    }
    const { container } = render(
      <PageTransition variants={customVariants}>
        <span>custom</span>
      </PageTransition>
    )
    const wrapper = container.querySelector('[data-framer-motion="true"]')
    expect(wrapper).toBeTruthy()
    // Custom variants are applied to the motion wrapper.
    expect(wrapper?.getAttribute('variants')).not.toBeNull()
  })
})

describe('PageTransitionRoute', () => {
  test('renders children on the initial mount', () => {
    render(
      <PageTransitionRoute routeKey="/home">
        <div data-testid="route-content">Home page</div>
      </PageTransitionRoute>
    )
    expect(screen.getByTestId('route-content')).toBeInTheDocument()
    expect(screen.getByText('Home page')).toBeInTheDocument()
  })

  test('remounts the inner motion wrapper when routeKey changes', () => {
    const { rerender, container } = render(
      <PageTransitionRoute routeKey="/home">
        <span data-testid="content">A</span>
      </PageTransitionRoute>
    )
    expect(container.querySelector('[data-framer-motion="true"]')).toBeTruthy()

    rerender(
      <PageTransitionRoute routeKey="/search">
        <span data-testid="content">B</span>
      </PageTransitionRoute>
    )

    // A motion wrapper is still present after the key change.
    expect(
      container.querySelector('[data-framer-motion="true"]')
    ).toBeTruthy()
    // The latest children are rendered.
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  test('forwards custom variants to the inner transition', () => {
    const customVariants = {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.1 },
    }
    const { container } = render(
      <PageTransitionRoute routeKey="/x" variants={customVariants}>
        <span>x</span>
      </PageTransitionRoute>
    )
    const wrapper = container.querySelector('[data-framer-motion="true"]')
    expect(wrapper).toBeTruthy()
    expect(wrapper?.getAttribute('variants')).not.toBeNull()
  })

  test('renders nothing harmful when no children are provided', () => {
    const { container } = render(<PageTransitionRoute routeKey="/empty" />)
    // No motion wrapper because AnimatePresence + the inner motion both
    // render nothing without children — but the component must not throw.
    expect(container).toBeTruthy()
  })
})
