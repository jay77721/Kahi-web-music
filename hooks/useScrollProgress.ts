'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Tracks scroll progress (0 to 1) of a specific element or the window.
 *
 * @param targetRef - Optional ref to track. If not provided, tracks window scroll.
 * @returns Scroll progress value from 0 to 1.
 *
 * @example
 * ```tsx
 * const progress = useScrollProgress()
 * // Returns 0 at top, 1 at bottom
 * ```
 *
 * @example
 * ```tsx
 * const ref = useRef(null)
 * const progress = useScrollProgress(ref)
 * // Tracks scroll within the ref element
 * ```
 */
export function useScrollProgress(
  targetRef?: React.RefObject<HTMLElement | null>
): number {
  const [progress, setProgress] = useState(0)

  const calculateProgress = useCallback(() => {
    const target = targetRef?.current ?? window

    const scrollTop = 'scrollTop' in target ? target.scrollTop : window.scrollY
    const scrollHeight =
      'scrollHeight' in target
        ? target.scrollHeight
        : document.documentElement.scrollHeight
    const clientHeight =
      'clientHeight' in target
        ? target.clientHeight
        : window.innerHeight

    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) {
      setProgress(0)
      return
    }

    setProgress(Math.min(Math.max(scrollTop / maxScroll, 0), 1))
  }, [targetRef])

  useEffect(() => {
    calculateProgress()

    const target = targetRef?.current ?? window
    const handleScroll = () => calculateProgress()
    target.addEventListener('scroll', handleScroll, { passive: true })

    // Recalculate on resize
    const handleResize = () => calculateProgress()
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      target.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [calculateProgress, targetRef])

  return progress
}

/**
 * Hook that returns whether the user has scrolled past a given threshold.
 */
export function useScrollPast(threshold = 100): boolean {
  const [isPast, setIsPast] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsPast(window.scrollY > threshold)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return isPast
}
