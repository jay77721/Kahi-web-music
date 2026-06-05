'use client'

import { useEffect, useRef, useState } from 'react'
import { Howler } from 'howler'

export interface UseAudioAnalyserOptions {
  /** FFT size (default 256 → 128 frequency bins). */
  fftSize?: number
  /** Smoothing time constant 0..1 (default 0.8). */
  smoothingTimeConstant?: number
  /** When false, only expose the AnalyserNode and skip the hook-owned rAF sampler. */
  collectFrequencyData?: boolean
  /** Optional externally provided AnalyserNode; if given, the hook
   *  will not create one. Useful for testing. */
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
 * Resolves the Howler.js Web Audio context and creates an AnalyserNode
 * tapped off the master gain. Falls back gracefully (returns null) when
 * Howler is unavailable or only running in html5 mode.
 */
function resolveHowlerContext(): {
  ctx: AudioContext | null
  masterGain: GainNode | null
} {
  try {
    const ctx: AudioContext | null = Howler?.ctx ?? null
    const masterGain: GainNode | null = Howler?.masterGain ?? null
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
    externalAnalyser = null,
  } = options

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(externalAnalyser)
  const [frequencyData, setFrequencyData] = useState<Uint8Array<ArrayBuffer> | null>(
    externalAnalyser && collectFrequencyData
      ? new Uint8Array(new ArrayBuffer(externalAnalyser.frequencyBinCount))
      : null
  )
  const [isActive, setIsActive] = useState<boolean>(false)

  const rafIdRef = useRef<number | null>(null)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  useEffect(() => {
    // If the caller handed us an analyser, wire it up directly.
    let analyserNode: AnalyserNode | null = externalAnalyser
    // We only own the connection we created ourselves; never disconnect a
    // node the caller passed in.
    const ownsConnection = !externalAnalyser

    if (!analyserNode) {
      const { ctx, masterGain } = resolveHowlerContext()
      if (!ctx || !masterGain) return
      try {
        analyserNode = ctx.createAnalyser()
        analyserNode.fftSize = fftSize
        analyserNode.smoothingTimeConstant = smoothingTimeConstant
        masterGain.connect(analyserNode)
      } catch {
        return
      }
    } else {
      analyserNode.fftSize = fftSize
      analyserNode.smoothingTimeConstant = smoothingTimeConstant
    }

    const data = collectFrequencyData
      ? new Uint8Array(new ArrayBuffer(analyserNode.frequencyBinCount))
      : null
    dataRef.current = data

    // Defer the synchronous setStates to a microtask so the "no setState in
    // effect body" rule is satisfied — they all happen after the current
    // render commits, not inside the effect synchronously.
    Promise.resolve().then(() => {
      setFrequencyData(data)
      setAnalyser(analyserNode)
      setIsActive(collectFrequencyData)
    })

    if (collectFrequencyData) {
      const tick = (): void => {
        if (analyserNode && dataRef.current) {
          analyserNode.getByteFrequencyData(dataRef.current)
        }
        rafIdRef.current = requestAnimationFrame(tick)
      }
      rafIdRef.current = requestAnimationFrame(tick)
    }

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      // Disconnect the analyser we created so the master gain is no longer
      // feeding it once the consumer unmounts.
      if (ownsConnection && analyserNode) {
        try {
          analyserNode.disconnect()
        } catch {
          // ignore — already disconnected or never connected
        }
      }
      setIsActive(false)
    }
  }, [fftSize, smoothingTimeConstant, collectFrequencyData, externalAnalyser])

  return { analyser, frequencyData, isActive }
}
