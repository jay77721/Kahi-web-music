import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser'

// --- Test doubles -----------------------------------------------------------

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
    // setters
    set fftSize(v: number) { fftSizeRef.value = v; (node as unknown as { _fftSize: number })._fftSize = v },
    get fftSize() { return fftSizeRef.value || 256 },
    set smoothingTimeConstant(v: number) { smoothingRef.value = v; (node as unknown as { _smoothing: number })._smoothing = v },
    get smoothingTimeConstant() { return smoothingRef.value || 0.8 },
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

// --- Howler mock state (per-test) -----------------------------------------

let currentCtx: ReturnType<typeof createContextMock>['ctx'] | null = null
let currentGain: ReturnType<typeof createContextMock>['gain'] | null = null

vi.mock('howler', () => ({
  default: {
    Howl: vi.fn(),
    Howler: {
      get ctx() { return currentCtx },
      get masterGain() { return currentGain },
      usingWebAudio: true,
      autoSuspend: true,
    },
  },
  Howl: vi.fn(),
  Howler: {
    get ctx() { return currentCtx },
    get masterGain() { return currentGain },
    usingWebAudio: true,
    autoSuspend: true,
  },
}))

// --- RAF / cancel stubs (deterministic) -----------------------------------

let rafCallbacks: FrameRequestCallback[] = []
let rafIdSeq = 0

beforeEach(() => {
  rafCallbacks = []
  rafIdSeq = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return ++rafIdSeq
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    // mark the corresponding slot cancelled by id
    rafCallbacks[id - 1] = undefined as unknown as FrameRequestCallback
  })
})

afterEach(() => {
  cleanup()
  currentCtx = null
  currentGain = null
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// --- Tests ------------------------------------------------------------------

describe('useAudioAnalyser', () => {
  it('returns null analyser and inactive when Howler has no WebAudio context', () => {
    currentCtx = null
    currentGain = null

    const { result } = renderHook(() => useAudioAnalyser())

    expect(result.current.analyser).toBeNull()
    expect(result.current.frequencyData).toBeNull()
    expect(result.current.isActive).toBe(false)
  })

  it('creates an AnalyserNode connected to the Howler master gain', async () => {
    const mock = createContextMock(128)
    currentCtx = mock.ctx
    currentGain = mock.gain

    const { result } = renderHook(() => useAudioAnalyser({ fftSize: 256 }))

    expect(mock.ctx.createAnalyser).toHaveBeenCalledTimes(1)
    expect(mock.gain.connect).toHaveBeenCalledWith(mock.analyser)
    // setState is deferred to a microtask so the "no setState in effect
    // body" rule is satisfied — flush it before reading result.current.
    await act(async () => { await Promise.resolve() })
    expect(result.current.analyser).toBe(mock.analyser)
    expect(result.current.isActive).toBe(true)
  })

  it('applies fftSize and smoothingTimeConstant to the analyser', () => {
    const mock = createContextMock(64)
    currentCtx = mock.ctx
    currentGain = mock.gain

    renderHook(() => useAudioAnalyser({ fftSize: 512, smoothingTimeConstant: 0.5 }))

    expect(mock.analyser.fftSize).toBe(512)
    expect(mock.analyser.smoothingTimeConstant).toBe(0.5)
  })

  it('exposes a frequencyData Uint8Array sized to frequencyBinCount', async () => {
    const mock = createContextMock(64)
    currentCtx = mock.ctx
    currentGain = mock.gain

    const { result } = renderHook(() => useAudioAnalyser())

    // setState is deferred to a microtask so the "no setState in effect
    // body" rule is satisfied — flush it before reading result.current.
    await act(async () => { await Promise.resolve() })
    expect(result.current.frequencyData).toBeInstanceOf(Uint8Array)
    expect(result.current.frequencyData?.length).toBe(64)
  })

  it('schedules a rAF loop that calls getByteFrequencyData', () => {
    const mock = createContextMock(128)
    currentCtx = mock.ctx
    currentGain = mock.gain

    renderHook(() => useAudioAnalyser())

    // First rAF was scheduled on mount
    expect(rafCallbacks.length).toBe(1)

    act(() => {
      rafCallbacks.forEach((cb) => cb && cb(performance.now()))
    })

    expect(mock.analyser.getByteFrequencyData).toHaveBeenCalled()
  })

  it('can expose only the analyser without scheduling a sampling rAF loop', async () => {
    const mock = createContextMock(128)
    currentCtx = mock.ctx
    currentGain = mock.gain

    const { result } = renderHook(() => useAudioAnalyser({ collectFrequencyData: false }))

    await act(async () => { await Promise.resolve() })

    expect(result.current.analyser).toBe(mock.analyser)
    expect(result.current.frequencyData).toBeNull()
    expect(result.current.isActive).toBe(false)
    expect(rafCallbacks).toHaveLength(0)
    expect(mock.analyser.getByteFrequencyData).not.toHaveBeenCalled()
  })

  it('cancels rAF on unmount', async () => {
    const mock = createContextMock(128)
    currentCtx = mock.ctx
    currentGain = mock.gain

    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const { result, unmount } = renderHook(() => useAudioAnalyser())
    // Flush the microtask that defers setIsActive(true) before reading.
    await act(async () => { await Promise.resolve() })
    expect(result.current.isActive).toBe(true)

    unmount()
    expect(cancelSpy).toHaveBeenCalled()
    // After unmount no new rAF should be scheduled by the loop; existing
    // callback slot was marked undefined by cancelAnimationFrame.
    expect(rafCallbacks[0]).toBeUndefined()
  })

  it('uses an externally provided analyser without consulting Howler', () => {
    const external = createAnalyserMock({ frequencyBinCount: 32 })
    const { result } = renderHook(() => useAudioAnalyser({ externalAnalyser: external }))

    expect(result.current.analyser).toBe(external)
    expect(external.fftSize).toBe(256)
    expect(result.current.frequencyData?.length).toBe(32)
  })
})
