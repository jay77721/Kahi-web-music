import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup, waitFor } from '@testing-library/react'
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser'

interface AnalyserMockOptions {
  frequencyBinCount: number
}

function createAnalyserMock(opts: AnalyserMockOptions): AnalyserNode & {
  getByteFrequencyData: ReturnType<typeof vi.fn>
} {
  const fftSizeRef = { value: 0 }
  const smoothingRef = { value: 0 }
  const getByteFrequencyData = vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = 128
    return arr
  })
  const node = {
    frequencyBinCount: opts.frequencyBinCount,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData,
    set fftSize(v: number) {
      fftSizeRef.value = v
      ;(node as unknown as { _fftSize: number })._fftSize = v
    },
    get fftSize() {
      return fftSizeRef.value || 256
    },
    set smoothingTimeConstant(v: number) {
      smoothingRef.value = v
      ;(node as unknown as { _smoothing: number })._smoothing = v
    },
    get smoothingTimeConstant() {
      return smoothingRef.value || 0.8
    },
  }
  return node as unknown as AnalyserNode & {
    getByteFrequencyData: ReturnType<typeof vi.fn>
  }
}

function createGainMock(): GainNode & { connect: ReturnType<typeof vi.fn> } {
  return {
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as GainNode & { connect: ReturnType<typeof vi.fn> }
}

function createContextMock(binCount: number): {
  ctx: AudioContext
  analyser: ReturnType<typeof createAnalyserMock>
  gain: ReturnType<typeof createGainMock>
} {
  const analyser = createAnalyserMock({ frequencyBinCount: binCount })
  const gain = createGainMock()
  const ctx = {
    createAnalyser: vi.fn(() => analyser),
    createGain: vi.fn(() => gain),
    destination: {},
    state: 'running',
    sampleRate: 44100,
  } as unknown as AudioContext
  return { ctx, analyser, gain }
}

const howlerMockState = vi.hoisted(() => ({
  currentCtx: null as AudioContext | null,
  currentGain: null as GainNode | null,
  importCount: 0,
}))

vi.mock('howler', () => {
  howlerMockState.importCount += 1

  return {
    default: {
      Howl: vi.fn(),
      Howler: {
        get ctx() { return howlerMockState.currentCtx },
        get masterGain() { return howlerMockState.currentGain },
        usingWebAudio: true,
        autoSuspend: true,
      },
    },
    Howl: vi.fn(),
    Howler: {
      get ctx() { return howlerMockState.currentCtx },
      get masterGain() { return howlerMockState.currentGain },
      usingWebAudio: true,
      autoSuspend: true,
    },
  }
})

let rafCallbacks: Array<FrameRequestCallback | undefined> = []
let rafIdSeq = 0

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  rafCallbacks = []
  rafIdSeq = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return ++rafIdSeq
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks[id - 1] = undefined
  })
})

