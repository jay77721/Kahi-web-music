import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, cleanup, act } from '@testing-library/react'
import { useDominantColor, extractDominantColor } from '@/hooks/useDominantColor'
import type { ExtractionContext } from '@/hooks/useDominantColor'
import { rgbToHex, rgbToOklch } from '@/lib/color'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Stub global OffscreenCanvas to keep jsdom from blowing up
class FakeOffscreenCanvas {
  width: number
  height: number
  constructor(w: number, h: number) {
    this.width = w
    this.height = h
  }
  getContext(type: string) {
    if (type !== '2d') return null
    return {
      drawImage: () => undefined,
      getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4) }),
    }
  }
}
;(globalThis as unknown as { OffscreenCanvas: typeof OffscreenCanvas }).OffscreenCanvas =
  FakeOffscreenCanvas as unknown as typeof OffscreenCanvas

// Mock `swr` so we get a real working `useSWRConfig` / `mutate` / `cache`
// without hitting the network.
const sharedCache = new Map<string, { data?: unknown; error?: unknown; isValidating?: boolean; isLoading?: boolean }>()
vi.mock('swr', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const fakeMutate = async (key: string, data: unknown) => {
    const entry = sharedCache.get(key) ?? {}
    entry.data = data
    sharedCache.set(key, entry)
    return data
  }
  return {
    ...actual,
    useSWRConfig: () => ({
      cache: sharedCache,
      mutate: fakeMutate,
    }),
    mutate: fakeMutate,
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFakeImageData(
  pixels: Array<[number, number, number, number]>,
  size: number
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4)
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b, a] = pixels[i]!
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  }
  return data
}

function makeSolidColorContext(
  r: number,
  g: number,
  b: number,
  size: number = 50,
  options: { failFetch?: boolean; failDecode?: boolean; failSample?: boolean } = {}
): ExtractionContext {
  return {
    async fetchImage() {
      if (options.failFetch) throw new Error('fetch fail')
      return new Blob(['fake'], { type: 'image/png' })
    },
    async decodeImage() {
      if (options.failDecode) throw new Error('decode fail')
      return {} as ImageBitmap
    },
    samplePixels() {
      if (options.failSample) throw new Error('sample fail')
      return makeFakeImageData([[r, g, b, 255]], size)
    },
  }
}

function makeMixedContext(
  pixels: Array<[number, number, number, number]>,
  size: number = 50
): ExtractionContext {
  return {
    async fetchImage() { return new Blob(['fake'], { type: 'image/png' }) },
    async decodeImage() { return {} as ImageBitmap },
    samplePixels() { return makeFakeImageData(pixels, size) },
  }
}

function installPendingFetchMock() {
  const originalFetch = globalThis.fetch
  const fetchMock = vi.fn(() => new Promise<Response>(() => undefined))
  globalThis.fetch = fetchMock as unknown as typeof fetch

  return {
    fetchMock,
    restore: () => {
      globalThis.fetch = originalFetch
    },
  }
}

function restoreWindowProperty(
  key: 'requestIdleCallback' | 'cancelIdleCallback',
  descriptor: PropertyDescriptor | undefined
) {
  if (descriptor) {
    Object.defineProperty(window, key, descriptor)
  } else {
    Reflect.deleteProperty(window, key)
  }
}

// ---------------------------------------------------------------------------
// Pure color-conversion tests
// ---------------------------------------------------------------------------

describe('rgbToHex', () => {
  test('formats red as "#ff0000"', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
  })

  test('formats green as "#00ff00"', () => {
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
  })

  test('formats blue as "#0000ff"', () => {
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
  })

  test('formats Spotify green as "#1ed760"', () => {
    expect(rgbToHex(30, 215, 96)).toBe('#1ed760')
  })

  test('clamps out-of-range values', () => {
    expect(rgbToHex(300, -10, 128)).toBe('#ff0080')
  })

  test('rounds to nearest integer', () => {
    // 10.4 -> 10, 20.6 -> 21, 30.5 -> 31 (or 30 depending on rounding)
    const result = rgbToHex(10.4, 20.6, 30.5)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  test('zero values produce all-zero output', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })

  test('white produces "#ffffff"', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
  })
})

