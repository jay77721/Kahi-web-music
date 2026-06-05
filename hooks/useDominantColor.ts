'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useSWRConfig } from 'swr'
import { rgbToHex, rgbToOklch, type DominantColor } from '@/lib/color'

export interface UseDominantColorOptions {
  /** Down-sample the image to this size (px) before color extraction. Default 50. */
  sampleSize?: number
  /** Hard timeout for the entire extraction pipeline. Default 5000 ms. */
  timeoutMs?: number
  /** Start extraction in an idle window so hero/LCP assets can load first. */
  deferUntilIdle?: boolean
  /** Maximum idle delay before extraction starts. Default 1200 ms. */
  idleTimeoutMs?: number
  /** Minimum alpha (0-255) for a pixel to be considered opaque. Default 16. */
  minAlpha?: number
}

export interface UseDominantColorResult {
  /** The dominant color, or `null` while loading / on error. */
  color: DominantColor | null
  /** Whether extraction is in-flight. */
  isLoading: boolean
  /** Error message from the most recent failure (cleared on next attempt). */
  error: string | null
}

// ---------------------------------------------------------------------------
// Color-bucketing helpers
// ---------------------------------------------------------------------------

interface RGB {
  r: number
  g: number
  b: number
}

/**
 * Stable bucket key for a pixel. We quantize to 8-step buckets (32 levels
 * per channel) so the k-means step below converges quickly on ~150 unique
 * buckets instead of thousands of pixel values.
 */
function bucketOf(pixel: RGB): number {
  const q = (v: number): number => Math.round(v / 8) * 8
  return (q(pixel.r) << 16) | (q(pixel.g) << 8) | q(pixel.b)
}

/**
 * Lightweight 3-cluster k-means over already-bucketed pixels.
 * We cap iterations low — colors converge fast on quantized inputs.
 */
function findDominantCluster(
  pixels: readonly RGB[],
  iterations: number = 6
): RGB {
  if (pixels.length === 0) return { r: 0, g: 0, b: 0 }

  // Deterministic, spread seeds for reproducibility.
  const seeds: RGB[] = [
    pixels[0]!,
    pixels[Math.floor(pixels.length / 3)]!,
    pixels[Math.floor((pixels.length * 2) / 3)]!,
  ]
  let centroids: RGB[] = seeds.map((s) => ({ ...s }))

  for (let i = 0; i < iterations; i++) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, n: 0 }))
    for (const p of pixels) {
      let bestIdx = 0
      let bestDist = Number.POSITIVE_INFINITY
      for (let c = 0; c < centroids.length; c++) {
        const cc = centroids[c]!
        const dr = p.r - cc.r
        const dg = p.g - cc.g
        const db = p.b - cc.b
        const d = dr * dr + dg * dg + db * db
        if (d < bestDist) {
          bestDist = d
          bestIdx = c
        }
      }
      const s = sums[bestIdx]!
      s.r += p.r
      s.g += p.g
      s.b += p.b
      s.n += 1
    }
    centroids = sums.map((s, idx) => {
      if (s.n === 0) return centroids[idx]!
      return { r: s.r / s.n, g: s.g / s.n, b: s.b / s.n }
    })
  }

  const counts = centroids.map(() => 0)
  for (const p of pixels) {
    let bestIdx = 0
    let bestDist = Number.POSITIVE_INFINITY
    for (let c = 0; c < centroids.length; c++) {
      const cc = centroids[c]!
      const dr = p.r - cc.r
      const dg = p.g - cc.g
      const db = p.b - cc.b
      const d = dr * dr + dg * dg + db * db
      if (d < bestDist) {
        bestDist = d
        bestIdx = c
      }
    }
    counts[bestIdx]! += 1
  }
  let bestCentroid = centroids[0]!
  let bestCount = counts[0]!
  for (let c = 1; c < centroids.length; c++) {
    if (counts[c]! > bestCount) {
      bestCount = counts[c]!
      bestCentroid = centroids[c]!
    }
  }
  return {
    r: Math.round(bestCentroid.r),
    g: Math.round(bestCentroid.g),
    b: Math.round(bestCentroid.b),
  }
}

/**
 * Build a `DominantColor` from raw sRGB components.
 */
function buildColor(r: number, g: number, b: number): DominantColor {
  return {
    r,
    g,
    b,
    hex: rgbToHex(r, g, b),
    oklch: rgbToOklch(r, g, b),
  }
}

