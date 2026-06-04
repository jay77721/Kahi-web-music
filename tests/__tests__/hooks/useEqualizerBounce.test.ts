import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEqualizerBounce } from '@/hooks/useEqualizerBounce'

describe('useEqualizerBounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns the requested number of bars', () => {
    const { result } = renderHook(() =>
      useEqualizerBounce({ barCount: 5, isPlaying: false }),
    )
    expect(result.current).toHaveLength(5)
  })

  test('uses 4 bars by default', () => {
    const { result } = renderHook(() => useEqualizerBounce({ isPlaying: false }))
    expect(result.current).toHaveLength(4)
  })

  test('heights are within [minHeight, maxHeight]', () => {
    const { result } = renderHook(() =>
      useEqualizerBounce({ barCount: 20, minHeight: 0.3, maxHeight: 0.7, isPlaying: false }),
    )
    for (const bar of result.current) {
      expect(bar.height).toBeGreaterThanOrEqual(0.3)
      expect(bar.height).toBeLessThanOrEqual(0.7)
    }
  })

  test('delays are evenly staggered across the duration', () => {
    const { result } = renderHook(() =>
      useEqualizerBounce({ barCount: 4, duration: 400, isPlaying: false }),
    )
    // Each step = duration / barCount / 2 = 400/4/2 = 50
    expect(result.current[0]?.delay).toBe(0)
    expect(result.current[1]?.delay).toBe(50)
    expect(result.current[2]?.delay).toBe(100)
    expect(result.current[3]?.delay).toBe(150)
  })

  test('does not animate when isPlaying is false', () => {
    const { result } = renderHook(() => useEqualizerBounce({ barCount: 4, isPlaying: false }))
    const initial = result.current.map((b) => b.height)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    const after = result.current.map((b) => b.height)
    expect(initial).toEqual(after)
  })

  test('rotates the bars while isPlaying is true', () => {
    const { result } = renderHook(() => useEqualizerBounce({ barCount: 4, duration: 100, isPlaying: true }))
    const initial = result.current.map((b) => b.height)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    const after = result.current.map((b) => b.height)
    // Heights are randomized so they should almost certainly differ.
    expect(after).not.toEqual(initial)
  })

  test('stops animating when isPlaying flips false', () => {
    const { result, rerender } = renderHook(
      ({ isPlaying }: { isPlaying: boolean }) => useEqualizerBounce({ barCount: 4, isPlaying, duration: 100 }),
      { initialProps: { isPlaying: true } },
    )
    rerender({ isPlaying: false })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    const snapshot = result.current.map((b) => b.height)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.map((b) => b.height)).toEqual(snapshot)
  })
})
