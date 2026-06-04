import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

interface Item {
  id: number
  name: string
}

describe('useInfiniteScroll', () => {
  let fetchFn: ReturnType<typeof vi.fn<(offset: number, limit: number) => Promise<Item[]>>>

  beforeEach(() => {
    fetchFn = vi.fn<(offset: number, limit: number) => Promise<Item[]>>()
  })

  test('starts with empty data and hasMore=true', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({ fetchFn, initialLoad: false }),
    )
    expect(result.current.data).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasMore).toBe(true)
  })

  test('triggers initial load by default', async () => {
    fetchFn.mockResolvedValue([{ id: 1, name: 'A' }])
    const { result } = renderHook(() => useInfiniteScroll<Item>({ fetchFn, limit: 10 }))
    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })
    expect(fetchFn).toHaveBeenCalledWith(0, 10)
  })

  test('appends new pages to data', async () => {
    fetchFn
      .mockResolvedValueOnce([{ id: 1, name: 'A' }])
      .mockResolvedValueOnce([{ id: 2, name: 'B' }, { id: 3, name: 'C' }])
    const { result } = renderHook(() => useInfiniteScroll<Item>({ fetchFn, limit: 1 }))

    await waitFor(() => expect(result.current.data).toHaveLength(1))
    await act(async () => {
      await result.current.loadMore()
    })
    expect(result.current.data).toHaveLength(3)
    expect(fetchFn).toHaveBeenLastCalledWith(1, 1)
  })

  test('marks hasMore=false when result is shorter than the limit', async () => {
    fetchFn.mockResolvedValue([{ id: 1, name: 'A' }])
    const { result } = renderHook(() => useInfiniteScroll<Item>({ fetchFn, limit: 10 }))
    await waitFor(() => expect(result.current.hasMore).toBe(false))
  })

  test('does nothing when loadMore is called during a fetch', async () => {
    let resolve: (v: Item[]) => void = () => {}
    fetchFn.mockImplementation(
      () =>
        new Promise<Item[]>((r) => {
          resolve = r
        }),
    )
    const { result } = renderHook(() => useInfiniteScroll<Item>({ fetchFn }))
    await waitFor(() => expect(result.current.isLoading).toBe(true))
    // Try a second load while the first is in flight
    await act(async () => {
      result.current.loadMore()
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    // Resolve the original
    await act(async () => {
      resolve([{ id: 1, name: 'A' }])
    })
  })

  test('does nothing when hasMore is false', async () => {
    fetchFn.mockResolvedValue([{ id: 1, name: 'A' }])
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({ fetchFn, limit: 5, initialLoad: false }),
    )
    // First call returns empty → hasMore becomes false
    fetchFn.mockResolvedValueOnce([])
    await act(async () => {
      await result.current.loadMore()
    })
    expect(result.current.hasMore).toBe(false)
    expect(result.current.data).toEqual([])
    // Subsequent loadMore is a no-op because hasMore is false
    fetchFn.mockClear()
    await act(async () => {
      await result.current.loadMore()
    })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  test('logs and recovers from a fetch error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchFn.mockRejectedValue(new Error('network'))
    const { result } = renderHook(() =>
      useInfiniteScroll<Item>({ fetchFn, initialLoad: false }),
    )
    await act(async () => {
      await result.current.loadMore()
    })
    expect(errSpy).toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toEqual([])
    errSpy.mockRestore()
  })

  test('reset clears data and re-enables hasMore', async () => {
    fetchFn.mockResolvedValue([{ id: 1, name: 'A' }])
    const { result } = renderHook(() => useInfiniteScroll<Item>({ fetchFn, limit: 5 }))
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    await act(async () => {
      result.current.reset()
    })
    expect(result.current.data).toEqual([])
    expect(result.current.hasMore).toBe(true)
  })
})
