import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { useSwipe } from '@/hooks/useSwipe'

interface TouchInit {
  clientX: number
  clientY: number
}

function fireTouch(
  target: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend',
  touches: TouchInit[]
): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    touches: ArrayLike<TouchInit>
    changedTouches: ArrayLike<TouchInit>
  }
  if (type === 'touchend') {
    event.changedTouches = touches
    event.touches = []
  } else {
    event.touches = touches
    event.changedTouches = []
  }
  target.dispatchEvent(event)
}

describe('useSwipe', () => {
  let target: HTMLDivElement
  let ref: RefObject<HTMLDivElement | null>

  beforeEach(() => {
    target = document.createElement('div')
    document.body.appendChild(target)
    ref = { current: target }
  })

  afterEach(() => {
    document.body.removeChild(target)
    vi.clearAllMocks()
  })

  it('triggers onSwipeLeft when finger moves left past the threshold', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()
    renderHook(() => useSwipe(ref, { threshold: 50, onSwipeLeft, onSwipeRight }))

    fireTouch(target, 'touchstart', [{ clientX: 200, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 100, clientY: 100 }])

    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('triggers onSwipeRight when finger moves right past the threshold', () => {
    const onSwipeRight = vi.fn()
    renderHook(() => useSwipe(ref, { threshold: 50, onSwipeRight }))

    fireTouch(target, 'touchstart', [{ clientX: 100, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 200, clientY: 100 }])

    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('triggers onSwipeUp when finger moves up past the threshold', () => {
    const onSwipeUp = vi.fn()
    const onSwipeDown = vi.fn()
    renderHook(() => useSwipe(ref, { threshold: 50, onSwipeUp, onSwipeDown }))

    fireTouch(target, 'touchstart', [{ clientX: 100, clientY: 200 }])
    fireTouch(target, 'touchend', [{ clientX: 100, clientY: 100 }])

    expect(onSwipeUp).toHaveBeenCalledTimes(1)
    expect(onSwipeDown).not.toHaveBeenCalled()
  })

  it('triggers onSwipeDown when finger moves down past the threshold', () => {
    const onSwipeDown = vi.fn()
    renderHook(() => useSwipe(ref, { threshold: 50, onSwipeDown }))

    fireTouch(target, 'touchstart', [{ clientX: 100, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 100, clientY: 200 }])

    expect(onSwipeDown).toHaveBeenCalledTimes(1)
  })

  it('does not trigger any callback when movement is below the threshold', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()
    const onSwipeUp = vi.fn()
    const onSwipeDown = vi.fn()
    renderHook(() =>
      useSwipe(ref, {
        threshold: 100,
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
      })
    )

    fireTouch(target, 'touchstart', [{ clientX: 100, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 130, clientY: 120 }])

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
    expect(onSwipeUp).not.toHaveBeenCalled()
    expect(onSwipeDown).not.toHaveBeenCalled()
  })

  it('uses the default threshold of 50px when no threshold is provided', () => {
    const onSwipeLeft = vi.fn()
    renderHook(() => useSwipe(ref, { onSwipeLeft }))

    // 40px movement — under the default 50px threshold.
    fireTouch(target, 'touchstart', [{ clientX: 100, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 60, clientY: 100 }])
    expect(onSwipeLeft).not.toHaveBeenCalled()

    // 80px movement — over the default 50px threshold.
    fireTouch(target, 'touchstart', [{ clientX: 100, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 20, clientY: 100 }])
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
  })

  it('only fires once per touch — no callbacks until the finger lifts and a new touch starts', () => {
    const onSwipeLeft = vi.fn()
    renderHook(() => useSwipe(ref, { threshold: 50, onSwipeLeft }))

    // First swipe: should fire.
    fireTouch(target, 'touchstart', [{ clientX: 200, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 100, clientY: 100 }])
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)

    // Second touch on the same gesture: should NOT fire.
    fireTouch(target, 'touchstart', [{ clientX: 200, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 100, clientY: 100 }])
    expect(onSwipeLeft).toHaveBeenCalledTimes(2)
  })

  it('does not register listeners when enabled is false', () => {
    const onSwipeLeft = vi.fn()
    const addSpy = vi.spyOn(target, 'addEventListener')
    renderHook(() => useSwipe(ref, { enabled: false, onSwipeLeft }))

    expect(addSpy).not.toHaveBeenCalledWith('touchstart', expect.anything())
    expect(addSpy).not.toHaveBeenCalledWith('touchend', expect.anything())

    fireTouch(target, 'touchstart', [{ clientX: 200, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 100, clientY: 100 }])
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('removes listeners on unmount', () => {
    const onSwipeLeft = vi.fn()
    const removeSpy = vi.spyOn(target, 'removeEventListener')
    const { unmount } = renderHook(() => useSwipe(ref, { onSwipeLeft }))

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.anything())
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.anything())

    fireTouch(target, 'touchstart', [{ clientX: 200, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 100, clientY: 100 }])
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('ignores multi-finger touches', () => {
    const onSwipeLeft = vi.fn()
    renderHook(() => useSwipe(ref, { threshold: 50, onSwipeLeft }))

    // Two touches at start — should be ignored entirely.
    fireTouch(target, 'touchstart', [
      { clientX: 200, clientY: 100 },
      { clientX: 200, clientY: 200 },
    ])
    fireTouch(target, 'touchend', [{ clientX: 100, clientY: 100 }])
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('picks the dominant axis when both deltas exceed the threshold', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeUp = vi.fn()
    renderHook(() => useSwipe(ref, { threshold: 50, onSwipeLeft, onSwipeUp }))

    // Horizontal delta (100) dominates vertical (60).
    fireTouch(target, 'touchstart', [{ clientX: 200, clientY: 100 }])
    fireTouch(target, 'touchend', [{ clientX: 100, clientY: 160 }])

    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    expect(onSwipeUp).not.toHaveBeenCalled()
  })
})
