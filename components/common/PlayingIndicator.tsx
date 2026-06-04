'use client'

import { cn } from '@/lib/utils'

type PlayingIndicatorSize = 'sm' | 'md'

interface PlayingIndicatorProps {
  isPlaying: boolean
  size?: PlayingIndicatorSize
  className?: string
}

const BAR_HEIGHTS: Record<PlayingIndicatorSize, readonly number[]> = {
  sm: [8, 12, 6],
  md: [12, 18, 9],
} as const

export function PlayingIndicator({
  isPlaying,
  size = 'sm',
  className,
}: PlayingIndicatorProps) {
  const [first, second, third] = BAR_HEIGHTS[size]

  return (
    <span
      className={cn(
        'playing-indicator',
        isPlaying ? 'playing-indicator--playing' : 'playing-indicator--paused',
        className
      )}
      role="presentation"
      aria-hidden="true"
    >
      <span
        className="playing-indicator__bar"
        style={{ height: `${first}px` }}
      />
      <span
        className="playing-indicator__bar"
        style={{ height: `${second}px` }}
      />
      <span
        className="playing-indicator__bar"
        style={{ height: `${third}px` }}
      />
    </span>
  )
}
