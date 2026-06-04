'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── types ─────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  /** Subtree to render and guard. */
  children: ReactNode
  /** Optional custom fallback. Receives the captured error and a reset fn. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Optional reporter hook called when an error is captured. */
  onError?: (error: Error, info: ErrorInfo) => void
  /** Extra classes for the default fallback panel. */
  className?: string
}

interface ErrorBoundaryState {
  /** Current error or null. */
  error: Error | null
}

const initialState: ErrorBoundaryState = { error: null }

// ── component ─────────────────────────────────────────────────────────────────

/**
 * React Error Boundary (class component as required by React).
 *
 * Catches render-time errors in the wrapped subtree and shows a recoverable
 * glass-panel fallback with a retry button. Reports errors via console.warn
 * and forwards to an optional onError reporter.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = initialState

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Report immutably; do not mutate caller data.
    console.warn('[ErrorBoundary] captured error', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    })

    if (this.props.onError) {
      this.props.onError(error, info)
    }
  }

  private handleReset = (): void => {
    this.setState({ ...initialState })
  }

  render(): ReactNode {
    const { error } = this.state
    const { children, fallback, className } = this.props

    if (!error) {
      return children
    }

    if (fallback) {
      return fallback(error, this.handleReset)
    }

    return (
      <ErrorBoundaryFallback
        error={error}
        onReset={this.handleReset}
        className={className}
      />
    )
  }
}

// ── default fallback ──────────────────────────────────────────────────────────

interface ErrorBoundaryFallbackProps {
  error: Error
  onReset: () => void
  className?: string
}

/**
 * Default glass-panel fallback shown when ErrorBoundary catches an error.
 * Kept exported so app/error.tsx and other Next.js error pages can share
 * the same visual treatment.
 */
export function ErrorBoundaryFallback({
  error,
  onReset,
  className,
}: ErrorBoundaryFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex min-h-[320px] w-full items-center justify-center p-6',
        className,
      )}
    >
      <div
        className={cn(
          'glass-subtle relative isolate flex w-full max-w-md flex-col items-center gap-4',
          'rounded-2xl px-8 py-10 text-center',
        )}
        style={{ borderRadius: 'var(--radius-2xl)' }}
      >
        <div
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full"
          style={{
            background: 'var(--bg-accent-subtle)',
            color: 'var(--accent)',
          }}
        >
          <TriangleAlert className="size-8" />
        </div>

        <div className="flex flex-col gap-2">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            出了点问题
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {error.message || '渲染时遇到未知错误，请稍后重试。'}
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className={cn(
            'mt-2 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium',
            'transition-colors',
            'focus-visible:outline-none',
          )}
          style={{
            background: 'var(--accent)',
            color: 'var(--text-inverse)',
          }}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          重试
        </button>
      </div>
    </div>
  )
}
