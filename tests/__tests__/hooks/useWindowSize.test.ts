import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWindowSize, useBreakpoint } from '@/hooks/useWindowSize'

function setWindowSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

describe('useWindowSize', () => {
  beforeEach(() => {
    setWindowSize(1024, 768)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns the initial window size', () => {
    const { result } = renderHook(() => useWindowSize())
    expect(result.current.width).toBe(1024)
    expect(result.current.height).toBe(768)
  })

  test('updates on resize after the 100ms debounce', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useWindowSize())
    act(() => {
      setWindowSize(800, 600)
      window.dispatchEvent(new Event('resize'))
    })
    // Right after the event, the value hasn't updated yet
    expect(result.current.width).toBe(1024)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.width).toBe(800)
    expect(result.current.height).toBe(600)
  })

  test('coalesces multiple rapid resize events', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useWindowSize())
    act(() => {
      setWindowSize(500, 400)
      window.dispatchEvent(new Event('resize'))
    })
    act(() => {
      vi.advanceTimersByTime(50)
      setWindowSize(700, 500)
      window.dispatchEvent(new Event('resize'))
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.width).toBe(700)
  })
})

describe('useBreakpoint', () => {
  beforeEach(() => setWindowSize(1024, 768))

  test('reports isDesktop for large widths', () => {
    setWindowSize(1500, 800)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isMobile).toBe(false)
  })

  test('reports isTablet for medium widths', () => {
    setWindowSize(900, 600)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isTablet).toBe(true)
    expect(result.current.isDesktop).toBe(false)
    expect(result.current.isMobile).toBe(false)
  })

  test('reports isMobile for small widths', () => {
    setWindowSize(500, 400)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(false)
  })

  test('reports isLarge for very wide widths', () => {
    setWindowSize(1600, 900)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isLarge).toBe(true)
  })

  test('does not report isLarge for 1535px', () => {
    setWindowSize(1535, 900)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isLarge).toBe(false)
  })
})
