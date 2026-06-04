'use client'

import { type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── variants ──────────────────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 300,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 150, ease: 'easeIn' },
  },
}

// ── props ─────────────────────────────────────────────────────────────────────

interface GridTransitionProps {
  /** Array of items */
  items: readonly unknown[]
  /** Render each item */
  renderItem: (item: unknown, index: number) => ReactNode
  /** Container CSS classes */
  className?: string
  /** Item CSS classes */
  itemClassName?: string
  /** Key extractor */
  getKey?: (item: unknown, index: number) => string | number
  /** Grid columns (Tailwind class prefix, e.g. 'grid-cols-2') */
  columns?: string
}

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Renders a grid with staggered scale-in animations per cell.
 *
 * @example
 * ```tsx
 * <GridTransition
 *   items={playlists}
 *   columns="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
 *   getKey={(p) => p.id}
 *   renderItem={(playlist) => (
 *     <PlaylistCard id={playlist.id} coverUrl={playlist.cover} name={playlist.name} />
 *   )}
 * />
 * ```
 */
export function GridTransition({
  items,
  renderItem,
  className,
  itemClassName,
  getKey,
  columns = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
}: GridTransitionProps) {
  const keyExtractor = getKey ?? ((_: unknown, index: number) => index)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn('grid', columns, className)}
    >
      {items.map((item, index) => (
        <motion.div
          key={keyExtractor(item, index)}
          variants={itemVariants}
          className={cn(itemClassName)}
          layout
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  )
}
