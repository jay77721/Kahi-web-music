import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHover } from '@/hooks/useHover'

describe('useHover', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('starts as not hovered', () => {
    const { result } = renderHook(() => useHover())
    expect(result.current.isHovered).toBe(false)
  })

  test('mouseenter sets isHovered=true after enterDelay', () => {
    const { result } = renderHook(() => useHover({ enterDelay: 50 }))
    act(() => {
      result.current.bind.onMouseEnter()
    })
    expect(result.current.isHovered).toBe(false)
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.isHovered).toBe(true)
  })

  test('mouseleave sets isHovered=false after leaveDelay', () => {
    const { result } = renderHook(() => useHover({ leaveDelay: 30 }))
    act(() => {
      result.current.setHovered(true)
    })
    act(() => {
      result.current.bind.onMouseLeave()
    })
    act(() => {
      vi.advanceTimersByTime(30)
    })
    expect(result.current.isHovered).toBe(false)
  })

  test('focus / blur also drive the hover state', () => {
    const { result } = renderHook(() => useHover())
    act(() => {
      result.current.bind.onFocus()
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current.isHovered).toBe(true)
    act(() => {
      result.current.bind.onBlur()
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current.isHovered).toBe(false)
  })

  test('setHovered overrides any pending delay', () => {
    const { result } = renderHook(() => useHover({ enterDelay: 500 }))
    act(() => {
      result.current.bind.onMouseEnter()
    })
    act(() => {
      result.current.setHovered(false)
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current.isHovered).toBe(false)
  })

  test('ref attaches and detaches event listeners on the element', () => {
    const { result } = renderHook(() => useHover())
    const el = document.createElement('div')
    const addSpy = vi.spyOn(el, 'addEventListener')
    const removeSpy = vi.spyOn(el, 'removeEventListener')

    act(() => {
      result.current.ref(el)
    })
    expect(addSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('focus', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('blur', expect.any(Function))

    act(() => {
      result.current.ref(null)
    })
    expect(removeSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function))
  })

  test('ref with same node does not re-attach listeners', () => {
    const { result } = renderHook(() => useHover())
    const el = document.createElement('div')
    const addSpy = vi.spyOn(el, 'addEventListener')
    act(() => {
      result.current.ref(el)
      result.current.ref(el)
    })
    // Only one attach for each event across the two ref calls
    const mouseenterCalls = addSpy.mock.calls.filter((c) => c[0] === 'mouseenter').length
    expect(mouseenterCalls).toBe(1)
  })
})