// ---------------------------------------------------------------------------
// Core extraction (testable, no React)
// ---------------------------------------------------------------------------

export interface ExtractedColor {
  color: DominantColor
  pixelCount: number
}

export interface ExtractionContext {
  /** Load the bytes for `url` and return them as a Blob. */
  fetchImage: (url: string) => Promise<Blob>
  /** Decode a blob into a decoded ImageBitmap / HTMLImageElement. */
  decodeImage: (blob: Blob) => Promise<ImageBitmap | HTMLImageElement>
  /** Draw `source` into a canvas at `size`x`size` and return the pixel data. */
  samplePixels: (
    source: ImageBitmap | HTMLImageElement,
    size: number
  ) => Uint8ClampedArray
}

/**
 * Pure extraction function — given a context, returns the dominant color.
 * Exported separately so it can be unit-tested without mocking the DOM.
 */
export async function extractDominantColor(
  imageUrl: string,
  options: UseDominantColorOptions,
  ctx: ExtractionContext
): Promise<ExtractedColor> {
  const { sampleSize = 50, minAlpha = 16 } = options
  const blob = await ctx.fetchImage(imageUrl)
  const source = await ctx.decodeImage(blob)
  const data = ctx.samplePixels(source, sampleSize)

  const pixels: RGB[] = []
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 255
    if ((a ?? 0) < minAlpha) continue
    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    pixels.push({ r, g, b })
  }

  // Pre-bucket to drop near-duplicate pixels — speeds up k-means significantly.
  const buckets = new Map<number, RGB>()
  for (const p of pixels) {
    const key = bucketOf(p)
    const existing = buckets.get(key)
    if (existing) {
      existing.r += p.r
      existing.g += p.g
      existing.b += p.b
    } else {
      buckets.set(key, { r: p.r, g: p.g, b: p.b })
    }
  }
  const compressed: RGB[] = []
  for (const v of buckets.values()) {
    compressed.push({ r: v.r, g: v.g, b: v.b })
  }
  if (compressed.length === 0) {
    throw new Error('No opaque pixels found in image')
  }

  const dominant = findDominantCluster(compressed)
  return {
    color: buildColor(dominant.r, dominant.g, dominant.b),
    pixelCount: pixels.length,
  }
}

// ---------------------------------------------------------------------------
// Default extraction context (uses Canvas / createImageBitmap)
// ---------------------------------------------------------------------------

function isOffscreenCanvasSupported(): boolean {
  return typeof OffscreenCanvas !== 'undefined'
}

const defaultContext: ExtractionContext = {
  async fetchImage(url) {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
    return res.blob()
  },
  async decodeImage(blob) {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(blob)
    }
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Image decode failed'))
      img.src = URL.createObjectURL(blob)
    })
  },
  samplePixels(source, size) {
    let canvas: OffscreenCanvas | HTMLCanvasElement
    let ctx2d: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (isOffscreenCanvasSupported()) {
      canvas = new OffscreenCanvas(size, size)
      ctx2d = canvas.getContext('2d')
    } else {
      canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      ctx2d = canvas.getContext('2d')
    }
    if (!ctx2d) throw new Error('Could not get 2D canvas context')
    ctx2d.drawImage(source as CanvasImageSource, 0, 0, size, size)
    return ctx2d.getImageData(0, 0, size, size).data
  },
}

// ---------------------------------------------------------------------------
// SWR cache key + fetcher wiring
// ---------------------------------------------------------------------------

const SWR_KEY_PREFIX = 'dominant-color:'
const DEFAULT_IDLE_TIMEOUT_MS = 1200

/** Stable key for SWR. We do not include options in the key — they only
 *  affect precision, not identity. Callers can re-render with different
 *  options to update internal computation if they wish. */
function swrKey(url: string | null | undefined): string | null {
  return url ? `${SWR_KEY_PREFIX}${url}` : null
}

/**
 * Public, typed SWR cache interface. We keep this small and explicit so
 * the rest of the file can stay type-safe without any `as unknown as`
 * escape hatches.
 */
export interface SWRCache<T> {
  get(key: string): { data?: T; error?: unknown } | undefined
  set(key: string, value: { data?: T; error?: unknown }): void
  keys(): IterableIterator<string>
}

