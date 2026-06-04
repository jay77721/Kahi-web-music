'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface UseHoverOptions {
  /** Delay before hover activates (ms) */
  enterDelay?: number
  /** Delay before hover deactivates (ms) */
  leaveDelay?: number
}

interface UseHoverResult {
  /** Whether the element is currently hovered */
  isHovered: boolean
  /** Ref to attach to the target element */
  ref: (node: HTMLElement | null) => void
  /** Bind handlers to an element */
  bind: {
    onMouseEnter: () => void
    onMouseLeave: () => void
    onFocus: () => void
    onBlur: () => void
  }
  /** Manually set hover state */
  setHovered: (hovered: boolean) => void
}

/**
 * Tracks hover state on an element with optional enter/leave delays.
 * Useful for tooltips, dropdowns, and delayed hover effects.
 */
export function useHover(options: UseHoverOptions = {}): UseHoverResult {
  const { enterDelay = 0, leaveDelay = 0 } = options
  const [isHovered, setIsHovered] = useState(false)
  const nodeRef = useRef<HTMLElement | null>(null)
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current)
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
  }, [])

  const handleMouseEnter = () => {
    clearTimers()
    enterTimerRef.current = setTimeout(() => setIsHovered(true), enterDelay)
  }

  const handleMouseLeave = () => {
    clearTimers()
    leaveTimerRef.current = setTimeout(() => setIsHovered(false), leaveDelay)
  }

  const handleFocus = () => {
    clearTimers()
    enterTimerRef.current = setTimeout(() => setIsHovered(true), enterDelay)
  }

  const handleBlur = () => {
    clearTimers()
    leaveTimerRef.current = setTimeout(() => setIsHovered(false), leaveDelay)
  }

  const setRef = (node: HTMLElement | null) => {
    if (nodeRef.current && nodeRef.current !== node) {
      nodeRef.current.removeEventListener('mouseenter', handleMouseEnter)
      nodeRef.current.removeEventListener('mouseleave', handleMouseLeave)
      nodeRef.current.removeEventListener('focus', handleFocus)
      nodeRef.current.removeEventListener('blur', handleBlur)
    }
    if (node && nodeRef.current !== node) {
      node.addEventListener('mouseenter', handleMouseEnter)
      node.addEventListener('mouseleave', handleMouseLeave)
      node.addEventListener('focus', handleFocus)
      node.addEventListener('blur', handleBlur)
    }
    nodeRef.current = node
  }

  useEffect(() => {
    return clearTimers
  }, [clearTimers])

  const setHovered = useCallback((hovered: boolean) => {
    clearTimers()
    setIsHovered(hovered)
  }, [clearTimers])

  return {
    isHovered,
    ref: setRef,
    bind: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
    setHovered,
  }
}
