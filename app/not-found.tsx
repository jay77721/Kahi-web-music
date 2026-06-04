import Link from 'next/link'
import { Compass, House } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Next.js App Router 404 page.
 *
 * Server-rendered for SEO. Large "404" hero with a friendly Chinese
 * fallback description and a return-home button.
 */
export default function NotFound() {
  return (
    <main
      role="main"
      aria-labelledby="not-found-title"
      className="flex min-h-[calc(100dvh-var(--player-bar-height))] w-full items-center justify-center p-6"
    >
      <div
        className={cn(
          'glass-subtle relative isolate flex w-full max-w-lg flex-col items-center gap-6',
          'rounded-2xl px-8 py-12 text-center',
        )}
        style={{ borderRadius: 'var(--radius-2xl)' }}
      >
        <p
          id="not-found-title"
          className="text-gradient-accent text-[120px] font-extrabold leading-none tracking-tight"
          aria-label="错误 404"
        >
          404
        </p>

        <div className="flex flex-col items-center gap-2">
          <h2
            className="flex items-center gap-2 text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            <Compass className="size-5" aria-hidden="true" />
            页面未找到
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            你要找的页面可能已被移除、改名，或暂时无法访问。
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none"
          style={{
            background: 'var(--accent)',
            color: 'var(--text-inverse)',
          }}
        >
          <House className="size-4" aria-hidden="true" />
          返回首页
        </Link>
      </div>
    </main>
  )
}
