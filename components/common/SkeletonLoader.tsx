'use client'

import { cn } from '@/lib/utils'

interface SkeletonLoaderProps {
  /** Number of skeleton rows/bars to render */
  count?: number
  /** Width of each skeleton (Tailwind class) */
  width?: string
  /** Height of each skeleton (Tailwind class) */
  height?: string
  /** Whether to show a circle (for avatars) */
  circle?: boolean
  /** Additional CSS classes */
  className?: string
  /** Gap between skeleton rows */
  gap?: string
}

/**
 * Shimmer skeleton loader for loading states.
 *
 * Supports horizontal layout (rows) and circular (avatars) modes.
 * The shimmer gradient moves continuously using CSS animation.
 *
 * @example
 * ```tsx
 * // List of skeleton rows
 * <SkeletonLoader count={5} height="h-4" />
 *
 * // Avatar skeleton
 * <SkeletonLoader circle height="h-12" width="w-12" />
 * ```
 */
export function SkeletonLoader({
  count = 3,
  width = 'w-full',
  height = 'h-4',
  circle = false,
  className,
  gap = 'gap-3',
}: SkeletonLoaderProps) {
  const skeletonClassName = cn(
    'rounded-md',
    'bg-gradient-to-r from-[var(--bg-surface)] via-[var(--bg-elevated)] to-[var(--bg-surface)]',
    'bg-[length:200%_100%]',
    'animate-shimmer',
    circle ? 'rounded-full' : 'rounded-md',
    width,
    height
  )

  if (count === 1) {
    return <div className={cn(skeletonClassName, className)} />
  }

  return (
    <div className={cn('flex flex-col', gap, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={skeletonClassName}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}
