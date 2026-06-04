'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseIntersectionObserverOptions {
  /** Root element for observation */
  root?: Element | null
  /** Margin around the root (e.g., '100px') */
  rootMargin?: string
  /** Intersection threshold (0 to 1) */
  threshold?: number | number[]
  /** Only trigger once (good for scroll-triggered animations) */
  triggerOnce?: boolean
}

interface UseIntersectionObserverResult {
  /** Whether the element is intersecting */
  isIntersecting: boolean
  /** Ref to attach to the observed element */
  ref: (node: Element | null) => void
  /** Raw IntersectionObserverEntry */
  entry: IntersectionObserverEntry | null
}

/**
 * Observes an element's visibility in the viewport using IntersectionObserver.
 * Ideal for lazy loading, scroll-triggered animations, and infinite scroll sentinels.
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverResult {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    triggerOnce = false,
  } = options

  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const nodeRef = useRef<Element | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const hasTriggeredRef = useRef(false)

  const setRef = useCallback((node: Element | null) => {
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    nodeRef.current = node
    hasTriggeredRef.current = false

    if (!node) {
      setIsIntersecting(false)
      setEntry(null)
      return
    }

    if (triggerOnce && hasTriggeredRef.current) {
      setIsIntersecting(true)
      return
    }

    const observer = new IntersectionObserver(
      ([observedEntry]) => {
        setEntry(observedEntry)
        const intersecting = observedEntry.isIntersecting

        if (intersecting) {
          setIsIntersecting(true)
          if (triggerOnce) {
            hasTriggeredRef.current = true
            observer.unobserve(node)
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false)
        }
      },
      { root, rootMargin, threshold }
    )

    observerRef.current = observer
    observer.observe(node)
  }, [root, rootMargin, threshold, triggerOnce])

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return { isIntersecting, ref: setRef, entry }
}
