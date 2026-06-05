'use client'

import { memo, useEffect, useRef } from 'react'

interface SpectrumVisualizerProps {
  /** AnalyserNode used to read frequency data. */
  analyser: AnalyserNode | null
  /** When false, bars decay to a static baseline. */
  isPlaying: boolean
  /** Number of bars (default 64). */
  barCount?: number
  /** Optional accent color override (defaults to var(--accent)). */
  color?: string
  /** CSS class for the wrapping canvas. */
  className?: string
}

const CANVAS_HEIGHT = 96
const FALLBACK_DECAY = 0.92
const SETTLED_HEIGHT = 0.01
const DEFAULT_ACCENT = '#1ed760'

/**
 * Read-only canvas that paints 64 vertical bars from a frequency-domain
 * analyser. The bar height is proportional to the byte value divided by
 * 255. When `isPlaying` is false, the current frame decays exponentially
 * so the visualizer settles to a flat line gracefully.
 */
export const SpectrumVisualizer = memo(function SpectrumVisualizer({
  analyser,
  isPlaying,
  barCount = 64,
  color,
  className,
}: SpectrumVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const heightsRef = useRef<number[]>(new Array(barCount).fill(0))
  const rafIdRef = useRef<number | null>(null)
  // Reuse a single Uint8Array per analyser to avoid per-frame GC churn (#15).
  // The explicit `ArrayBuffer` generic keeps the type compatible with
  // `getByteFrequencyData`'s modern lib.dom signature.
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  // Cache the resolved accent color so getComputedStyle only runs on color
  // changes, not on every animation frame (#16).
  const accentRef = useRef<string>(DEFAULT_ACCENT)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    // Cap internal resolution to the device pixel ratio for crispness.
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = canvas.clientWidth * dpr
    canvas.height = CANVAS_HEIGHT * dpr
    ctx2d.scale(dpr, dpr)

    // Resolve the accent color once per effect run. The effect re-runs
    // whenever `color` changes, so this naturally re-reads computed style
    // when the override changes.
    accentRef.current =
      color ??
      (getComputedStyle(canvas).getPropertyValue('--accent').trim() ||
        DEFAULT_ACCENT)

    // Allocate (or reuse) the frequency buffer once per analyser. We hold it
    // in a ref so the per-frame `draw` closure can read it without
    // re-allocating on every requestAnimationFrame tick. The explicit
    // `new ArrayBuffer(...)` is required so the resulting Uint8Array is
    // backed by ArrayBuffer (not SharedArrayBuffer), which matches the
    // `getByteFrequencyData` signature in modern TypeScript lib.dom.
    if (analyser) {
      if (
        !dataRef.current ||
        dataRef.current.length !== analyser.frequencyBinCount
      ) {
        dataRef.current = new Uint8Array(
          new ArrayBuffer(analyser.frequencyBinCount)
        )
      }
    } else {
      dataRef.current = null
    }

    const draw = (): void => {
      const width = canvas.clientWidth
      const height = CANVAS_HEIGHT

      // Clear
      ctx2d.clearRect(0, 0, width, height)

      // Update bar heights
      const data = dataRef.current
      let shouldContinue = Boolean(analyser && isPlaying && data)
      if (analyser && isPlaying && data) {
        analyser.getByteFrequencyData(data)
        const slice = Math.max(1, Math.floor((data.length || 1) / barCount))
        for (let i = 0; i < barCount; i++) {
          // Average a slice of bins for a smoother bar.
          let sum = 0
          for (let j = 0; j < slice; j++) {
            sum += data[i * slice + j] ?? 0
          }
          const value = sum / slice / 255
          heightsRef.current[i] = value
        }
      } else {
        // Decay when paused / no analyser.
        for (let i = 0; i < barCount; i++) {
          const nextHeight = (heightsRef.current[i] ?? 0) * FALLBACK_DECAY
          heightsRef.current[i] = nextHeight < SETTLED_HEIGHT ? 0 : nextHeight
          shouldContinue ||= nextHeight >= SETTLED_HEIGHT
        }
      }

      // Paint bars
      const totalGap = width * 0.2
      const gap = totalGap / (barCount - 1)
      const barWidth = (width - totalGap) / barCount
      const accent = accentRef.current
      const top = '#ffffff'
      const gradient = ctx2d.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, accent)
      gradient.addColorStop(1, top)
      ctx2d.fillStyle = gradient

      for (let i = 0; i < barCount; i++) {
        const h = Math.max(0.02, (heightsRef.current[i] ?? 0)) * height
        const x = i * (barWidth + gap)
        const y = height - h
        const r = Math.min(barWidth / 2, 3)
        roundedRect(ctx2d, x, y, barWidth, h, r)
        ctx2d.fill()
      }

      rafIdRef.current = shouldContinue ? requestAnimationFrame(draw) : null
    }

    rafIdRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [analyser, isPlaying, barCount, color])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: CANVAS_HEIGHT, display: 'block' }}
      data-testid="spectrum-visualizer"
    />
  )
})

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}
