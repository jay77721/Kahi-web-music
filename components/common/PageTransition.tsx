'use client'

import { useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// ── page transition variants ──────────────────────────────────────────────────

/**
 * Default fade + slight slideY transition variants.
 * Tuned for whole-page route changes: gentle, fast, non-distracting.
 *
 * Kept as a top-level export for back-compat (consumers and tests import
 * it directly). The component itself resolves the right variants at
 * render time via `buildDefaultPageVariants` so that the reduced-motion
 * path is honoured automatically.
 */
export const defaultPageVariants: Variants = {
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

/**
 * Build a variants object adapted to the user's reduced-motion preference.
 * When the user prefers reduced motion the variants collapse to a
 * motionless end-state so the page swap is instantaneous.
 */
function buildDefaultPageVariants(prefersReducedMotion: boolean): Variants {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0, transition: { duration: 0 } },
      exit: { opacity: 1, y: 0, transition: { duration: 0 } },
    }
  }
  return defaultPageVariants
}

// ── props ─────────────────────────────────────────────────────────────────────

interface PageTransitionProps {
  /** Content to wrap with the transition. */
  children: ReactNode
  /** Additional CSS classes for the inner motion wrapper. */
  className?: string
  /**
   * Override the default variants. Use this to customize the motion
   * for specific surfaces (e.g. modal-style pages, full-bleed hero pages).
   */
  variants?: Variants
}

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Inner transition wrapper. Pair with `PageTransitionRoute` (or an
 * `AnimatePresence` + `key`) to get enter/exit transitions on
 * route changes.
 *
 * @example
 * ```tsx
 * <AnimatePresence mode="wait" initial={false}>
 *   <PageTransition key={pathname}>
 *     {children}
 *   </PageTransition>
 * </AnimatePresence>
 * ```
 */
export function PageTransition({
  children,
  className,
  variants,
}: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()
  const defaultVariants = useMemo(
    () => buildDefaultPageVariants(prefersReducedMotion),
    [prefersReducedMotion]
  )
  const resolvedVariants = variants ?? defaultVariants
  return (
    <motion.div
      variants={resolvedVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  )
}

// ── route wrapper ─────────────────────────────────────────────────────────────

interface PageTransitionRouteProps {
  /**
   * A unique key per route (typically `usePathname()`). The wrapper
   * uses it to remount the inner transition on route change so
   * `AnimatePresence` can play the exit → enter sequence.
   */
  routeKey: string
  children: ReactNode
  className?: string
  variants?: Variants
}

/**
 * Convenience wrapper that combines `AnimatePresence mode="wait"`
 * with the `PageTransition` motion wrapper. Use this in the root
 * layout to apply a uniform transition to every route.
 */
export function PageTransitionRoute({
  routeKey,
  children,
  className,
  variants,
}: PageTransitionRouteProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={routeKey} className={className} variants={variants}>
        {children}
      </PageTransition>
    </AnimatePresence>
  )
}
