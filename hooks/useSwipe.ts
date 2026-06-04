'use client'

import { useEffect, type RefObject } from 'react'

export type SwipeDirection = 'left' | 'right' | 'up' | 'down'

export interface UseSwipeOptions {
  /** Minimum distance (px) in the dominant axis to count as a swipe. */
  threshold?: number
  /** Fires on a swipe that ends with finger moving left. */
  onSwipeLeft?: () => void
  /** Fires on a swipe that ends with finger moving right. */
  onSwipeRight?: () => void
  /** Fires on a swipe that ends with finger moving up. */
  onSwipeUp?: () => void
  /** Fires on a swipe that ends with finger moving down. */
  onSwipeDown?: () => void
  /** Disable the listener entirely (handy for media-query gating). */
  enabled?: boolean
}

/**
 * Detects single-finger swipe gestures on the given element ref.
 * Only fires one direction per touch — once detected, no further
 * callbacks are emitted until the finger lifts and a new touch starts.
 */
export function useSwipe<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseSwipeOptions = {}
): void {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    enabled = true,
  } = options

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    let startX = 0
    let startY = 0
    let tracking = false
    let consumed = false

    const onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length !== 1) {
        // Multi-touch or no touch — abandon any in-flight gesture and
        // clear the consumed flag so the next single touch can fire.
        tracking = false
        consumed = false
        return
      }
      const touch = e.touches[0]
      if (!touch) {
        tracking = false
        consumed = false
        return
      }
      startX = touch.clientX
      startY = touch.clientY
      tracking = true
      consumed = false
    }

    const onTouchEnd = (e: TouchEvent): void => {
      if (consumed || !tracking) return
      const touch = e.changedTouches[0]
      if (!touch) return

      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (Math.max(absX, absY) < threshold) return

      consumed = true
      tracking = false

      if (absX > absY) {
        if (deltaX > 0) onSwipeRight?.()
        else onSwipeLeft?.()
      } else if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [ref, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, enabled])
}
