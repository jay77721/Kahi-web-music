'use client'

import { useEffect, useState } from 'react'

type Transition = {
  type?: string
  duration?: number
  [key: string]: unknown
}

type VariantState = Record<string, unknown>
type Variants = Record<string, VariantState>

/** Canonical media query string for the user's reduced-motion preference. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Detects whether the user has requested reduced motion in their system
 * preferences. Returns `true` when `prefers-reduced-motion: reduce` is set.
 *
 * The hook is SSR-safe (returns `false` on the server) and reactively
 * subscribes to media-query change events, so toggling the OS setting
 * while the app is open will update consumers without a remount.
 *
 * Use it to disable or simplify animations for WCAG 2.1 compliance.
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion()
 * const animate = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
 * const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    // Set the initial value from the current media-query state. The
    // lint rule discourages this but it's the right pattern for syncing
    // to a non-React external source — the alternative is a hydration
    // mismatch between server (false) and client (true).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

/**
 * Returns an animation transition that becomes instant (`duration: 0`)
 * when the user prefers reduced motion. Otherwise the original transition
 * is returned unchanged.
 */
export function useReducedMotionTransition(transition: Transition): Transition {
  const shouldReduceMotion = useReducedMotion()
  return shouldReduceMotion ? { duration: 0 } : transition
}

/**
 * Returns an animation variants object with all `transition.duration`
 * values forced to `0` when the user prefers reduced motion. The returned
 * variants preserve the *shape* of the animation, so the element still
 * appears at its final keyframe — it just does so instantaneously.
 */
export function useReducedMotionVariants(variants: Variants): Variants {
  const shouldReduceMotion = useReducedMotion()
  if (!shouldReduceMotion) return variants
  return stripMotionFromVariants(variants)
}

function stripMotionFromVariants(variants: Variants): Variants {
  const result: Variants = {}
  for (const key of Object.keys(variants)) {
    const value = variants[key]
    if (!value || typeof value !== 'object') {
      result[key] = value
      continue
    }
    const next: Record<string, unknown> = { ...value }
    if ('transition' in next) {
      next.transition = { duration: 0, type: 'tween' }
    }
    result[key] = next as Variants[string]
  }
  return result
}
