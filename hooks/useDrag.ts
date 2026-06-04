'use client'

import { useState, useCallback, useRef } from 'react'

export interface UseDragOptions {
  /** Minimum distance (px) before drag starts */
  threshold?: number
  /** Callback when drag starts */
  onDragStart?: (data: { x: number; y: number }) => void
  /** Callback during drag */
  onDrag?: (data: { x: number; y: number; deltaX: number; deltaY: number }) => void
  /** Callback when drag ends */
  onDragEnd?: (data: { x: number; y: number; velocityX: number; velocityY: number }) => void
  /** Disable drag on specific axes */
  axis?: 'x' | 'y' | 'both'
}

export interface UseDragResult {
  /** Whether the user is currently dragging */
  isDragging: boolean
  /** Current position relative to start */
  position: { x: number; y: number }
  /** Ref to attach to the draggable element */
  ref: React.Ref<HTMLElement>
  /** Mouse/touch event handlers to spread */
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
  }
}

/**
 * Generic drag interaction hook for mouse and touch.
 * Returns position delta and gesture state.
 */
export function useDrag(options: UseDragOptions = {}): UseDragResult {
  const {
    threshold = 5,
    onDragStart,
    onDrag,
    onDragEnd,
    axis = 'both',
  } = options

  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const startRef = useRef({ x: 0, y: 0 })
  const lastPosRef = useRef({ x: 0, y: 0 })
  const velocityRef = useRef({ vx: 0, vy: 0 })
  const lastTimeRef = useRef(0)
  const elementRef = useRef<HTMLElement>(null)

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      startRef.current = { x: clientX, y: clientY }
      lastPosRef.current = { x: 0, y: 0 }
      velocityRef.current = { vx: 0, vy: 0 }
      lastTimeRef.current = Date.now()
      setIsDragging(false)
    },
    []
  )

  const isDraggingRef = useRef(false)
  const [, forceUpdate] = useState(0)

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const deltaX = axis === 'y' ? 0 : clientX - startRef.current.x
      const deltaY = axis === 'x' ? 0 : clientY - startRef.current.y

      if (!isDraggingRef.current) {
        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
          isDraggingRef.current = true
          setIsDragging(true)
          onDragStart?.({ x: deltaX, y: deltaY })
        }
        return
      }

      const now = Date.now()
      const dt = now - lastTimeRef.current
      if (dt > 0) {
        velocityRef.current = {
          vx: (deltaX - lastPosRef.current.x) / dt,
          vy: (deltaY - lastPosRef.current.y) / dt,
        }
      }

      lastPosRef.current = { x: deltaX, y: deltaY }
      lastTimeRef.current = now

      setPosition({ x: deltaX, y: deltaY })
      onDrag?.({ x: deltaX, y: deltaY, deltaX, deltaY })
    },
    [axis, threshold, onDragStart, onDrag]
  )

  const handleEnd = useCallback(() => {
    if (isDraggingRef.current) {
      onDragEnd?.({
        x: lastPosRef.current.x,
        y: lastPosRef.current.y,
        velocityX: velocityRef.current.vx,
        velocityY: velocityRef.current.vy,
      })
    }
    isDraggingRef.current = false
    setIsDragging(false)
  }, [onDragEnd])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      handleStart(e.clientX, e.clientY)

      const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
      const handleMouseUp = () => {
        handleEnd()
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [handleStart, handleMove, handleEnd]
  )

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return
      handleStart(e.touches[0].clientX, e.touches[0].clientY)

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY)
        }
      }
      const handleTouchEnd = () => {
        handleEnd()
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
      }

      window.addEventListener('touchmove', handleTouchMove, { passive: true })
      window.addEventListener('touchend', handleTouchEnd)
    },
    [handleStart, handleMove, handleEnd]
  )

  return {
    isDragging,
    position,
    ref: elementRef,
    handlers: { onMouseDown, onTouchStart },
  }
}
