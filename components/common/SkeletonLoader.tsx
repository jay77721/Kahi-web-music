'use client'

import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── variants ──────────────────────────────────────────────────────────────────

const shimmerVariants: Variants = {
  idle: {
    backgroundPosition: '200% 0',
  },
  animate: {
    backgroundPosition: '-200% 0',
    transition: {
      duration: 1.8,
      ease: 'linear',
      repeat: Infinity,
    },
  },
}

// ── props ─────────────────────────────────────────────────────────────────────

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

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Shimmer skeleton loader for loading states.
 *
 * Supports horizontal layout (rows) and circular (avatars) modes.
 * The shimmer gradient moves continuously for a polished loading effect.
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
  if (count === 1) {
    return (
      <motion.div
        variants={shimmerVariants}
        animate="animate"
        className={cn(
          'rounded-md',
          'bg-gradient-to-r from-[var(--bg-surface)] via-[var(--bg-elevated)] to-[var(--bg-surface)]',
          'bg-[length:200%_100%]',
          circle ? 'rounded-full' : 'rounded-md',
          width,
          height,
          className
        )}
      />
    )
  }

  return (
    <div className={cn('flex flex-col', gap, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          variants={shimmerVariants}
          animate="animate"
          className={cn(
            'rounded-md',
            'bg-gradient-to-r from-[var(--bg-surface)] via-[var(--bg-elevated)] to-[var(--bg-surface)]',
            'bg-[length:200%_100%]',
            circle ? 'rounded-full' : 'rounded-md',
            width,
            height
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}
