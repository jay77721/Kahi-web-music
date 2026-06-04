import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScrollProgress, useScrollPast } from '@/hooks/useScrollProgress'

function setWindowScroll(y: number) {
  // The hook's logic checks `'scrollTop' in target` and reads `target.scrollTop`
  // when that's true. jsdom reports `'scrollTop' in window` as `true` but
  // `window.scrollTop` is `undefined`. We need to provide both `scrollTop`
  // and `scrollY` so the math works out.
  Object.defineProperty(window, 'scrollTop', {
    configurable: true,
    get: () => y,
  })
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => y,
  })
  Object.defineProperty(document.documentElement, 'scrollTop', {
    configurable: true,
    value: y,
    writable: true,
  })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 1000,
    writable: true,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 0,
    writable: true,
  })
}

describe('useScrollProgress', () => {
  beforeEach(() => {
    setWindowScroll(0)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns 0 initially', () => {
    const { result } = renderHook(() => useScrollProgress())
    expect(result.current).toBe(0)
  })

  test('returns 0.5 when scrolled halfway', () => {
    const { result } = renderHook(() => useScrollProgress())
    act(() => {
      setWindowScroll(500)
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current).toBeCloseTo(0.5)
  })

  test('clamps to [0, 1]', () => {
    const { result } = renderHook(() => useScrollProgress())
    act(() => {
      setWindowScroll(9999)
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current).toBe(1)
  })

  test('returns 0 when the page is too short to scroll', () => {
    setWindowScroll(0)
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 100,
      writable: true,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1000,
      writable: true,
    })
    const { result } = renderHook(() => useScrollProgress())
    expect(result.current).toBe(0)
  })

  test('reacts to a target element ref', () => {
    const target = document.createElement('div')
    Object.defineProperty(target, 'scrollTop', { configurable: true, value: 0 })
    Object.defineProperty(target, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(target, 'clientHeight', { configurable: true, value: 0 })

    const ref = { current: target }
    const { result } = renderHook(() => useScrollProgress(ref))

    act(() => {
      Object.defineProperty(target, 'scrollTop', { configurable: true, value: 250 })
      target.dispatchEvent(new Event('scroll'))
    })
    expect(result.current).toBeCloseTo(0.25)
  })
})

describe('useScrollPast', () => {
  beforeEach(() => {
    setWindowScroll(0)
  })

  test('returns false when below threshold', () => {
    const { result } = renderHook(() => useScrollPast(100))
    expect(result.current).toBe(false)
  })

  test('returns true when above threshold', () => {
    setWindowScroll(150)
    const { result } = renderHook(() => useScrollPast(100))
    expect(result.current).toBe(true)
  })

  test('updates when window scrolls past the threshold', () => {
    const { result } = renderHook(() => useScrollPast(50))
    expect(result.current).toBe(false)
    act(() => {
      setWindowScroll(60)
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current).toBe(true)
  })
})
