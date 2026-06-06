'use client'

import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type TransitionValue = number | string

interface TransitionState {
  opacity?: TransitionValue
  x?: TransitionValue
  y?: TransitionValue
  scale?: TransitionValue
  transition?: {
    duration?: number
    ease?: string
  }
}

export interface PageTransitionVariants {
  initial?: TransitionState
  animate?: TransitionState
  exit?: TransitionState
  [state: string]: TransitionState | undefined
}

/**
 * Legacy transition shape kept for consumers that import it directly.
 * The component itself is CSS-only and does not pass these values to a
 * runtime animation library.
 */
export const defaultPageVariants: PageTransitionVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

interface PageTransitionProps {
  /** Content to wrap with the transition. */
  children: ReactNode
  /** Additional CSS classes for the wrapper. */
  className?: string
  /**
   * @deprecated Prefer CSS classes. Common `initial` and `animate`
   * opacity/transform values are mapped to CSS variables for compatibility.
   */
  variants?: PageTransitionVariants
}

const baseClassName = 'page-transition page-transition-enter w-full'

function toCssLength(value: TransitionValue | undefined, fallback: string) {
  if (typeof value === 'number') return `${value}px`
  return value ?? fallback
}

function toCssValue(value: TransitionValue | undefined, fallback: string) {
  return value === undefined ? fallback : String(value)
}

function toDuration(value: number | undefined) {
  return value === undefined ? undefined : `${value}s`
}

function resolveVariantStyle(variants?: PageTransitionVariants): CSSProperties | undefined {
  if (!variants) return undefined

  const initial = variants.initial
  const animate = variants.animate
  const duration = toDuration(animate?.transition?.duration)

  return {
    '--page-transition-from-opacity': toCssValue(initial?.opacity, '0'),
    '--page-transition-from-x': toCssLength(initial?.x, '0px'),
    '--page-transition-from-y': toCssLength(initial?.y, '8px'),
    '--page-transition-from-scale': toCssValue(initial?.scale, '1'),
    '--page-transition-to-opacity': toCssValue(animate?.opacity, '1'),
    '--page-transition-to-x': toCssLength(animate?.x, '0px'),
    '--page-transition-to-y': toCssLength(animate?.y, '0px'),
    '--page-transition-to-scale': toCssValue(animate?.scale, '1'),
    ...(duration ? { '--page-transition-duration': duration } : {}),
  } as CSSProperties
}

/**
 * Lightweight legacy page transition wrapper backed by global CSS utilities.
 */
export function PageTransition({
  children,
  className,
  variants,
}: PageTransitionProps) {
  return (
    <div className={cn(baseClassName, className)} style={resolveVariantStyle(variants)}>
      {children}
    </div>
  )
}

interface PageTransitionRouteProps {
  /**
   * A unique key per route, normally from `usePathname()`.
   * Changing it remounts the wrapper so the CSS enter animation replays.
   */
  routeKey: string
  children: ReactNode
  className?: string
  variants?: PageTransitionVariants
}

/**
 * Convenience wrapper that remounts the CSS transition on route changes.
 */
export function PageTransitionRoute({
  routeKey,
  children,
  className,
  variants,
}: PageTransitionRouteProps) {
  return (
    <PageTransition key={routeKey} className={className} variants={variants}>
      {children}
    </PageTransition>
  )
}
