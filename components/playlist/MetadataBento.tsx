'use client'

import type { CSSProperties, ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type BentoSize = 'sm' | 'md' | 'lg'

export interface BentoItem {
  /** Lucide icon node, or any renderable node used as the visual mark. */
  icon: ReactNode
  /** Short uppercase label, e.g. "PLAY COUNT". */
  label: string
  /** Display string for the metric — already formatted by caller. */
  value: string
  /** Tile footprint. Defaults to 'sm'. */
  size?: BentoSize
  /** Optional color hint for the icon (any valid CSS color). */
  color?: string
}

interface MetadataBentoProps {
  items: readonly BentoItem[]
  className?: string
}

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BentoTileProps {
  item: BentoItem
}

function BentoTile({ item }: BentoTileProps) {
  const size: BentoSize = item.size ?? 'sm'
  const isPrimary = size === 'lg'
  const style = item.color ? ({ '--bento-accent': item.color } as CSSProperties) : undefined

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={cn(
        'bento-card group relative flex min-h-[64px] items-center gap-2 overflow-hidden',
        'rounded-lg border border-white/10 bg-white/[0.04] backdrop-blur-sm',
        'px-3 py-2',
        'transition-colors duration-200',
        'hover:bg-white/10 hover:shadow-[0_8px_24px_rgba(0,0,0,0.28)]'
      )}
      style={style}
      data-bento-size={size}
    >
      <div
        aria-hidden="true"
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5',
          '[&_svg]:h-4 [&_svg]:w-4'
        )}
        style={item.color ? { color: item.color } : undefined}
      >
        {item.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-medium uppercase tracking-wider text-white/55">
          {item.label}
        </div>
        <div
          className={cn(
            'truncate font-semibold leading-tight text-white',
            isPrimary ? 'text-lg' : 'text-base'
          )}
          title={item.value}
        >
          {item.value}
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Renders a compact responsive strip of playlist metadata.
 *
 * The `size` prop still marks relative importance for typography, while the
 * layout keeps every tile short so playlist tracks stay visible above the fold.
 */
export function MetadataBento({ items, className }: MetadataBentoProps) {
  if (items.length === 0) return null

  return (
    <motion.div
      role="list"
      aria-label="Playlist metadata"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'bento-grid grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-2 md:gap-3',
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          role="listitem"
          className="contents"
        >
          <BentoTile item={item} />
        </div>
      ))}
    </motion.div>
  )
}
