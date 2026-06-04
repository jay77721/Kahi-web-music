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
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 300,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 150, ease: 'easeIn' },
  },
}

// ── props ─────────────────────────────────────────────────────────────────────

interface ListTransitionProps {
  /** Array of items to render */
  items: readonly unknown[]
  /** Render function that receives (item, index) */
  renderItem: (item: unknown, index: number) => ReactNode
  /** Additional CSS classes for the container */
  className?: string
  /** Additional CSS classes for each item */
  itemClassName?: string
  /** Key extractor */
  getKey?: (item: unknown, index: number) => string | number
  /** If true, only animate newly added items (not re-render all) */
  animateChanges?: boolean
}

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Renders a list with staggered entrance animations.
 *
 * Each item fades in and slides up with a slight delay based on its index.
 *
 * @example
 * ```tsx
 * <ListTransition
 *   items={playlists}
 *   getKey={(p) => p.id}
 *   renderItem={(playlist) => (
 *     <PlaylistCard id={playlist.id} coverUrl={playlist.cover} name={playlist.name} />
 *   )}
 * />
 * ```
 */
export function ListTransition({
  items,
  renderItem,
  className,
  itemClassName,
  getKey,
  animateChanges = true,
}: ListTransitionProps) {
  const keyExtractor = getKey ?? ((_: unknown, index: number) => index)

  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn('space-y-3', className)}
    >
      {items.map((item, index) => (
        <motion.li
          key={keyExtractor(item, index)}
          variants={animateChanges ? itemVariants : {}}
          className={cn(itemClassName)}
          layout
        >
          {renderItem(item, index)}
        </motion.li>
      ))}
    </motion.ul>
  )
}
