'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TriangleAlert, RefreshCw, House } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── props ─────────────────────────────────────────────────────────────────────

interface GlobalErrorProps {
  /** Captured render error (digest set in production builds). */
  error: Error & { digest?: string }
  /** Re-render the segment after fixing the cause. */
  reset: () => void
}

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Next.js App Router error boundary for the root segment.
 *
 * Reuses the ErrorBoundary glass-panel visuals and adds a "Go home" escape
 * hatch in addition to retry. Must be a client component (App Router contract).
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const router = useRouter()

  useEffect(() => {
    console.warn('[app/error] route error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[calc(100dvh-var(--player-bar-height))] w-full items-center justify-center p-6"
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
            页面加载失败
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {error.message || '页面渲染时遇到未知错误。'}
          </p>
          {error.digest ? (
            <p
              className="text-xs font-mono"
              style={{ color: 'var(--text-quaternary)' }}
            >
              digest: {error.digest}
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-none"
            style={{
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
            }}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            重试
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-none"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
            }}
          >
            <House className="size-4" aria-hidden="true" />
            返回首页
          </button>
        </div>
      </div>
    </div>
  )
}
