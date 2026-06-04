import { describe, test, expect, vi } from 'vitest'
import { swrFetcher } from '@/lib/swr'

describe('swrFetcher', () => {
  test('returns a function', () => {
    const loader = vi.fn().mockResolvedValue('test')
    const fetcher = swrFetcher(loader)

    expect(typeof fetcher).toBe('function')
  })

  test('calls the loader when the returned function is invoked', async () => {
    const loader = vi.fn().mockResolvedValue('result')
    const fetcher = swrFetcher(loader)

    const result = await fetcher()

    expect(loader).toHaveBeenCalledTimes(1)
    expect(result).toBe('result')
  })

  test('returns the result of the loader', async () => {
    const expected = { id: 1, name: 'test' }
    const loader = vi.fn().mockResolvedValue(expected)
    const fetcher = swrFetcher(loader)

    const result = await fetcher()

    expect(result).toEqual(expected)
  })

  test('propagates errors thrown by the loader', async () => {
    const error = new Error('Loader failed')
    const loader = vi.fn().mockRejectedValue(error)
    const fetcher = swrFetcher(loader)

    await expect(fetcher()).rejects.toThrow('Loader failed')
  })

  test('propagates non-Error rejections from the loader', async () => {
    const loader = vi.fn().mockRejectedValue('string error')
    const fetcher = swrFetcher(loader)

    await expect(fetcher()).rejects.toBe('string error')
  })

  test('works with a loader that returns a string', async () => {
    const loader = vi.fn().mockResolvedValue('hello world')
    const fetcher = swrFetcher(loader)

    const result = await fetcher()

    expect(result).toBe('hello world')
    expect(typeof result).toBe('string')
  })

  test('works with a loader that returns a number', async () => {
    const loader = vi.fn().mockResolvedValue(42)
    const fetcher = swrFetcher(loader)

    const result = await fetcher()

    expect(result).toBe(42)
    expect(typeof result).toBe('number')
  })

  test('works with a loader that returns an object', async () => {
    interface TestData {
      items: string[]
      count: number
    }

    const data: TestData = { items: ['a', 'b', 'c'], count: 3 }
    const loader = vi.fn().mockResolvedValue(data)
    const fetcher = swrFetcher<TestData>(loader)

    const result = await fetcher()

    expect(result.items).toEqual(['a', 'b', 'c'])
    expect(result.count).toBe(3)
  })

  test('works with a loader that returns an array', async () => {
    const items = [1, 2, 3, 4, 5]
    const loader = vi.fn().mockResolvedValue(items)
    const fetcher = swrFetcher<number[]>(loader)

    const result = await fetcher()

    expect(result).toHaveLength(5)
    expect(result).toEqual([1, 2, 3, 4, 5])
  })

  test('calls the loader each time the returned function is called', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second')

    const fetcher = swrFetcher(loader)

    const r1 = await fetcher()
    const r2 = await fetcher()

    expect(loader).toHaveBeenCalledTimes(2)
    expect(r1).toBe('first')
    expect(r2).toBe('second')
  })

  test('returns a promise (supports async/await)', () => {
    const loader = vi.fn().mockResolvedValue('async')
    const fetcher = swrFetcher(loader)

    const result = fetcher()

    expect(result).toBeInstanceOf(Promise)
  })

  test('works with a loader that resolves to null', async () => {
    const loader = vi.fn().mockResolvedValue(null)
    const fetcher = swrFetcher<null>(loader)

    const result = await fetcher()

    expect(result).toBeNull()
  })

  test('works with a loader that resolves to undefined', async () => {
    const loader = vi.fn().mockResolvedValue(undefined)
    const fetcher = swrFetcher<undefined>(loader)

    const result = await fetcher()

    expect(result).toBeUndefined()
  })
})
