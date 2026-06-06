'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

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

/**
 * Renders a grid with CSS-only staggered entrance animations per cell.
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
    <div className={cn('grid section-enter stagger-children', columns, className)}>
      {items.map((item, index) => (
        <div key={keyExtractor(item, index)} className={cn(itemClassName)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}
