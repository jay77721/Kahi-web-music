'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type { ReactNode } from 'react'

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Component that throws on first render when `shouldThrow` is true, then
 * returns a child node on subsequent renders. Lets us simulate "fix +
 * retry" without mutating React internals.
 */
function Bomb({
  shouldThrow,
  children,
}: {
  shouldThrow: boolean
  children?: ReactNode
}) {
  if (shouldThrow) {
    throw new Error('boom')
  }
  return <div data-testid="bomb-recovered">{children ?? 'safe'}</div>
}

describe('ErrorBoundary', () => {
  // React logs caught errors via console.error in dev; silence to keep
  // the test output clean. componentDidCatch console.warn is asserted
  // explicitly below.
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  test('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">hello</div>
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('child')).toHaveTextContent('hello')
  })

  test('renders the fallback panel and reports via console.warn when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByText('出了点问题')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument()

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[ErrorBoundary] captured error',
      expect.objectContaining({ message: 'boom' }),
    )
  })

  test('forwards the captured error to onError callback', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(onError).toHaveBeenCalledTimes(1)
    const [errArg, infoArg] = onError.mock.calls[0]
    expect(errArg).toBeInstanceOf(Error)
    expect((errArg as Error).message).toBe('boom')
    expect(infoArg).toEqual(expect.objectContaining({ componentStack: expect.any(String) }))
  })

  test('resets and re-renders children when retry is clicked after the cause is fixed', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText('出了点问题')).toBeInTheDocument()

    // Simulate the upstream condition being fixed before retrying.
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    )

    fireEvent.click(screen.getByRole('button', { name: /重试/ }))

    expect(screen.queryByText('出了点问题')).not.toBeInTheDocument()
    expect(screen.getByTestId('bomb-recovered')).toHaveTextContent('safe')
  })

  test('renders the custom fallback render-prop when provided', () => {
    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <p data-testid="custom-message">{error.message}</p>
            <button type="button" onClick={reset}>
              custom-reset
            </button>
          </div>
        )}
      >
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('custom-message')).toHaveTextContent('boom')
    expect(screen.getByRole('button', { name: 'custom-reset' })).toBeInTheDocument()
  })
})
