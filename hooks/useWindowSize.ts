'use client'

import { useState, useEffect } from 'react'

interface WindowSize {
  width: number
  height: number
}

/**
 * Returns the current window dimensions.
 * Useful for responsive logic outside of CSS/Tailwind.
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timeoutId: ReturnType<typeof setTimeout>

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [])

  return size
}

/**
 * Returns breakpoint-specific boolean values.
 */
export function useBreakpoint() {
  const { width } = useWindowSize()

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1280,
    isDesktop: width >= 1280,
    isLarge: width >= 1536,
  }
}
