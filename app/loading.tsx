import { cn } from '@/lib/utils'

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Next.js App Router global loading placeholder.
 *
 * Shown by the App Router while server segments are streaming. Renders a
 * Kahi logo mark plus an indeterminate progress bar driven entirely by
 * the existing `shimmer` keyframe (see app/globals.css). Server-rendered
 * so it appears instantly without hydration.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="加载中"
      className="flex min-h-[calc(100dvh-var(--player-bar-height))] w-full items-center justify-center p-6"
    >
      <div
        className={cn(
          'flex w-full max-w-xs flex-col items-center gap-6',
          'rounded-2xl px-6 py-10 text-center',
          'bg-[var(--bg-secondary)] border border-[var(--border)]',
        )}
      >
        <div
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-2xl text-2xl font-extrabold"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--accent)',
            boxShadow: 'var(--shadow-glow), 0 0 0 1px var(--border)',
          }}
        >
          K
        </div>

        <div className="flex flex-col items-center gap-2">
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Kahi Music
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            正在加载...
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <div
            aria-hidden="true"
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <div
              className="animate-shimmer h-full w-full rounded-full"
              style={{ borderRadius: 'inherit' }}
            />
          </div>
          <div
            aria-hidden="true"
            className="h-2 w-4/5 overflow-hidden rounded-full"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <div
              className="animate-shimmer h-full w-full rounded-full"
              style={{ borderRadius: 'inherit' }}
            />
          </div>
          <div
            aria-hidden="true"
            className="h-2 w-3/5 overflow-hidden rounded-full"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <div
              className="animate-shimmer h-full w-2/3 rounded-full"
              style={{ borderRadius: 'inherit' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
