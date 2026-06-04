import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDrag } from '@/hooks/useDrag'

describe('useDrag', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 1000 })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('starts with isDragging=false and position 0,0', () => {
    const { result } = renderHook(() => useDrag())
    expect(result.current.isDragging).toBe(false)
    expect(result.current.position).toEqual({ x: 0, y: 0 })
  })

  test('returns handlers that can be spread on an element', () => {
    const { result } = renderHook(() => useDrag())
    expect(typeof result.current.handlers.onMouseDown).toBe('function')
    expect(typeof result.current.handlers.onTouchStart).toBe('function')
  })

  test('returns a ref to attach to the element', () => {
    const { result } = renderHook(() => useDrag())
    expect(result.current.ref).toBeDefined()
  })

  test('mouse down registers listeners and calls preventDefault', () => {
    const preventDefault = vi.fn()
    const { result } = renderHook(() => useDrag())
    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault,
      } as unknown as React.MouseEvent)
    })
    expect(preventDefault).toHaveBeenCalled()
  })

  test('move below threshold does not start the drag', () => {
    const onDragStart = vi.fn()
    const { result } = renderHook(() => useDrag({ onDragStart, threshold: 5 }))
    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }))
    })
    expect(onDragStart).not.toHaveBeenCalled()
    expect(result.current.isDragging).toBe(false)
  })

  test('move past threshold fires onDragStart and isDragging', () => {
    const onDragStart = vi.fn()
    const { result } = renderHook(() => useDrag({ onDragStart, threshold: 5 }))
    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 100,
        clientY: 100,
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 110, clientY: 105 }))
    })
    expect(onDragStart).toHaveBeenCalledWith({ x: 10, y: 5 })
    expect(result.current.isDragging).toBe(true)
  })

  test('mouseup ends the drag and fires onDragEnd', () => {
    const onDragEnd = vi.fn()
    const { result } = renderHook(() => useDrag({ onDragEnd, threshold: 5 }))
    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(onDragEnd).toHaveBeenCalled()
    expect(result.current.isDragging).toBe(false)
  })

  test('mouseup without prior drag does not call onDragEnd', () => {
    const onDragEnd = vi.fn()
    const { result } = renderHook(() => useDrag({ onDragEnd, threshold: 5 }))
    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    // No move past threshold
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(onDragEnd).not.toHaveBeenCalled()
  })

  test('axis=x locks the y delta to 0', () => {
    const onDragStart = vi.fn()
    const { result } = renderHook(() => useDrag({ axis: 'x', onDragStart, threshold: 0 }))
    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 200 }))
    })
    const last = onDragStart.mock.calls[onDragStart.mock.calls.length - 1]?.[0] as { x: number; y: number }
    expect(last.x).toBe(50)
    expect(last.y).toBe(0)
  })

  test('axis=y locks the x delta to 0', () => {
    const onDragStart = vi.fn()
    const { result } = renderHook(() => useDrag({ axis: 'y', onDragStart, threshold: 0 }))
    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 200 }))
    })
    const last = onDragStart.mock.calls[onDragStart.mock.calls.length - 1]?.[0] as { x: number; y: number }
    expect(last.x).toBe(0)
    expect(last.y).toBe(200)
  })

  test('touch start with a single finger starts a drag', () => {
    const onDragStart = vi.fn()
    const { result } = renderHook(() => useDrag({ onDragStart, threshold: 5 }))
    act(() => {
      result.current.handlers.onTouchStart({
        touches: [{ clientX: 0, clientY: 0 }],
      } as unknown as React.TouchEvent)
    })
    act(() => {
      window.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [{ clientX: 10, clientY: 10 } as unknown as Touch],
        }),
      )
    })
    expect(onDragStart).toHaveBeenCalled()
  })

  test('touch start with 0 or 2+ fingers is ignored', () => {
    const onDragStart = vi.fn()
    const { result } = renderHook(() => useDrag({ onDragStart, threshold: 0 }))
    act(() => {
      result.current.handlers.onTouchStart({
        touches: [],
      } as unknown as React.TouchEvent)
    })
    act(() => {
      result.current.handlers.onTouchStart({
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 1, clientY: 1 },
        ],
      } as unknown as React.TouchEvent)
    })
    expect(onDragStart).not.toHaveBeenCalled()
  })
})
