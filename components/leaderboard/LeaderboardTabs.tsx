'use client'

import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface LeaderboardTabItem<TId extends string | number = string | number> {
  id: TId
  label: string
  coverUrl?: string
}

interface LeaderboardTabsProps<TId extends string | number> {
  items: ReadonlyArray<LeaderboardTabItem<TId>>
  activeId: TId | null
  onChange: (id: TId) => void
  className?: string
}

/**
 * Tab strip used by the Leaderboard page to switch between official charts.
 * Renders a gradient underline that slides beneath the active label using
 * pure transform translation so the animation stays on the compositor.
 */
export function LeaderboardTabs<TId extends string | number>({
  items,
  activeId,
  onChange,
  className,
}: LeaderboardTabsProps<TId>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  })

  useEffect(() => {
    if (!containerRef.current || activeId == null) return
    const activeEl = containerRef.current.querySelector<HTMLElement>(
      `[data-tab-id="${String(activeId)}"]`
    )
    if (!activeEl) return
    const parentRect = containerRef.current.getBoundingClientRect()
    const rect = activeEl.getBoundingClientRect()
    setIndicator({
      left: rect.left - parentRect.left + containerRef.current.scrollLeft,
      width: rect.width,
    })
  }, [activeId, items])

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="排行榜分类"
      className={cn(
        'relative flex items-center gap-1 overflow-x-auto border-b border-white/5',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={String(item.id)}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-tab-id={String(item.id)}
            data-testid={`leaderboard-tab-${item.id}`}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap',
              isActive
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            )}
          >
            {item.label}
          </button>
        )
      })}

      {indicator.width > 0 && (
        <span
          aria-hidden
          className="absolute bottom-0 h-0.5 rounded-full transition-all duration-300 ease-out"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
            background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%)',
            boxShadow: '0 0 8px var(--accent-glow)',
          }}
        />
      )}
    </div>
  )
}
