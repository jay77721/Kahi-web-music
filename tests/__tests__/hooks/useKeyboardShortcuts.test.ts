import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useKeyboardShortcuts, useKeyPress } from '@/hooks/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  function dispatchKey(key: string, options: Partial<KeyboardEventInit> = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    })
    window.dispatchEvent(event)
    return event
  }

  it('triggers handler for a single key match', () => {
    const handler = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: ' ', handler, preventDefault: true }],
      })
    )

    dispatchKey(' ')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('triggers handler for Shift+P', () => {
    const handler = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'P', handler, preventDefault: true }],
      })
    )

    dispatchKey('p', { shiftKey: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('triggers handler for Control+K', () => {
    const handler = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'k', handler, preventDefault: true }],
      })
    )

    dispatchKey('k', { ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('triggers handler for Alt+K', () => {
    const handler = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'k', handler, preventDefault: true }],
      })
    )

    dispatchKey('k', { altKey: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('prevents default when preventDefault is true', () => {
    const handler = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: ' ', handler, preventDefault: true }],
      })
    )

    const event = dispatchKey(' ')
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not prevent default when preventDefault is explicitly false', () => {
    const handler = vi.fn()
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'x', handler, preventDefault: false }],
      })
    )

    const event = new KeyboardEvent('keydown', {
      key: 'x',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)

    unmount()
  })

  it('skips handler when when is false', () => {
    const handler = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: ' ', handler, when: false }],
      })
    )

    dispatchKey(' ')
    expect(handler).not.toHaveBeenCalled()
  })

  it('fires handler when when is true', () => {
    const handler = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: ' ', handler, when: true }],
      })
    )

    dispatchKey(' ')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('fires handler when when is undefined', () => {
    const handler = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: ' ', handler }],
      })
    )

    dispatchKey(' ')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('only triggers the first matching shortcut', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'a', handler: handler1 },
          { key: 'a', handler: handler2 },
        ],
      })
    )

    dispatchKey('a')
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).not.toHaveBeenCalled()
  })

  it('removes event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: ' ', handler: vi.fn() }],
      })
    )

    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })
})

describe('useKeyPress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function dispatchKey(key: string) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)
    return event
  }

  it('delegates to useKeyboardShortcuts correctly', () => {
    const handler = vi.fn()
    renderHook(() => useKeyPress('Enter', handler, { preventDefault: true }))

    dispatchKey('Enter')
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
