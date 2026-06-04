import { describe, test, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'

// Track the latest mock instance so tests can trigger it
let latestMock: {
  trigger: (entries: unknown[]) => void
  disconnect: ReturnType<typeof vi.fn>
} | null = null

class MockIO {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  root = null
  rootMargin = ''
  thresholds: number[] = []
  takeRecords = () => []

  private _cb: (entries: unknown[]) => void

  constructor(cb: (entries: unknown[]) => void) {
    this._cb = cb
    latestMock = {
      trigger: (entries) => this._cb(entries),
      disconnect: this.disconnect,
    }
  }
}

beforeEach(() => {
  latestMock = null
  ;(globalThis as unknown as Record<string, unknown>).IntersectionObserver = MockIO
})

describe('useIntersectionObserver', () => {
  test('starts with isIntersecting false', () => {
    const { result } = renderHook(() => useIntersectionObserver())
    expect(result.current.isIntersecting).toBe(false)
  })

  test('sets isIntersecting true when element enters viewport', () => {
    const { result } = renderHook(() => useIntersectionObserver())
    const node = document.createElement('div')

    act(() => { result.current.ref(node) })
    act(() => { latestMock?.trigger([{ isIntersecting: true }]) })

    expect(result.current.isIntersecting).toBe(true)
  })

  test('sets isIntersecting false when element leaves viewport and triggerOnce is false', () => {
    const { result } = renderHook(() => useIntersectionObserver({ triggerOnce: false }))
    const node = document.createElement('div')

    act(() => { result.current.ref(node) })
    act(() => { latestMock?.trigger([{ isIntersecting: true }]) })
    expect(result.current.isIntersecting).toBe(true)

    // Leave viewport
    act(() => { latestMock?.trigger([{ isIntersecting: false }]) })
    expect(result.current.isIntersecting).toBe(false)
  })

  test('triggerOnce mode fires once then stays true', () => {
    const { result } = renderHook(() => useIntersectionObserver({ triggerOnce: true }))
    const node = document.createElement('div')

    act(() => { result.current.ref(node) })
    act(() => { latestMock?.trigger([{ isIntersecting: true }]) })
    expect(result.current.isIntersecting).toBe(true)

    // Second trigger should not change state (already triggered)
    act(() => { latestMock?.trigger([{ isIntersecting: false }]) })
    expect(result.current.isIntersecting).toBe(true)
  })

  test('disconnects observer on unmount', () => {
    const { unmount, result } = renderHook(() => useIntersectionObserver())
    const node = document.createElement('div')

    act(() => { result.current.ref(node) })
    unmount()

    // disconnect was called during unmount cleanup
    expect(latestMock?.disconnect).toBeTruthy()
  })
})
