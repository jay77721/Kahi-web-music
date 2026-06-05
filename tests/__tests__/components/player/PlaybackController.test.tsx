import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { PlaybackController } from '@/components/player/PlaybackController'
import { usePlayerStore } from '@/stores/playerStore'
import { audioEngine } from '@/lib/audio'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { mockSong } from '@/tests/helpers/mock-data'

// Build a real constructable Howl mock. The global howler mock in setup.ts
// is a flat object with bare values (not functions) which breaks
// `audioEngine.getState()` inside PlaybackController.
const howlMockState = vi.hoisted(() => {
  const instances: Array<Record<string, unknown>> = []
  return { instances }
})

const HowlCtor = vi.hoisted(() => {
  return function Howl() {
    const state = {
      playing: false,
      state: 'unloaded' as 'unloaded' | 'loading' | 'loaded',
      volumeValue: 1,
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
    howlMockState.instances.push(instance)
    return instance
  } as unknown as ((...args: unknown[]) => unknown)
})

vi.mock('howler', () => ({
  Howl: HowlCtor,
}))

// Mock the api module so lyrics fetching is a no-op
const songLyricMock = vi.fn()
vi.mock('@/lib/api', () => ({
  ncmApi: {
    songLyric: (...args: unknown[]) => songLyricMock(...args),
  },
}))

// Mock media session
const setMetadataMock = vi.fn()
const setActionHandlersMock = vi.fn()
const setPlaybackStateMock = vi.fn()
const clearMediaSessionMock = vi.fn()
vi.mock('@/lib/mediaSession', () => ({
  setMediaMetadata: (...args: unknown[]) => setMetadataMock(...args),
  setMediaActionHandlers: (...args: unknown[]) => setActionHandlersMock(...args),
  setMediaPlaybackState: (...args: unknown[]) => setPlaybackStateMock(...args),
  clearMediaSession: (...args: unknown[]) => clearMediaSessionMock(...args),
}))

function resetStore() {
  audioEngine.reset()
  storage.clear()
  usePlayerStore.setState({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    hasUserInteracted: false,
    queue: [],
    queueIndex: 0,
    playMode: 'sequential',
    lyrics: [],
    currentLyricIndex: -1,
    playbackError: null,
  })
  ;(window as unknown as { __playbackCtrl?: unknown }).__playbackCtrl = undefined
  vi.clearAllMocks()
  songLyricMock.mockResolvedValue({ data: { lrc: { lyric: '' } } })
  howlMockState.instances.length = 0
}

describe('PlaybackController', () => {
  beforeEach(() => {
    cleanup()
    resetStore()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  test('renders nothing visible', () => {
    const { container } = render(<PlaybackController />)
    expect(container.firstChild).toBeNull()
  })

  test('exposes a global playback controller on window', () => {
    render(<PlaybackController />)
    const ctrl = (window as unknown as { __playbackCtrl?: unknown }).__playbackCtrl
    expect(ctrl).toBeDefined()
    expect(typeof (ctrl as { togglePlay: () => void }).togglePlay).toBe('function')
    expect(typeof (ctrl as { next: () => void }).next).toBe('function')
    expect(typeof (ctrl as { prev: () => void }).prev).toBe('function')
    expect(typeof (ctrl as { playTrack: (s: typeof mockSong) => void }).playTrack).toBe('function')
    expect(typeof (ctrl as { getState: () => unknown }).getState).toBe('function')
  })

  test('removes the global controller on unmount', () => {
    const { unmount } = render(<PlaybackController />)
    expect((window as unknown as { __playbackCtrl?: unknown }).__playbackCtrl).toBeDefined()
    unmount()
    expect((window as unknown as { __playbackCtrl?: unknown }).__playbackCtrl).toBeUndefined()
  })

  test('does not delete a newer global controller during stale cleanup', () => {
    const { unmount } = render(<PlaybackController />)
    const replacement = {
      togglePlay: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      playTrack: vi.fn(),
      getState: vi.fn(),
    }
    ;(window as unknown as { __playbackCtrl: typeof replacement }).__playbackCtrl = replacement

    unmount()

    expect((window as unknown as { __playbackCtrl?: unknown }).__playbackCtrl).toBe(replacement)
    delete (window as unknown as { __playbackCtrl?: unknown }).__playbackCtrl
  })

  test('calling the exposed togglePlay pauses the audio engine when playing', async () => {
    const audioMod = await import('@/lib/audio')
    const pauseSpy = vi.spyOn(audioMod.audioEngine, 'pause').mockImplementation(() => {})
    const isPlayingSpy = vi
      .spyOn(audioMod.audioEngine, 'isPlaying')
      .mockReturnValue(true)
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<PlaybackController />)
    const ctrl = (window as unknown as {
      __playbackCtrl: { togglePlay: () => void }
    }).__playbackCtrl
    act(() => ctrl.togglePlay())
    expect(pauseSpy).toHaveBeenCalled()
    pauseSpy.mockRestore()
    isPlayingSpy.mockRestore()
  })

  test('calling the exposed togglePlay plays the audio engine when paused', async () => {
    const audioMod = await import('@/lib/audio')
    const playSpy = vi.spyOn(audioMod.audioEngine, 'play').mockImplementation(() => {})
    const isPlayingSpy = vi
      .spyOn(audioMod.audioEngine, 'isPlaying')
      .mockReturnValue(false)
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<PlaybackController />)
    const ctrl = (window as unknown as {
      __playbackCtrl: { togglePlay: () => void }
    }).__playbackCtrl
    act(() => ctrl.togglePlay())
    expect(playSpy).toHaveBeenCalled()
    playSpy.mockRestore()
    isPlayingSpy.mockRestore()
  })

  test('calling the exposed playTrack calls store.playSong', () => {
    const playSongSpy = vi.spyOn(usePlayerStore.getState(), 'playSong')
    usePlayerStore.setState({ currentTrack: null })
    render(<PlaybackController />)
    const ctrl = (window as unknown as {
      __playbackCtrl: { playTrack: (s: typeof mockSong) => void }
    }).__playbackCtrl
    act(() => ctrl.playTrack(mockSong))
    expect(playSongSpy).toHaveBeenCalledWith(mockSong)
    playSongSpy.mockRestore()
  })

  test('exposes a getState function returning audio engine state', async () => {
    const audioMod = await import('@/lib/audio')
    vi.spyOn(audioMod.audioEngine, 'isPlaying').mockReturnValue(false)
    vi.spyOn(audioMod.audioEngine, 'getState').mockReturnValue('paused')
    vi.spyOn(audioMod.audioEngine, 'getCurrentTime').mockReturnValue(7)
    vi.spyOn(audioMod.audioEngine, 'getDuration').mockReturnValue(200)
    render(<PlaybackController />)
    const ctrl = (window as unknown as {
      __playbackCtrl: { getState: () => Record<string, unknown> }
    }).__playbackCtrl
    const state = ctrl.getState()
    expect(state).toMatchObject({
      isPlaying: false,
      state: 'paused',
      currentTime: 7,
      duration: 200,
    })
  })

  test('binds media session action handlers once', () => {
    render(<PlaybackController />)
    expect(setActionHandlersMock).toHaveBeenCalled()
    const handlers = setActionHandlersMock.mock.calls[0]?.[0] as {
      play?: () => void
      pause?: () => void
      nextTrack?: () => void
      previousTrack?: () => void
      seek?: (t: number) => void
    }
    expect(typeof handlers.play).toBe('function')
    expect(typeof handlers.pause).toBe('function')
    expect(typeof handlers.nextTrack).toBe('function')
    expect(typeof handlers.previousTrack).toBe('function')
    expect(typeof handlers.seek).toBe('function')
  })

  test('media-session play handler plays the engine when not already playing', async () => {
    const audioMod = await import('@/lib/audio')
    const playSpy = vi.spyOn(audioMod.audioEngine, 'play').mockImplementation(() => {})
    vi.spyOn(audioMod.audioEngine, 'isPlaying').mockReturnValue(false)
    render(<PlaybackController />)
    const handlers = setActionHandlersMock.mock.calls[0]?.[0] as { play: () => void }
    act(() => handlers.play())
    expect(playSpy).toHaveBeenCalled()
    playSpy.mockRestore()
  })

  test('media-session pause handler pauses the engine', async () => {
    const audioMod = await import('@/lib/audio')
    const pauseSpy = vi.spyOn(audioMod.audioEngine, 'pause').mockImplementation(() => {})
    render(<PlaybackController />)
    const handlers = setActionHandlersMock.mock.calls[0]?.[0] as { pause: () => void }
    act(() => handlers.pause())
    expect(pauseSpy).toHaveBeenCalled()
    pauseSpy.mockRestore()
  })

  test('media-session seek handler calls store.seek', () => {
    const seekSpy = vi.spyOn(usePlayerStore.getState(), 'seek')
    render(<PlaybackController />)
    const handlers = setActionHandlersMock.mock.calls[0]?.[0] as { seek: (t: number) => void }
    act(() => handlers.seek(42))
    expect(seekSpy).toHaveBeenCalledWith(42)
    seekSpy.mockRestore()
  })

  test('clears the media session on unmount', () => {
    const { unmount } = render(<PlaybackController />)
    unmount()
    expect(clearMediaSessionMock).toHaveBeenCalled()
  })

  test('sets playback state to "none" when no track is loaded', () => {
    render(<PlaybackController />)
    // The most recent call should have been "none"
    const calls = setPlaybackStateMock.mock.calls
    const last = calls[calls.length - 1]?.[0]
    expect(last).toBe('none')
  })

  test('syncs media session metadata when a track is set', () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<PlaybackController />)
    expect(setMetadataMock).toHaveBeenCalled()
    const input = setMetadataMock.mock.calls[0]?.[0] as {
      title: string
      artist: string
      album: string
      artwork: MediaImage[]
    }
    expect(input.title).toBe(mockSong.name)
    expect(input.album).toBe(mockSong.al?.name)
    expect(input.artwork.length).toBe(3)
    expect(input.artwork[0].src).toContain('param=96y96')
    expect(input.artwork[1].src).toContain('param=256y256')
    expect(input.artwork[2].src).toContain('param=512y512')
  })

  test('uses 未知艺术家 when no artists present', () => {
    usePlayerStore.setState({ currentTrack: { ...mockSong, ar: undefined } })
    render(<PlaybackController />)
    const input = setMetadataMock.mock.calls[0]?.[0] as { artist: string }
    expect(input.artist).toBe('未知艺术家')
  })

  test('uses 未知艺术家 when artists array is empty', () => {
    usePlayerStore.setState({ currentTrack: { ...mockSong, ar: [] } })
    render(<PlaybackController />)
    const input = setMetadataMock.mock.calls[0]?.[0] as { artist: string }
    expect(input.artist).toBe('未知艺术家')
  })

  test('joins multiple artists with " / "', () => {
    usePlayerStore.setState({
      currentTrack: {
        ...mockSong,
        ar: [
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
        ],
      },
    })
    render(<PlaybackController />)
    const input = setMetadataMock.mock.calls[0]?.[0] as { artist: string }
    expect(input.artist).toBe('A / B')
  })

  test('omits artwork when the track has no cover', () => {
    usePlayerStore.setState({
      currentTrack: { ...mockSong, al: { id: 1, name: 'No', picUrl: '' } },
    })
    render(<PlaybackController />)
    const input = setMetadataMock.mock.calls[0]?.[0] as { artwork: MediaImage[] }
    expect(input.artwork).toEqual([])
  })

  test('loads lyrics for the current track', async () => {
    songLyricMock.mockResolvedValue({
      data: { lrc: { lyric: '[00:00.00]Hello' } },
    })
    usePlayerStore.setState({ currentTrack: mockSong })
    await act(async () => {
      render(<PlaybackController />)
      // Wait for the microtask chain
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(songLyricMock).toHaveBeenCalledWith(mockSong.id)
    expect(usePlayerStore.getState().lyrics.length).toBeGreaterThan(0)
  })

  test('swallows lyrics fetch errors', async () => {
    songLyricMock.mockRejectedValue(new Error('network'))
    usePlayerStore.setState({ currentTrack: mockSong })
    await act(async () => {
      render(<PlaybackController />)
      await new Promise((r) => setTimeout(r, 10))
    })
    // Should not throw
    expect(usePlayerStore.getState().lyrics).toEqual([])
  })

  test('skips engine load when same track is already playing', async () => {
    const audioMod = await import('@/lib/audio')
    const loadSpy = vi.spyOn(audioMod.audioEngine, 'load').mockImplementation(() => {})
    vi.spyOn(audioMod.audioEngine, 'getState').mockReturnValue('playing')

    usePlayerStore.setState({ currentTrack: mockSong, hasUserInteracted: true })
    await act(async () => {
      render(<PlaybackController />)
      await new Promise((r) => setTimeout(r, 10))
    })
    // On first render, the engine has nothing loaded so load IS called once.
    // Re-rendering with the same track should NOT re-load.
    expect(loadSpy).toHaveBeenCalledTimes(1)
    await act(async () => {
      // Trigger a state re-evaluation by setting a no-op state change
      usePlayerStore.setState({ volume: 0.5 })
      await new Promise((r) => setTimeout(r, 10))
    })
    // Still only one call because the track id is the same
    expect(loadSpy).toHaveBeenCalledTimes(1)
    loadSpy.mockRestore()
  })

  test('does not reload the stream when playback is paused', async () => {
    const loadSpy = vi.spyOn(audioEngine, 'load').mockImplementation(() => {})

    usePlayerStore.setState({
      currentTrack: mockSong,
      hasUserInteracted: true,
      isPlaying: true,
    })
    await act(async () => {
      render(<PlaybackController />)
      await Promise.resolve()
    })

    expect(loadSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      usePlayerStore.setState({ isPlaying: false })
      await Promise.resolve()
    })

    expect(loadSpy).toHaveBeenCalledTimes(1)
    loadSpy.mockRestore()
  })

  test('syncs store volume to the audio engine after loading a track', async () => {
    const setVolumeSpy = vi.spyOn(audioEngine, 'setVolume')
    storage.set(STORAGE_KEYS.VOLUME, 0.31)
    usePlayerStore.setState({
      currentTrack: mockSong,
      volume: 0.31,
      isMuted: false,
    })
    await act(async () => {
      render(<PlaybackController />)
      await Promise.resolve()
    })
    expect(setVolumeSpy).toHaveBeenCalledWith(0.31)
    setVolumeSpy.mockRestore()
  })

  test('applies muted volume after loading a track', async () => {
    const setVolumeSpy = vi.spyOn(audioEngine, 'setVolume')
    storage.set(STORAGE_KEYS.VOLUME, 0.31)
    usePlayerStore.setState({
      currentTrack: mockSong,
      volume: 0.31,
      isMuted: true,
    })
    await act(async () => {
      render(<PlaybackController />)
      await Promise.resolve()
    })
    expect(setVolumeSpy).toHaveBeenCalledWith(0)
    setVolumeSpy.mockRestore()
  })

  test('does not autoplay replacement track when paused current queue item is removed', async () => {
    const playSpy = vi.spyOn(audioEngine, 'play').mockImplementation(() => {})
    const songs = [
      { ...mockSong, id: 1, name: 'Paused Song' },
      { ...mockSong, id: 2, name: 'Replacement Song' },
    ]

    await act(async () => {
      render(<PlaybackController />)
      await Promise.resolve()
    })

    act(() => {
      usePlayerStore.setState({
        currentTrack: songs[0],
        queue: songs,
        queueIndex: 0,
        hasUserInteracted: true,
        isPlaying: false,
      })
    })

    await act(async () => {
      usePlayerStore.getState().removeFromQueue(0)
      await Promise.resolve()
    })

    expect(usePlayerStore.getState().currentTrack).toBe(songs[1])
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    expect(playSpy).not.toHaveBeenCalled()
    playSpy.mockRestore()
  })

  test('falls back to the 128k stream on the first engine error', async () => {
    const loadSpy = vi.spyOn(audioEngine, 'load')
    usePlayerStore.setState({ currentTrack: mockSong, hasUserInteracted: true })
    await act(async () => {
      render(<PlaybackController />)
      await Promise.resolve()
    })

    const onError = (audioEngine as unknown as {
      onErrorCallback: (e: unknown) => void
    }).onErrorCallback
    act(() => onError(new Error('320k failed')))

    expect(loadSpy).toHaveBeenCalledWith(`/api/song/stream?id=${mockSong.id}&br=320000`)
    expect(loadSpy).toHaveBeenCalledWith(`/api/song/stream?id=${mockSong.id}&br=128000`)
    expect(usePlayerStore.getState().playbackError).toBeNull()
    loadSpy.mockRestore()
  })

  test('keeps a visible error after the fallback stream also fails', async () => {
    usePlayerStore.setState({ currentTrack: mockSong, hasUserInteracted: true })
    await act(async () => {
      render(<PlaybackController />)
      await Promise.resolve()
    })

    const onError = (audioEngine as unknown as {
      onErrorCallback: (e: unknown) => void
    }).onErrorCallback
    act(() => onError(new Error('320k failed')))
    act(() => onError(new Error('128k failed')))

    expect(usePlayerStore.getState().playbackError).toBe('128k failed')
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })

  test('handles engine load error gracefully', async () => {
    // Stub the global fetch used by /api/song/stream to return ok=false
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    try {
      usePlayerStore.setState({ currentTrack: mockSong, hasUserInteracted: true })
      await act(async () => {
        render(<PlaybackController />)
        // Wait long enough for the retry loop to play out
        await new Promise((r) => setTimeout(r, 50))
      })
      // Should not throw; either error is set or isPlaying toggled off
      // We don't assert a specific value, just that the render is still alive.
      expect(usePlayerStore.getState().currentTrack).toStrictEqual(mockSong)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('audio engine events propagate to the store', async () => {
    const audioMod = await import('@/lib/audio')
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: false })
    await act(async () => {
      render(<PlaybackController />)
    })
    // Manually fire the registered engine callbacks
    const onPlay = (audioMod.audioEngine as unknown as {
      onPlayCallback: () => void
    }).onPlayCallback
    const onPause = (audioMod.audioEngine as unknown as {
      onPauseCallback: () => void
    }).onPauseCallback
    const onEnd = (audioMod.audioEngine as unknown as {
      onEndCallback: () => void
    }).onEndCallback
    const onError = (audioMod.audioEngine as unknown as {
      onErrorCallback: (e: unknown) => void
    }).onErrorCallback

    act(() => onPlay?.())
    expect(usePlayerStore.getState().isPlaying).toBe(true)

    act(() => onPause?.())
    expect(usePlayerStore.getState().isPlaying).toBe(false)

    act(() => onError?.(new Error('boom')))
    act(() => onError?.(new Error('boom')))
    expect(usePlayerStore.getState().playbackError).toBe('boom')

    act(() => onEnd?.())
    // onEnd calls next() which requires a non-empty queue to do anything
    // observable. The state should still be consistent.
    expect(usePlayerStore.getState().currentTrack).toStrictEqual(mockSong)
  })

  test('audio engine time updates propagate to the store', async () => {
    const audioMod = await import('@/lib/audio')
    usePlayerStore.setState({ currentTrack: mockSong, currentTime: 0 })
    await act(async () => {
      render(<PlaybackController />)
    })

    const onTimeUpdate = (audioMod.audioEngine as unknown as {
      onTimeUpdateCallback: (time: number) => void
    }).onTimeUpdateCallback
    act(() => onTimeUpdate?.(37.5))

    expect(usePlayerStore.getState().currentTime).toBe(37.5)
  })

  test('unsubscribes audio engine callbacks on unmount', async () => {
    const audioMod = await import('@/lib/audio')
    const { unmount } = render(<PlaybackController />)

    unmount()

    expect((audioMod.audioEngine as unknown as { onPlayCallback: unknown }).onPlayCallback).toBeNull()
    expect((audioMod.audioEngine as unknown as { onPauseCallback: unknown }).onPauseCallback).toBeNull()
    expect((audioMod.audioEngine as unknown as { onEndCallback: unknown }).onEndCallback).toBeNull()
    expect((audioMod.audioEngine as unknown as { onErrorCallback: unknown }).onErrorCallback).toBeNull()
    expect((audioMod.audioEngine as unknown as { onLoadCallback: unknown }).onLoadCallback).toBeNull()
    expect((audioMod.audioEngine as unknown as { onTimeUpdateCallback: unknown }).onTimeUpdateCallback).toBeNull()
  })

  test('onLoad callback reads duration from the engine', async () => {
    const audioMod = await import('@/lib/audio')
    vi.spyOn(audioMod.audioEngine, 'getDuration').mockReturnValue(123.45)
    usePlayerStore.setState({ currentTrack: mockSong, duration: 0 })
    await act(async () => {
      render(<PlaybackController />)
    })
    const onLoad = (audioMod.audioEngine as unknown as {
      onLoadCallback: () => void
    }).onLoadCallback
    act(() => onLoad?.())
    expect(usePlayerStore.getState().duration).toBe(123.45)
  })

  test('clears playback error on play', async () => {
    const audioMod = await import('@/lib/audio')
    usePlayerStore.setState({
      currentTrack: mockSong,
      playbackError: 'old error',
    })
    await act(async () => {
      render(<PlaybackController />)
    })
    const onPlay = (audioMod.audioEngine as unknown as {
      onPlayCallback: () => void
    }).onPlayCallback
    act(() => onPlay?.())
    expect(usePlayerStore.getState().playbackError).toBeNull()
  })

  test('sets playback state to "playing" when isPlaying is true', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: true })
    render(<PlaybackController />)
    const calls = setPlaybackStateMock.mock.calls.map((c) => c[0])
    expect(calls).toContain('playing')
  })

  test('sets playback state to "paused" when isPlaying is false', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: false })
    render(<PlaybackController />)
    const calls = setPlaybackStateMock.mock.calls.map((c) => c[0])
    expect(calls).toContain('paused')
  })

  test('restarts the same track when repeat-one reaches the end', async () => {
    const seekSpy = vi.spyOn(audioEngine, 'seek').mockImplementation(() => 0)
    const playSpy = vi.spyOn(audioEngine, 'play').mockImplementation(() => {})
    storage.set(STORAGE_KEYS.PLAY_QUEUE, [mockSong])
    storage.set(STORAGE_KEYS.PLAY_INDEX, 0)
    storage.set(STORAGE_KEYS.PLAY_MODE, 'repeat-one')
    usePlayerStore.setState({
      currentTrack: mockSong,
      queue: [mockSong],
      queueIndex: 0,
      playMode: 'repeat-one',
      hasUserInteracted: false,
    })
    await act(async () => {
      render(<PlaybackController />)
      await Promise.resolve()
    })

    const onEnd = (audioEngine as unknown as {
      onEndCallback: () => void
    }).onEndCallback
    act(() => onEnd())

    expect(seekSpy).toHaveBeenCalledWith(0)
    expect(playSpy).toHaveBeenCalled()
    expect(usePlayerStore.getState().currentTrack).toStrictEqual(mockSong)
    expect(usePlayerStore.getState().isPlaying).toBe(true)
    seekSpy.mockRestore()
    playSpy.mockRestore()
  })
})
