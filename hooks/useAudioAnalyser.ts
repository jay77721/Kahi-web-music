'use client'

import { useEffect, useRef, useState } from 'react'

interface HowlerLike {
  ctx?: AudioContext | null
  masterGain?: GainNode | null
}

interface HowlerModule {
  Howler?: HowlerLike
  default?: {
    Howler?: HowlerLike
  }
}

export interface UseAudioAnalyserOptions {
  /** FFT size (default 256 -> 128 frequency bins). */
  fftSize?: number
  /** Smoothing time constant 0..1 (default 0.8). */
  smoothingTimeConstant?: number
  /** When false, only expose the AnalyserNode and skip the hook-owned rAF sampler. */
  collectFrequencyData?: boolean
  /** When false, skip Howler resolution and return an inactive analyser result. */
  enabled?: boolean
  /** Optional externally provided AnalyserNode; if given, the hook will not create one. */
  externalAnalyser?: AnalyserNode | null
}

export interface UseAudioAnalyserResult {
  /** AnalyserNode connected to the Howler master gain (null until ready). */
  analyser: AnalyserNode | null
  /** Latest frequency data (length = analyser.frequencyBinCount). */
  frequencyData: Uint8Array | null
  /** True while the rAF loop is running and Howler has a WebAudio context. */
  isActive: boolean
}

/**
 * Resolve Howler lazily so fullscreen-player code can render without putting
 * howler in the initial player chunk. Missing WebAudio support falls back to
 * a null analyser result.
 */
async function resolveHowlerContext(): Promise<{
  ctx: AudioContext | null
  masterGain: GainNode | null
}> {
  try {
    const howlerModule = await import('howler') as HowlerModule
    const howler = howlerModule.Howler ?? howlerModule.default?.Howler ?? null
    const ctx: AudioContext | null = howler?.ctx ?? null
    const masterGain: GainNode | null = howler?.masterGain ?? null
    return { ctx, masterGain }
  } catch {
    return { ctx: null, masterGain: null }
  }
}

export function useAudioAnalyser(
  options: UseAudioAnalyserOptions = {}
): UseAudioAnalyserResult {
  const {
    fftSize = 256,
    smoothingTimeConstant = 0.8,
    collectFrequencyData = true,
    enabled = true,
    externalAnalyser = null,
  } = options

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(
    enabled ? externalAnalyser : null
  )
  const [frequencyData, setFrequencyData] = useState<Uint8Array<ArrayBuffer> | null>(
    enabled && externalAnalyser && collectFrequencyData
      ? new Uint8Array(new ArrayBuffer(externalAnalyser.frequencyBinCount))
      : null
  )
  const [isActive, setIsActive] = useState<boolean>(false)

  const rafIdRef = useRef<number | null>(null)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  useEffect(() => {
    let cancelled = false
    let analyserNode: AnalyserNode | null = null
    let ownsConnection = false

    const stopSampling = (): void => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }

    const publishState = (
      nextAnalyser: AnalyserNode | null,
      data: Uint8Array<ArrayBuffer> | null,
      active: boolean
    ): void => {
      Promise.resolve().then(() => {
        if (cancelled) return
        setFrequencyData(data)
        setAnalyser(nextAnalyser)
        setIsActive(active)
      })
    }

    const startAnalyser = (node: AnalyserNode, ownsNodeConnection: boolean): void => {
      analyserNode = node
      ownsConnection = ownsNodeConnection

      const data = collectFrequencyData
        ? new Uint8Array(new ArrayBuffer(node.frequencyBinCount))
        : null
      dataRef.current = data

      publishState(node, data, collectFrequencyData)

      if (collectFrequencyData) {
        const tick = (): void => {
          if (analyserNode && dataRef.current) {
            analyserNode.getByteFrequencyData(dataRef.current)
          }
          rafIdRef.current = requestAnimationFrame(tick)
        }
        rafIdRef.current = requestAnimationFrame(tick)
      }
    }

    if (!enabled) {
      dataRef.current = null
      publishState(null, null, false)
    } else if (externalAnalyser) {
      startAnalyser(externalAnalyser, false)
    } else {
      void resolveHowlerContext().then(({ ctx, masterGain }) => {
        if (cancelled) return
        if (!ctx || !masterGain) {
          publishState(null, null, false)
          return
        }

        try {
          const node = ctx.createAnalyser()
          node.fftSize = fftSize
          node.smoothingTimeConstant = smoothingTimeConstant
          masterGain.connect(node)
          startAnalyser(node, true)
        } catch {
          publishState(null, null, false)
        }
      })
    }

    return () => {
      cancelled = true
      stopSampling()
      dataRef.current = null

      if (ownsConnection && analyserNode) {
        try {
          analyserNode.disconnect()
        } catch {
          // Ignore nodes that are already disconnected.
        }
      }
    }
  }, [fftSize, smoothingTimeConstant, collectFrequencyData, enabled, externalAnalyser])

  return { analyser, frequencyData, isActive }
}
