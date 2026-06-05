'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { LeaderboardTabItem } from '@/components/leaderboard/LeaderboardTabs'

interface LeaderboardChartCardsProps {
  items: ReadonlyArray<LeaderboardTabItem<number>>
  activeId: number | null
  onSelect: (id: number) => void
  className?: string
}

export const LeaderboardChartCards = memo(function LeaderboardChartCards({
  items,
  activeId,
  onSelect,
  className,
}: LeaderboardChartCardsProps) {
  return (
    <section
      aria-label="官方榜单"
      className={cn('grid grid-cols-2 md:grid-cols-4 gap-2', className)}
    >
      {items.map((chart, index) => {
        const isActive = chart.id === activeId

        return (
          <button
            key={chart.id}
            type="button"
            onClick={() => onSelect(chart.id)}
            data-testid={`chart-card-${chart.id}`}
            aria-pressed={isActive}
            aria-label={`查看${chart.label}`}
            className={cn(
              'min-h-16 rounded-lg border px-3 py-3 text-left transition-colors duration-150',
              isActive
                ? 'border-[var(--accent)] bg-[var(--bg-accent-subtle)]'
                : 'border-white/5 bg-[var(--bg-elevated)] hover:border-white/10 hover:bg-[var(--bg-hover)]'
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums',
                  isActive
                    ? 'bg-[var(--accent)] text-black'
                    : 'bg-white/5 text-[var(--text-tertiary)]'
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block truncate text-sm font-semibold',
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  )}
                >
                  {chart.label}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">官方榜</span>
              </span>
            </div>
          </button>
        )
      })}
    </section>
  )
})
