import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, test, expect } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  PageTransition,
  PageTransitionRoute,
  defaultPageVariants,
} from '@/components/common/PageTransition'

const source = readFileSync(
  join(process.cwd(), 'components/common/PageTransition.tsx'),
  'utf8'
)
const globalCss = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

afterEach(() => {
  cleanup()
})

describe('PageTransition source', () => {
  test('does not import framer-motion runtime entry points', () => {
    expect(source).not.toContain('framer-motion')
    expect(source).not.toContain('motion.')
    expect(source).not.toContain('AnimatePresence')
  })

  test('reduced-motion CSS leaves the transition wrapper visible', () => {
    expect(globalCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(globalCss).toMatch(/\.page-transition-enter[\s\S]*opacity:\s*1\s*!important/)
    expect(globalCss).toMatch(/\.page-transition-enter[\s\S]*transform:\s*none\s*!important/)
  })
})

describe('PageTransition', () => {
  test('renders its children inside a plain DOM wrapper', () => {
    const { container } = render(
      <PageTransition>
        <span data-testid="child">Hello</span>
      </PageTransition>
    )

    const wrapper = container.firstElementChild
    expect(wrapper?.tagName).toBe('DIV')
    expect(wrapper).toHaveClass('page-transition')
    expect(wrapper).toHaveClass('page-transition-enter')
    expect(wrapper).toHaveClass('w-full')
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  test('keeps the legacy default variant export for compatibility', () => {
    expect(defaultPageVariants.initial).toMatchObject({ opacity: 0, y: 8 })
    expect(defaultPageVariants.animate).toMatchObject({ opacity: 1, y: 0 })
    expect(defaultPageVariants.exit).toMatchObject({ opacity: 0, y: -8 })
  })

  test('forwards custom className to the CSS wrapper', () => {
    const { container } = render(
      <PageTransition className="custom-shell">
        <span>x</span>
      </PageTransition>
    )

    const wrapper = container.querySelector('.custom-shell')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('w-full')
    expect(wrapper).toHaveClass('page-transition-enter')
  })

  test('maps custom variant transforms to CSS variables without motion attributes', () => {
    const customVariants = {
      initial: { opacity: 0.5, x: -20, y: 4, scale: 0.96 },
      animate: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.4 } },
      exit: { opacity: 0, x: 20 },
    }
    const { container } = render(
      <PageTransition variants={customVariants}>
        <span>custom</span>
      </PageTransition>
    )

    expect(screen.getByText('custom')).toBeInTheDocument()
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
    expect(container.firstElementChild?.getAttribute('variants')).toBeNull()
    expect(container.firstElementChild).toHaveStyle({
      '--page-transition-from-opacity': '0.5',
      '--page-transition-from-x': '-20px',
      '--page-transition-from-y': '4px',
      '--page-transition-from-scale': '0.96',
      '--page-transition-to-opacity': '1',
      '--page-transition-to-x': '0px',
      '--page-transition-to-y': '0px',
      '--page-transition-to-scale': '1',
      '--page-transition-duration': '0.4s',
    })
  })
})

describe('PageTransitionRoute', () => {
  test('renders children on the initial mount', () => {
    const { container } = render(
      <PageTransitionRoute routeKey="/home">
        <div data-testid="route-content">Home page</div>
      </PageTransitionRoute>
    )

    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.firstElementChild).toHaveClass('page-transition')
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
    expect(screen.getByTestId('route-content')).toBeInTheDocument()
    expect(screen.getByText('Home page')).toBeInTheDocument()
  })

  test('remounts the plain wrapper when routeKey changes', () => {
    const { rerender, container } = render(
      <PageTransitionRoute routeKey="/home">
        <span>A</span>
      </PageTransitionRoute>
    )
    const firstWrapper = container.firstElementChild

    rerender(
      <PageTransitionRoute routeKey="/search">
        <span>B</span>
      </PageTransitionRoute>
    )

    expect(container.firstElementChild).toBeInTheDocument()
    expect(container.firstElementChild).not.toBe(firstWrapper)
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  test('forwards custom variants to CSS variables without rendering motion props', () => {
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

    expect(screen.getByText('x')).toBeInTheDocument()
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
    expect(container.firstElementChild?.getAttribute('variants')).toBeNull()
    expect(container.firstElementChild).toHaveStyle({
      '--page-transition-from-scale': '0.9',
      '--page-transition-to-scale': '1',
    })
  })

  test('renders an empty plain wrapper when no children are provided', () => {
    const { container } = render(
      <PageTransitionRoute routeKey="/empty">{null}</PageTransitionRoute>
    )

    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.firstElementChild).toHaveClass('page-transition')
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })
})
