import { cn } from '@/lib/utils'

interface RankBadgeProps {
  rank: number
  className?: string
}

/**
 * Renders a numeric rank badge.
 * - Ranks 1/2/3 get gold/silver/bronze gradient styling.
 * - All other ranks fall back to a muted gray pill.
 *
 * The component is intentionally pure / presentational so it can be reused
 * in song rows, previews, and hero headers.
 */
export function RankBadge({ rank, className }: RankBadgeProps) {
  const variant = getRankVariant(rank)

  return (
    <span
      data-testid="rank-badge"
      data-rank={rank}
      data-variant={variant}
      aria-label={`第 ${rank} 名`}
      className={cn(
        'inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-md text-sm font-bold leading-none tabular-nums',
        variant === 'gold' && 'rank-gold text-black shadow-[0_0_12px_rgba(255,200,80,0.35)]',
        variant === 'silver' && 'rank-silver text-black shadow-[0_0_10px_rgba(200,210,230,0.25)]',
        variant === 'bronze' && 'rank-bronze text-black shadow-[0_0_10px_rgba(220,140,90,0.25)]',
        variant === 'muted' && 'bg-white/5 text-[var(--text-tertiary)]',
        className
      )}
    >
      {rank}
    </span>
  )
}

export type RankVariant = 'gold' | 'silver' | 'bronze' | 'muted'

export function getRankVariant(rank: number): RankVariant {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return 'muted'
}
