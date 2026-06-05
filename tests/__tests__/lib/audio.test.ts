import { describe, test, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted to the top of the file. All variables used inside the
// mock factory must therefore be hoisted via `vi.hoisted`.

const mockState = vi.hoisted(() => {
  const howlInstances: Array<Record<string, unknown>> = []
  const configs: Array<Record<string, unknown>> = []
  return { howlInstances, configs }
})

// Build a constructable `Howl` that vi.mock can return. It must be a real
// function (not just a vi.fn()) so `new Howl(config)` works.
const HowlCtor = vi.hoisted(() => {
  return function Howl(this: unknown, config: Record<string, unknown>) {
    const state = {
      playing: false,
      state: 'unloaded' as 'unloaded' | 'loading' | 'loaded',
      volumeValue: typeof config.volume === 'number' ? config.volume : 1,
      seekValue: 0,
      durationValue: 0,
    }
    const handlers: Record<string, ((...args: unknown[]) => void) | null> = {
      onload: null,
      onloaderror: null,
      onplayerror: null,
      onplay: null,
      onpause: null,
      onend: null,
      onstop: null,
    }
    const instance: Record<string, unknown> = {
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn((t?: number) => {
        if (t !== undefined) {
          state.seekValue = t
          return t
        }
        return state.seekValue
      }),
      volume: vi.fn((v?: number) => {
        if (v !== undefined) {
          state.volumeValue = v
          return v
        }
        return state.volumeValue
      }),
      state: vi.fn(() => state.state),
      playing: vi.fn(() => state.playing),
      duration: vi.fn(() => state.durationValue),
      unload: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      _handlers: handlers,
      _state: state,
    }
    for (const key of Object.keys(config)) {
      const value = (config as Record<string, unknown>)[key]
      if (typeof value === 'function' && key in handlers) {
        handlers[key] = value as (...args: unknown[]) => void
      }
    }
    mockState.howlInstances.push(instance)
    mockState.configs.push(config)
    return instance
  } as unknown as ReturnType<typeof vi.fn> & ((...args: unknown[]) => unknown)
})

vi.mock('howler', () => ({
  Howl: HowlCtor,
}))

import { AudioEngine } from '@/lib/audio'

describe('AudioEngine', () => {
  let engine: AudioEngine

  beforeEach(() => {
    vi.clearAllMocks()
    mockState.howlInstances.length = 0
    mockState.configs.length = 0
    engine = new AudioEngine()
  })

  describe('initial state', () => {
    test('returns safe defaults when no source is loaded', () => {
      expect(engine.isPlaying()).toBe(false)
      expect(engine.getCurrentTime()).toBe(0)
      expect(engine.getDuration()).toBe(0)
      expect(engine.getVolume()).toBe(0)
      expect(engine.getState()).toBe('error')
    })

    test('seek with no source returns 0', () => {
      expect(engine.seek()).toBe(0)
    })

    test('play/pause/stop are no-ops when no source is loaded', () => {
      expect(() => engine.play()).not.toThrow()
      expect(() => engine.pause()).not.toThrow()
      expect(() => engine.stop()).not.toThrow()
      expect(() => engine.setVolume(0.5)).not.toThrow()
    })
  })

  describe('load', () => {
    test('skips loading when url is empty', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await engine.load('')
      expect(warnSpy).toHaveBeenCalled()
      expect(mockState.howlInstances).toHaveLength(0)
      warnSpy.mockRestore()
    })

    test('constructs a Howl with the given url and html5: true', async () => {
      await engine.load('https://example.com/audio.mp3')
      expect(mockState.howlInstances).toHaveLength(1)
      const config = mockState.configs[0]
      expect(config.src).toEqual(['https://example.com/audio.mp3'])
      expect(config.html5).toBe(true)
      expect(config.preload).toBe(true)
      expect(config.volume).toBe(1)
      expect(config.format).toEqual(['mp3'])
    })

    test('preserves a volume set before load', async () => {
      engine.setVolume(0.42)
      await engine.load('https://example.com/audio.mp3')
      expect(mockState.configs[0].volume).toBe(0.42)
      expect(engine.getVolume()).toBe(0.42)
    })

    test('keeps the current volume when loading a new url', async () => {
      await engine.load('https://example.com/a.mp3')
      engine.setVolume(0.35)
      await engine.load('https://example.com/b.mp3')
      expect(mockState.configs[1].volume).toBe(0.35)
      expect(engine.getVolume()).toBe(0.35)
    })

    test('skips reload when the same url is loaded twice', async () => {
      await engine.load('https://example.com/audio.mp3')
      await engine.load('https://example.com/audio.mp3')
      expect(mockState.howlInstances).toHaveLength(1)
    })

    test('unloads the previous Howl when loading a different url', async () => {
      await engine.load('https://example.com/a.mp3')
      const first = mockState.howlInstances[0] as { unload: ReturnType<typeof vi.fn> }
      await engine.load('https://example.com/b.mp3')
      expect(first.unload).toHaveBeenCalled()
      expect(mockState.howlInstances).toHaveLength(2)
    })
  })

  describe('play / pause / stop', () => {
    beforeEach(async () => {
      await engine.load('https://example.com/audio.mp3')
    })

    test('play delegates to the howl', () => {
      engine.play()
      const howl = mockState.howlInstances[0] as { play: ReturnType<typeof vi.fn> }
      expect(howl.play).toHaveBeenCalled()
    })

    test('pause delegates to the howl', () => {
      engine.pause()
      const howl = mockState.howlInstances[0] as { pause: ReturnType<typeof vi.fn> }
      expect(howl.pause).toHaveBeenCalled()
    })

    test('stop delegates to the howl', () => {
      engine.stop()
      const howl = mockState.howlInstances[0] as { stop: ReturnType<typeof vi.fn> }
      expect(howl.stop).toHaveBeenCalled()
    })
  })

  describe('seek', () => {
    test('returns the current time when called with no arg', async () => {
      await engine.load('https://example.com/audio.mp3')
      expect(engine.seek()).toBe(0)
    })

    test('seeks to the provided time', async () => {
      await engine.load('https://example.com/audio.mp3')
      engine.seek(42)
      const howl = mockState.howlInstances[0] as { seek: ReturnType<typeof vi.fn> }
      expect(howl.seek).toHaveBeenCalledWith(42)
      expect(engine.seek()).toBe(42)
    })
  })

  describe('setVolume / getVolume', () => {
    test('clamps volume to [0, 1]', async () => {
      await engine.load('https://example.com/audio.mp3')
      engine.setVolume(5)
      const howl = mockState.howlInstances[0] as { volume: ReturnType<typeof vi.fn> }
      expect(howl.volume).toHaveBeenLastCalledWith(1)
      engine.setVolume(-1)
      expect(howl.volume).toHaveBeenLastCalledWith(0)
    })

    test('reflects the engine volume', async () => {
      await engine.load('https://example.com/audio.mp3')
      engine.setVolume(0.42)
      expect(engine.getVolume()).toBeCloseTo(0.42)
    })

    test('remembers volume even when no source is loaded', () => {
      engine.setVolume(0.56)
      expect(engine.getVolume()).toBeCloseTo(0.56)
    })
  })

  describe('getCurrentTime / getDuration / isPlaying / getState', () => {
    test('getCurrentTime returns seek() value', async () => {
      await engine.load('https://example.com/audio.mp3')
      engine.seek(12)
      expect(engine.getCurrentTime()).toBe(12)
    })

    test('getDuration returns 0 when source not loaded', () => {
      expect(engine.getDuration()).toBe(0)
    })

    test('getState returns "playing" while the underlying howl plays', async () => {
      await engine.load('https://example.com/audio.mp3')
      const howl = mockState.howlInstances[0] as { playing: ReturnType<typeof vi.fn> }
      howl.playing.mockReturnValueOnce(true)
      expect(engine.getState()).toBe('playing')
    })

    test('getState returns "paused" when loaded and not playing', async () => {
      await engine.load('https://example.com/audio.mp3')
      const howl = mockState.howlInstances[0] as {
        state: ReturnType<typeof vi.fn>
        playing: ReturnType<typeof vi.fn>
      }
      howl.state.mockReturnValueOnce('loaded')
      howl.playing.mockReturnValueOnce(false)
      expect(engine.getState()).toBe('paused')
    })

    test('getState returns "loading" while the source is still loading', async () => {
      await engine.load('https://example.com/audio.mp3')
      const howl = mockState.howlInstances[0] as {
        state: ReturnType<typeof vi.fn>
        playing: ReturnType<typeof vi.fn>
      }
      howl.state.mockReturnValueOnce('loading')
      howl.playing.mockReturnValueOnce(false)
      expect(engine.getState()).toBe('loading')
    })
  })

  describe('event handlers', () => {
    test('onPlay / onPause / onEnd store callbacks', async () => {
      await engine.load('https://example.com/audio.mp3')
      const onPlay = vi.fn()
      const onPause = vi.fn()
      const onEnd = vi.fn()
      engine.onPlay(onPlay)
      engine.onPause(onPause)
      engine.onEnd(onEnd)

      const howl = mockState.howlInstances[0] as {
        _handlers: Record<string, ((...args: unknown[]) => void) | null>
      }
      howl._handlers.onplay?.()
      howl._handlers.onpause?.()
      howl._handlers.onend?.()

      expect(onPlay).toHaveBeenCalled()
      expect(onPause).toHaveBeenCalled()
      expect(onEnd).toHaveBeenCalled()
    })

    test('onError forwards the error from the howl on load error', async () => {
      await engine.load('https://example.com/audio.mp3')
      const onError = vi.fn()
      engine.onError(onError)
      const howl = mockState.howlInstances[0] as {
        _handlers: Record<string, ((...args: unknown[]) => void) | null>
      }
      const err = new Error('boom')
      howl._handlers.onloaderror?.(0, err)
      expect(onError).toHaveBeenCalledWith(err)
    })

    test('onError also fires on play errors', async () => {
      await engine.load('https://example.com/audio.mp3')
      const onError = vi.fn()
      engine.onError(onError)
      const howl = mockState.howlInstances[0] as {
        _handlers: Record<string, ((...args: unknown[]) => void) | null>
      }
      howl._handlers.onplayerror?.(0, 'network-fail')
      expect(onError).toHaveBeenCalledWith('network-fail')
    })

    test('onLoad forwards successful Howl load events', async () => {
      await engine.load('https://example.com/audio.mp3')
      const onLoad = vi.fn()
      engine.onLoad(onLoad)
      const howl = mockState.howlInstances[0] as {
        _handlers: Record<string, ((...args: unknown[]) => void) | null>
      }
      howl._handlers.onload?.()
      expect(onLoad).toHaveBeenCalled()
    })

    test('unsubscribe clears the matching callback', async () => {
      await engine.load('https://example.com/audio.mp3')
      const onPlay = vi.fn()
      const unsubscribe = engine.onPlay(onPlay)

      unsubscribe()

      const howl = mockState.howlInstances[0] as {
        _handlers: Record<string, ((...args: unknown[]) => void) | null>
      }
      howl._handlers.onplay?.()
      howl._handlers.onpause?.()
      expect(onPlay).not.toHaveBeenCalled()
    })

    test('an older unsubscribe does not clear a newer callback', async () => {
      await engine.load('https://example.com/audio.mp3')
      const oldOnPlay = vi.fn()
      const newOnPlay = vi.fn()
      const unsubscribeOld = engine.onPlay(oldOnPlay)
      engine.onPlay(newOnPlay)

      unsubscribeOld()

      const howl = mockState.howlInstances[0] as {
        _handlers: Record<string, ((...args: unknown[]) => void) | null>
      }
      howl._handlers.onplay?.()
      howl._handlers.onpause?.()
      expect(oldOnPlay).not.toHaveBeenCalled()
      expect(newOnPlay).toHaveBeenCalled()
    })

    test('ignores stale events from an unloaded Howl instance', async () => {
      const onLoad = vi.fn()
      engine.onLoad(onLoad)
      await engine.load('https://example.com/a.mp3')
      const first = mockState.howlInstances[0] as {
        _handlers: Record<string, ((...args: unknown[]) => void) | null>
      }

      await engine.load('https://example.com/b.mp3')
      first._handlers.onload?.()

      expect(onLoad).not.toHaveBeenCalled()

      const second = mockState.howlInstances[1] as {
        _handlers: Record<string, ((...args: unknown[]) => void) | null>
      }
      second._handlers.onload?.()
      expect(onLoad).toHaveBeenCalledTimes(1)
    })

    test('reset also clears all event callbacks', async () => {
      await engine.load('https://example.com/audio.mp3')
      const onPlay = vi.fn()
      engine.onPlay(onPlay)
      engine.reset()

      const howl = mockState.howlInstances[0] as {
        _handlers: Record<string, ((...args: unknown[]) => void) | null>
      }
      howl._handlers.onplay?.()
      expect(onPlay).not.toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    test('destroy unloads the howl and clears the url', async () => {
      await engine.load('https://example.com/audio.mp3')
      const howl = mockState.howlInstances[0] as { unload: ReturnType<typeof vi.fn> }
      engine.destroy()
      expect(howl.unload).toHaveBeenCalled()
      expect(engine.getState()).toBe('error')
    })

    test('destroy clears the loaded url so the same url can be loaded again', async () => {
      await engine.load('https://example.com/audio.mp3')
      engine.destroy()
      await engine.load('https://example.com/audio.mp3')
      expect(mockState.howlInstances).toHaveLength(2)
    })
  })
})