afterEach(() => {
  cleanup()
  howlerMockState.currentCtx = null
  howlerMockState.currentGain = null
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('useAudioAnalyser', () => {
  it('does not import Howler when disabled', async () => {
    const mock = createContextMock(128)
    howlerMockState.currentCtx = mock.ctx
    howlerMockState.currentGain = mock.gain

    const { result } = renderHook(() => useAudioAnalyser({ enabled: false }))

    await flushMicrotasks()

    expect(howlerMockState.importCount).toBe(0)
    expect(mock.ctx.createAnalyser).not.toHaveBeenCalled()
    expect(result.current.analyser).toBeNull()
    expect(result.current.frequencyData).toBeNull()
    expect(result.current.isActive).toBe(false)
  })

  it('returns null analyser and inactive when Howler has no WebAudio context', async () => {
    howlerMockState.currentCtx = null
    howlerMockState.currentGain = null

    const { result } = renderHook(() => useAudioAnalyser())

    await waitFor(() => expect(howlerMockState.importCount).toBeGreaterThan(0))
    await flushMicrotasks()

    expect(result.current.analyser).toBeNull()
    expect(result.current.frequencyData).toBeNull()
    expect(result.current.isActive).toBe(false)
  })

  it('creates an AnalyserNode connected to the Howler master gain', async () => {
    const mock = createContextMock(128)
    howlerMockState.currentCtx = mock.ctx
    howlerMockState.currentGain = mock.gain

    const { result } = renderHook(() => useAudioAnalyser({ fftSize: 256 }))

    await waitFor(() => expect(mock.ctx.createAnalyser).toHaveBeenCalledTimes(1))
    await flushMicrotasks()

    expect(mock.gain.connect).toHaveBeenCalledWith(mock.analyser)
    expect(result.current.analyser).toBe(mock.analyser)
    expect(result.current.isActive).toBe(true)
  })

  it('applies fftSize and smoothingTimeConstant to the analyser', async () => {
    const mock = createContextMock(64)
    howlerMockState.currentCtx = mock.ctx
    howlerMockState.currentGain = mock.gain

    renderHook(() => useAudioAnalyser({ fftSize: 512, smoothingTimeConstant: 0.5 }))

    await waitFor(() => expect(mock.ctx.createAnalyser).toHaveBeenCalledTimes(1))

    expect(mock.analyser.fftSize).toBe(512)
    expect(mock.analyser.smoothingTimeConstant).toBe(0.5)
  })

  it('exposes a frequencyData Uint8Array sized to frequencyBinCount', async () => {
    const mock = createContextMock(64)
    howlerMockState.currentCtx = mock.ctx
    howlerMockState.currentGain = mock.gain

    const { result } = renderHook(() => useAudioAnalyser())

    await waitFor(() => expect(result.current.frequencyData).toBeInstanceOf(Uint8Array))

    expect(result.current.frequencyData?.length).toBe(64)
  })

  it('schedules a rAF loop that calls getByteFrequencyData', async () => {
    const mock = createContextMock(128)
    howlerMockState.currentCtx = mock.ctx
    howlerMockState.currentGain = mock.gain

    renderHook(() => useAudioAnalyser())

    await waitFor(() => expect(rafCallbacks).toHaveLength(1))

    const pendingCallbacks = [...rafCallbacks]
    act(() => {
      for (const cb of pendingCallbacks) cb?.(performance.now())
    })

    expect(mock.analyser.getByteFrequencyData).toHaveBeenCalled()
  })

  it('can expose only the analyser without scheduling a sampling rAF loop', async () => {
    const mock = createContextMock(128)
    howlerMockState.currentCtx = mock.ctx
    howlerMockState.currentGain = mock.gain

    const { result } = renderHook(() => useAudioAnalyser({ collectFrequencyData: false }))

    await waitFor(() => expect(result.current.analyser).toBe(mock.analyser))

    expect(result.current.frequencyData).toBeNull()
    expect(result.current.isActive).toBe(false)
    expect(rafCallbacks).toHaveLength(0)
    expect(mock.analyser.getByteFrequencyData).not.toHaveBeenCalled()
  })

  it('cancels rAF on unmount', async () => {
    const mock = createContextMock(128)
    howlerMockState.currentCtx = mock.ctx
    howlerMockState.currentGain = mock.gain

    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const { result, unmount } = renderHook(() => useAudioAnalyser())

    await waitFor(() => expect(result.current.isActive).toBe(true))

    unmount()

    expect(cancelSpy).toHaveBeenCalled()
    expect(rafCallbacks[0]).toBeUndefined()
  })

  it('uses an externally provided analyser without consulting Howler', async () => {
    const mock = createContextMock(64)
    const external = createAnalyserMock({ frequencyBinCount: 32 })
    howlerMockState.currentCtx = mock.ctx
    howlerMockState.currentGain = mock.gain

    const { result } = renderHook(() => useAudioAnalyser({ externalAnalyser: external }))

    await flushMicrotasks()

    expect(mock.ctx.createAnalyser).not.toHaveBeenCalled()
    expect(result.current.analyser).toBe(external)
    expect(external.fftSize).toBe(256)
    expect(result.current.frequencyData?.length).toBe(32)
  })
})
