'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ── props ─────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Hero icon node (e.g. lucide-react component instance). */
  icon?: ReactNode
  /** Headline shown beneath the icon. */
  title: string
  /** Optional secondary description. */
  description?: string
  /** Optional call-to-action node (e.g. <button>). */
  action?: ReactNode
  /** Extra classes for the outer wrapper. */
  className?: string
}

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Centered empty-state surface for lists / sections with no data.
 *
 * Renders an optional SVG illustration, headline, optional description, and
 * an optional action slot. The wrapper uses semantic `role="status"` so
 * screen readers announce the empty state without being intrusive.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="还没有任何歌曲"
 *   description="去发现页找找喜欢的音乐吧"
 *   action={<Button>去发现</Button>}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex size-20 items-center justify-center rounded-full"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--text-tertiary)',
        }}
      >
        {icon ?? (
          <svg
            viewBox="0 0 80 80"
            className="size-12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="8 4"
              opacity="0.4"
            />
            <path
              d="M32 28v24l18-12-18-12z"
              fill="currentColor"
              opacity="0.7"
            />
          </svg>
        )}
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <h3
          className="text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        {description ? (
          <p
            className="max-w-sm text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
