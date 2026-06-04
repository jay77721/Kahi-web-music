import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery'

function createMedia(matches: boolean) {
  const listeners: Set<(e: MediaQueryListEvent) => void> = new Set()
  return {
    matches,
    media: '',
    onchange: null,
    addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatchEvent: (e: MediaQueryListEvent) => {
      listeners.forEach((cb) => cb(e))
      return true
    },
  }
}

describe('useMediaQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('returns false when matchMedia does not match', () => {
    window.matchMedia = () => createMedia(false)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1000px)'))
    expect(result.current).toBe(false)
  })

  it('returns true when matchMedia matches', () => {
    window.matchMedia = () => createMedia(true)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1000px)'))
    expect(result.current).toBe(true)
  })

  it('listens for change event and updates return value', () => {
    const media = createMedia(false)
    window.matchMedia = () => media

    const { result } = renderHook(() => useMediaQuery('(min-width: 1000px)'))
    expect(result.current).toBe(false)

    act(() => {
      media.dispatchEvent({ matches: true } as MediaQueryListEvent)
    })

    expect(result.current).toBe(true)
  })

  it('cleans up listener on unmount', () => {
    const media = createMedia(false)
    window.matchMedia = () => media

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1000px)'))
    const removeSpy = vi.spyOn(media, 'removeEventListener')
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function))
    removeSpy.mockRestore()
  })
})

describe('preset media query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('useIsMobile uses correct query', () => {
    window.matchMedia = () => createMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('useIsTablet uses correct query', () => {
    window.matchMedia = () => createMedia(true)
    const { result } = renderHook(() => useIsTablet())
    expect(result.current).toBe(true)
  })

  it('useIsDesktop uses correct query', () => {
    window.matchMedia = () => createMedia(true)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })
})
