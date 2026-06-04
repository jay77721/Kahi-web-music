'use client'

import type { ReactNode } from 'react'
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
// Layout map (12-col CSS Grid)
// ---------------------------------------------------------------------------

const SIZE_CLASS: Record<BentoSize, string> = {
  sm: 'col-span-6 md:col-span-3 row-span-1',
  md: 'col-span-6 md:col-span-4 row-span-2',
  lg: 'col-span-12 md:col-span-6 row-span-2',
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
  const isLarge = size === 'md' || size === 'lg'

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={cn(
        'bento-card group relative flex flex-col justify-between overflow-hidden',
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm',
        'p-4 md:p-5',
        'transition-colors duration-200',
        'hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        SIZE_CLASS[size]
      )}
      style={item.color ? ({ '--bento-accent': item.color } as React.CSSProperties) : undefined}
      data-bento-size={size}
    >
      <div
        className="flex items-center gap-2 text-white/70"
        style={item.color ? { color: item.color } : undefined}
      >
        <span className="[&_svg]:w-4 [&_svg]:h-4">{item.icon}</span>
        <span className="text-[10px] md:text-xs font-medium uppercase tracking-wider text-white/60">
          {item.label}
        </span>
      </div>

      <div
        className={cn(
          'font-semibold text-white leading-none',
          isLarge ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'
        )}
      >
        {item.value}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Renders a bento-grid layout of playlist metadata tiles.
 *
 * Tiles come in three sizes (`sm`, `md`, `lg`) that map to a 12-column CSS
 * grid for editorial-style asymmetry. Items animate in with a 50ms stagger
 * and scale up subtly on hover.
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
        'bento-grid grid grid-cols-12 gap-3 md:gap-4 auto-rows-[88px] md:auto-rows-[100px]',
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