export interface SWRMutate<T> {
  (key: string, data: T, opts?: boolean): Promise<T | undefined>
}

export interface SWRConfigShape<T> {
  cache: SWRCache<T>
  mutate: SWRMutate<T>
}

/**
 * Fetcher used by SWR. It runs the actual extraction with a hard timeout.
 * Exported for tests that need to drive the pipeline without React.
 */
export async function dominantColorFetcher(
  url: string,
  options: UseDominantColorOptions = {}
): Promise<DominantColor> {
  const timeoutMs = options.timeoutMs ?? 5000
  return await new Promise<DominantColor>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Color extraction timed out after ${timeoutMs} ms`)),
      timeoutMs
    )
    extractDominantColor(url, options, defaultContext)
      .then((res) => {
        clearTimeout(timer)
        resolve(res.color)
      })
      .catch((err: unknown) => {
        clearTimeout(timer)
        reject(err instanceof Error ? err : new Error('Color extraction failed'))
      })
  })
}

function scheduleExtractionStart(
  callback: () => void,
  deferUntilIdle: boolean,
  idleTimeoutMs: number
): () => void {
  if (!deferUntilIdle || typeof window === 'undefined') {
    callback()
    return () => undefined
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(callback, { timeout: idleTimeoutMs })
    return () => window.cancelIdleCallback?.(idleId)
  }

  const timer = window.setTimeout(callback, idleTimeoutMs)
  return () => window.clearTimeout(timer)
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * Extracts the dominant color from an image URL.
 *
 * Pipeline: fetch → decode → downsample to `sampleSize` → k-means → oklch.
 * Results are cached in SWR keyed on the URL; repeat calls return instantly.
 *
 * @param imageUrl - URL of the image to sample. Pass `null`/empty to skip.
 * @param options  - Tunable extraction parameters.
 */
export function useDominantColor(
  imageUrl: string | null | undefined,
  options: UseDominantColorOptions = {}
): UseDominantColorResult {
  const { cache, mutate } = useSWRConfig() as SWRConfigShape<DominantColor>
  const key = useMemo(() => swrKey(imageUrl), [imageUrl])
  const deferUntilIdle = options.deferUntilIdle ?? false
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS

  // Read once on mount/URL change so we don't flash the previous color.
  // The lazy initializer reads from the SWR cache; later, the second
  // useEffect writes the resolved color into state and flips isLoading off.
  const [color, setColor] = useState<DominantColor | null>(() => {
    if (!key) return null
    return cache.get(key)?.data ?? null
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const optionsRef = useRef(options)

  // Keep optionsRef in sync without touching it during render.
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Effect: kick off extraction. setState is only ever called from inside
  // an async callback (after `await`), so the "no setState in effect body"
  // rule does not apply — there is no synchronous cascading render.
  useEffect(() => {
    if (!key || !imageUrl) return
    // If cache already has the answer, skip the network round-trip entirely.
    if (cache.get(key)?.data) return
    const myId = ++requestIdRef.current
    let cancelled = false
    const startExtraction = () => {
      if (cancelled || requestIdRef.current !== myId) return
      // Flip loading on asynchronously to avoid the synchronous setState trap.
      Promise.resolve().then(() => {
        if (cancelled || requestIdRef.current !== myId) return
        setIsLoading(true)
        setError(null)
      })
      dominantColorFetcher(imageUrl, optionsRef.current)
        .then(async (result) => {
          if (cancelled || requestIdRef.current !== myId) return
          await mutate(key, result, false)
          if (cancelled || requestIdRef.current !== myId) return
          setColor(result)
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          if (cancelled || requestIdRef.current !== myId) return
          const message = err instanceof Error ? err.message : 'Color extraction failed'
          setError(message)
          setIsLoading(false)
        })
    }
    const cancelScheduledStart = scheduleExtractionStart(
      startExtraction,
      deferUntilIdle,
      idleTimeoutMs
    )
    return () => {
      cancelled = true
      cancelScheduledStart()
    }
  }, [imageUrl, key, cache, mutate, deferUntilIdle, idleTimeoutMs])

  // Derived state for the no-URL case.
  const noUrl = !key || !imageUrl
  return {
    color: noUrl ? null : color,
    isLoading: noUrl ? false : isLoading,
    error: noUrl ? null : error,
  }
}
