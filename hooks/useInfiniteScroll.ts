'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseInfiniteScrollOptions<T> {
  fetchFn: (offset: number, limit: number) => Promise<T[]>
  limit?: number
  initialLoad?: boolean
}

interface UseInfiniteScrollResult<T> {
  data: T[]
  isLoading: boolean
  hasMore: boolean
  loadMore: () => void
  reset: () => void
}

export function useInfiniteScroll<T>({
  fetchFn,
  limit = 30,
  initialLoad = true,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)
  const isMountedRef = useRef(true)
  const hasLoadedRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const result = await fetchFn(offsetRef.current, limit)
      if (!isMountedRef.current) return

      if (result.length < limit) {
        setHasMore(false)
      }

      setData(prev => [...prev, ...result])
      offsetRef.current += result.length
    } catch (error) {
      console.error('Infinite scroll fetch error:', error)
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [fetchFn, limit, isLoading, hasMore])

  const reset = useCallback(() => {
    setData([])
    setHasMore(true)
    offsetRef.current = 0
    hasLoadedRef.current = false
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    if (initialLoad && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadMore()
    }
    return () => {
      isMountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { data, isLoading, hasMore, loadMore, reset }
}