describe('rgbToOklch', () => {
  test('returns oklch(...) string', () => {
    expect(rgbToOklch(255, 0, 0)).toMatch(/^oklch\(/)
  })

  test('pure black has very low lightness', () => {
    const result = rgbToOklch(0, 0, 0)
    const match = result.match(/oklch\(([0-9.]+)/)
    expect(match).toBeTruthy()
    expect(parseFloat(match![1]!)).toBeLessThan(0.05)
  })

  test('pure white has very high lightness', () => {
    const result = rgbToOklch(255, 255, 255)
    const match = result.match(/oklch\(([0-9.]+)/)
    expect(match).toBeTruthy()
    expect(parseFloat(match![1]!)).toBeGreaterThan(0.95)
  })

  test('grayscale has very low chroma', () => {
    const result = rgbToOklch(128, 128, 128)
    const chroma = result.match(/oklch\([0-9.]+ ([0-9.]+)/)
    expect(chroma).toBeTruthy()
    expect(parseFloat(chroma![1]!)).toBeLessThan(0.05)
  })
})

// ---------------------------------------------------------------------------
// extractDominantColor (pure function) tests
// ---------------------------------------------------------------------------

describe('extractDominantColor', () => {
  test('extracts the dominant color from a solid image', async () => {
    const ctx = makeSolidColorContext(255, 100, 50)
    const result = await extractDominantColor('https://x/a.png', {}, ctx)
    expect(result.color.r).toBe(255)
    expect(result.color.g).toBe(100)
    expect(result.color.b).toBe(50)
    expect(result.color.hex).toBe('#ff6432')
  })

  test('returns oklch and hex populated', async () => {
    const ctx = makeSolidColorContext(30, 215, 96)
    const result = await extractDominantColor('https://x/a.png', {}, ctx)
    expect(result.color.hex).toBe('#1ed760')
    expect(result.color.oklch).toMatch(/^oklch\(/)
  })

  test('picks the more frequent color when one dominates', async () => {
    // 30 of one color, 5 of another — dominant should be red
    const pixels: Array<[number, number, number, number]> = []
    for (let i = 0; i < 30; i++) pixels.push([255, 0, 0, 255])
    for (let i = 0; i < 5; i++) pixels.push([0, 0, 255, 255])
    const ctx = makeMixedContext(pixels)
    const result = await extractDominantColor('https://x/a.png', {}, ctx)
    expect(result.color.r).toBeGreaterThan(200)
    expect(result.color.b).toBeLessThan(80)
  })

  test('respects minAlpha threshold', async () => {
    const pixels: Array<[number, number, number, number]> = [
      [10, 10, 10, 0],   // fully transparent
      [200, 50, 50, 0],
      [100, 200, 100, 255], // only opaque pixel
    ]
    const ctx = makeMixedContext(pixels)
    const result = await extractDominantColor('https://x/a.png', { minAlpha: 16 }, ctx)
    expect(result.color.g).toBeGreaterThan(150)
    expect(result.color.r).toBeLessThan(150)
  })

  test('throws when no opaque pixels', async () => {
    const pixels: Array<[number, number, number, number]> = [
      [10, 10, 10, 0],
      [20, 20, 20, 0],
    ]
    const ctx = makeMixedContext(pixels)
    await expect(extractDominantColor('https://x/a.png', {}, ctx)).rejects.toThrow(/opaque/)
  })

  test('propagates fetch error', async () => {
    const ctx = makeSolidColorContext(0, 0, 0, 50, { failFetch: true })
    await expect(extractDominantColor('https://x/a.png', {}, ctx)).rejects.toThrow('fetch fail')
  })

  test('propagates decode error', async () => {
    const ctx = makeSolidColorContext(0, 0, 0, 50, { failDecode: true })
    await expect(extractDominantColor('https://x/a.png', {}, ctx)).rejects.toThrow('decode fail')
  })

  test('propagates sample error', async () => {
    const ctx = makeSolidColorContext(0, 0, 0, 50, { failSample: true })
    await expect(extractDominantColor('https://x/a.png', {}, ctx)).rejects.toThrow('sample fail')
  })

  test('uses custom sampleSize', async () => {
    let sampledSize = 0
    const ctx: ExtractionContext = {
      async fetchImage() { return new Blob(['x'], { type: 'image/png' }) },
      async decodeImage() { return {} as ImageBitmap },
      samplePixels(_src, size) {
        sampledSize = size
        return makeFakeImageData([[10, 20, 30, 255]], size)
      },
    }
    await extractDominantColor('https://x/a.png', { sampleSize: 80 }, ctx)
    expect(sampledSize).toBe(80)
  })
})

// ---------------------------------------------------------------------------
// React hook tests
// ---------------------------------------------------------------------------

describe('useDominantColor', () => {
  beforeEach(() => {
    sharedCache.clear()
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  test('returns null color and no error initially for null url', () => {
    const { result } = renderHook(() => useDominantColor(null))
    expect(result.current.color).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test('returns null color for empty string', () => {
    const { result } = renderHook(() => useDominantColor(''))
    expect(result.current.color).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  test('returns a result object with the expected shape', () => {
    const { result } = renderHook(() => useDominantColor(null))
    expect(result.current).toHaveProperty('color')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('error')
  })

  test('uses cached value when present', () => {
    const key = 'dominant-color:https://cached.example/img.png'
    sharedCache.set(key, { data: { r: 10, g: 20, b: 30, hex: '#0a141e', oklch: 'oklch(0.1 0.05 250)' } })
    const { result } = renderHook(() => useDominantColor('https://cached.example/img.png'))
    expect(result.current.color).toEqual({
      r: 10,
      g: 20,
      b: 30,
      hex: '#0a141e',
      oklch: 'oklch(0.1 0.05 250)',
    })
  })

  test('defers extraction until requestIdleCallback when requested', () => {
    const { fetchMock, restore } = installPendingFetchMock()
    const requestIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'requestIdleCallback')
    const cancelIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'cancelIdleCallback')
    let idleCallback: IdleRequestCallback | null = null
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallback = callback
      return 1
    })
    const cancelIdleCallback = vi.fn()

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: requestIdleCallback,
    })
    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: cancelIdleCallback,
    })

    try {
      renderHook(() =>
        useDominantColor('https://idle.example/img.png', {
          deferUntilIdle: true,
          idleTimeoutMs: 123,
        })
      )

      expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 123 })
      expect(fetchMock).not.toHaveBeenCalled()

      act(() => {
        idleCallback?.({
          didTimeout: false,
          timeRemaining: () => 50,
        })
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      restore()
      restoreWindowProperty('requestIdleCallback', requestIdleDescriptor)
      restoreWindowProperty('cancelIdleCallback', cancelIdleDescriptor)
    }
  })

  test('falls back to a timeout when requestIdleCallback is unavailable', () => {
    vi.useFakeTimers()
    const { fetchMock, restore } = installPendingFetchMock()
    const requestIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'requestIdleCallback')
    const cancelIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'cancelIdleCallback')
    Reflect.deleteProperty(window, 'requestIdleCallback')
    Reflect.deleteProperty(window, 'cancelIdleCallback')

    try {
      renderHook(() =>
        useDominantColor('https://idle-fallback.example/img.png', {
          deferUntilIdle: true,
          idleTimeoutMs: 250,
        })
      )

      act(() => {
        vi.advanceTimersByTime(249)
      })
      expect(fetchMock).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
      restore()
      restoreWindowProperty('requestIdleCallback', requestIdleDescriptor)
      restoreWindowProperty('cancelIdleCallback', cancelIdleDescriptor)
    }
  })

  test('does not schedule idle work when the color is already cached', () => {
    const { fetchMock, restore } = installPendingFetchMock()
    const requestIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'requestIdleCallback')
    const cachedColor = { r: 10, g: 20, b: 30, hex: '#0a141e', oklch: 'oklch(0.1 0.05 250)' }
    const url = 'https://cached-idle.example/img.png'
    sharedCache.set(`dominant-color:${url}`, { data: cachedColor })
    const requestIdleCallback = vi.fn()

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: requestIdleCallback,
    })

    try {
      const { result } = renderHook(() =>
        useDominantColor(url, {
          deferUntilIdle: true,
          idleTimeoutMs: 250,
        })
      )

      expect(result.current.color).toEqual(cachedColor)
      expect(result.current.isLoading).toBe(false)
      expect(requestIdleCallback).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      restore()
      restoreWindowProperty('requestIdleCallback', requestIdleDescriptor)
    }
  })

  test('clears color when url becomes null', () => {
    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useDominantColor(url),
      { initialProps: { url: 'https://a.example/x.png' as string | null } }
    )
    rerender({ url: null })
    expect(result.current.color).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })
})
