'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION_SEC = 60

export interface UseCaptchaCountdownResult {
  /** Seconds remaining (0 when idle / finished). */
  seconds: number
  /** True while the countdown is active. */
  isCountingDown: boolean
  /** Begin a fresh countdown. Resets any in-flight timer. */
  start: () => void
  /** Stop the countdown immediately and reset to 0. */
  reset: () => void
}

/**
 * 1-second-tick countdown for "Resend verification code" buttons.
 * Defaults to 60s, the conventional SMS captcha cooldown.
 */
export function useCaptchaCountdown(
  durationSec: number = DEFAULT_DURATION_SEC
): UseCaptchaCountdownResult {
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    setSeconds(0)
  }, [clearTimer])

  const start = useCallback(() => {
    clearTimer()
    setSeconds(durationSec)
    intervalRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [clearTimer, durationSec])

  useEffect(() => clearTimer, [clearTimer])

  return {
    seconds,
    isCountingDown: seconds > 0,
    start,
    reset,
  }
}
