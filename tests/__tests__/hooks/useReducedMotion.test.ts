import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import {
  useReducedMotion,
  useReducedMotionTransition,
  useReducedMotionVariants,
  REDUCED_MOTION_QUERY,
} from '@/hooks/useReducedMotion'

type Listener = (event: MediaQueryListEvent) => void

function createMedia(matches: boolean, query: string = REDUCED_MOTION_QUERY) {
  const listeners: Set<Listener> = new Set()
  return {
    matches,
    media: query,
    onchange: null,
    addListener: (cb: Listener) => listeners.add(cb),
    removeListener: (cb: Listener) => listeners.delete(cb),
    addEventListener: (_type: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_type: string, cb: Listener) => listeners.delete(cb),
    dispatchEvent: (event: MediaQueryListEvent) => {
      listeners.forEach((cb) => cb(event))
      return true
    },
  }
}

describe('useReducedMotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('returns true when matchMedia reports reduced motion', () => {
    window.matchMedia = vi.fn().mockImplementation(() => createMedia(true))
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('returns false when matchMedia reports no reduced motion', () => {
    window.matchMedia = vi.fn().mockImplementation(() => createMedia(false))
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('subscribes to change events and updates the return value', () => {
    const media = createMedia(false)
    window.matchMedia = vi.fn().mockImplementation(() => media)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      media.dispatchEvent({ matches: true } as MediaQueryListEvent)
    })

    expect(result.current).toBe(true)

    act(() => {
      media.dispatchEvent({ matches: false } as MediaQueryListEvent)
    })

    expect(result.current).toBe(false)
  })

  it('removes the change listener on unmount', () => {
    const media = createMedia(false)
    window.matchMedia = vi.fn().mockImplementation(() => media)
    const removeSpy = vi.spyOn(media, 'removeEventListener')

    const { unmount } = renderHook(() => useReducedMotion())
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('queries the canonical reduced-motion media query', () => {
    const matchMedia = vi.fn().mockImplementation(() => createMedia(false))
    window.matchMedia = matchMedia
    renderHook(() => useReducedMotion())
    expect(matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY)
  })
})

describe('useReducedMotionTransition', () => {
  beforeEach(() => {
    cleanup()
  })

  it('returns the original transition when motion is allowed', () => {
    window.matchMedia = vi.fn().mockImplementation(() => createMedia(false))
    const original = { duration: 0.4, ease: 'easeOut' as const }
    const { result } = renderHook(() => useReducedMotionTransition(original))
    expect(result.current).toBe(original)
  })

  it('collapses to { duration: 0 } when motion should be reduced', () => {
    window.matchMedia = vi.fn().mockImplementation(() => createMedia(true))
    const original = { duration: 0.4, ease: 'easeOut' as const }
    const { result } = renderHook(() => useReducedMotionTransition(original))
    expect(result.current).toEqual({ duration: 0 })
  })
})

describe('useReducedMotionVariants', () => {
  beforeEach(() => {
    cleanup()
  })

  it('returns the original variants when motion is allowed', () => {
    window.matchMedia = vi.fn().mockImplementation(() => createMedia(false))
    const original = {
      hidden: { opacity: 0, y: 8 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
    }
    const { result } = renderHook(() => useReducedMotionVariants(original))
    expect(result.current).toBe(original)
  })

  it('collapses transition durations to 0 when motion should be reduced', () => {
    window.matchMedia = vi.fn().mockImplementation(() => createMedia(true))
    const original = {
      hidden: { opacity: 0, y: 8 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
      exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
    }
    const { result } = renderHook(() => useReducedMotionVariants(original))

    expect(result.current.hidden).toEqual({ opacity: 0, y: 8 })
    expect(result.current.visible).toMatchObject({
      opacity: 1,
      y: 0,
      transition: { duration: 0 },
    })
    expect(result.current.exit).toMatchObject({
      opacity: 0,
      y: -8,
      transition: { duration: 0 },
    })
  })
})
