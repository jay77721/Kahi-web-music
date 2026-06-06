'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

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

/**
 * Renders a list with CSS-only staggered entrance animations.
 *
 * Each item remains a normal list item under a stagger container.
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
    <ul className={cn('space-y-3 section-enter', animateChanges && 'stagger-children', className)}>
      {items.map((item, index) => (
        <li key={keyExtractor(item, index)} className={cn(itemClassName)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  )
}
