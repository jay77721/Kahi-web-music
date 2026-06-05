'use client'

import { useState, useEffect } from 'react'

interface EqualizerBar {
  /** Delay before this bar starts animating (ms) */
  delay: number
  /** Height ratio (0-1) */
  height: number
}

export interface EqualizerBounceOptions {
  /** Number of bars (default: 4) */
  barCount?: number
  /** Animation duration per bounce (ms) */
  duration?: number
  /** Whether the equalizer is currently "playing" */
  isPlaying?: boolean
  /** Minimum bar height ratio (0-1) */
  minHeight?: number
  /** Maximum bar height ratio (0-1) */
  maxHeight?: number
}

function createBars(
  barCount: number,
  duration: number,
  minHeight: number,
  maxHeight: number
): EqualizerBar[] {
  const delayStep = duration / barCount / 2
  return Array.from({ length: barCount }, (_, i) => ({
    delay: i * delayStep,
    height: minHeight + Math.random() * (maxHeight - minHeight),
  }))
}

/**
 * Generates equalizer bar configurations for a bouncing music equalizer animation.
 *
 * @example
 * ```tsx
 * const bars = useEqualizerBounce({ barCount: 5, isPlaying })
 * // bars = [{ delay: 0, height: 0.8 }, { delay: 100, height: 0.5 }, ...]
 * ```
 */
export function useEqualizerBounce(
  options: EqualizerBounceOptions = {}
): EqualizerBar[] {
  const {
    barCount = 4,
    duration = 500,
    isPlaying = true,
    minHeight = 0.2,
    maxHeight = 1,
  } = options

  const [bars, setBars] = useState<EqualizerBar[]>(() =>
    createBars(barCount, duration, minHeight, maxHeight)
  )

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setBars(createBars(barCount, duration, minHeight, maxHeight))
    }, duration)

    return () => clearInterval(interval)
  }, [barCount, duration, isPlaying, minHeight, maxHeight])

  return bars
}
