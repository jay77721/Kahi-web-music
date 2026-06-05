import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  setMediaMetadata,
  setMediaActionHandlers,
  setMediaPlaybackState,
  clearMediaSession,
  type MediaSessionMetadataInput,
  type MediaActionHandlers,
} from '@/lib/mediaSession'

// Build a controllable fake MediaSession for the test
function createFakeSession() {
  const session = {
    metadata: null as MediaMetadata | null,
    playbackState: 'none' as MediaSessionPlaybackState,
    setActionHandler: vi.fn<(action: MediaSessionAction, handler: MediaSessionActionHandler | null) => void>(),
  }
  return session
}

function attachFakeSession(session: ReturnType<typeof createFakeSession>) {
  Object.defineProperty(navigator, 'mediaSession', {
    value: session,
    configurable: true,
    writable: true,
  })
}

// jsdom doesn't ship a MediaMetadata constructor; provide a minimal mock.
class FakeMediaMetadata {
  title: string
  artist: string
  album: string
  artwork: MediaImage[]
  constructor(init: MediaMetadataInit) {
    this.title = init.title!
    this.artist = init.artist!
    this.album = init.album!
    this.artwork = init.artwork ?? []
  }
}

if (typeof globalThis.MediaMetadata === 'undefined') {
  // @ts-expect-error - assigning minimal mock to global for tests
  globalThis.MediaMetadata = FakeMediaMetadata
}

describe('lib/mediaSession', () => {
  let session: ReturnType<typeof createFakeSession>

  beforeEach(() => {
    session = createFakeSession()
    attachFakeSession(session)
  })

  // ---------- setMediaMetadata ----------
  describe('setMediaMetadata', () => {
    test('writes a MediaMetadata with title/artist/album onto the session', () => {
      const input: MediaSessionMetadataInput = {
        title: 'Song A',
        artist: 'Artist 1',
        album: 'Album X',
      }
      setMediaMetadata(input)
      expect(session.metadata).not.toBeNull()
      expect(session.metadata?.title).toBe('Song A')
      expect(session.metadata?.artist).toBe('Artist 1')
      expect(session.metadata?.album).toBe('Album X')
    })

    test('passes artwork array through to MediaMetadata', () => {
      const artwork: MediaImage[] = [
        { src: 'https://example.com/cover-96.jpg', sizes: '96x96', type: 'image/jpeg' },
        { src: 'https://example.com/cover-512.jpg', sizes: '512x512', type: 'image/jpeg' },
      ]
      setMediaMetadata({
        title: 'Song A',
        artist: 'Artist 1',
        album: 'Album X',
        artwork,
      })
      expect(session.metadata?.artwork).toEqual(artwork)
    })

    test('falls back to empty artwork when not provided', () => {
      setMediaMetadata({ title: 't', artist: 'a', album: 'b' })
      expect(session.metadata?.artwork).toEqual([])
    })
  })

  // ---------- setMediaActionHandlers ----------
  describe('setMediaActionHandlers', () => {
    test('registers play/pause/next/prev handlers', () => {
      const handlers: MediaActionHandlers = {
        play: vi.fn(),
        pause: vi.fn(),
        nextTrack: vi.fn(),
        previousTrack: vi.fn(),
      }
      setMediaActionHandlers(handlers)
      expect(session.setActionHandler).toHaveBeenCalledWith('play', handlers.play)
      expect(session.setActionHandler).toHaveBeenCalledWith('pause', handlers.pause)
      expect(session.setActionHandler).toHaveBeenCalledWith('nexttrack', handlers.nextTrack)
      expect(session.setActionHandler).toHaveBeenCalledWith('previoustrack', handlers.previousTrack)
    })

    test('translates a seek handler into a seekto action', () => {
      const seek = vi.fn()
      setMediaActionHandlers({ seek })
      const call = session.setActionHandler.mock.calls.find(
        ([action]) => action === 'seekto',
      )
      expect(call).toBeDefined()
      const seektoHandler = call?.[1] as (details: { seekTime?: number }) => void
      expect(typeof seektoHandler).toBe('function')
      seektoHandler({ seekTime: 42 })
      expect(seek).toHaveBeenCalledWith(42)
    })

    test('ignores seekto when seekTime is undefined', () => {
      const seek = vi.fn()
      setMediaActionHandlers({ seek })
      const call = session.setActionHandler.mock.calls.find(
        ([action]) => action === 'seekto',
      )
      const seektoHandler = call?.[1] as (details: { seekTime?: number }) => void
      seektoHandler({})
      expect(seek).not.toHaveBeenCalled()
    })

    test('clears omitted actions (passes null)', () => {
      setMediaActionHandlers({ play: vi.fn() })
      const calls = session.setActionHandler.mock.calls
      const playCall = calls.find(([a]) => a === 'play')
      const pauseCall = calls.find(([a]) => a === 'pause')
      expect(playCall?.[1]).toBeTypeOf('function')
      expect(pauseCall?.[1]).toBeNull()
    })

    test('does not throw when the browser rejects an action handler', () => {
      session.setActionHandler.mockImplementation((action) => {
        if (action === 'seekto') throw new Error('unsupported action')
      })

      expect(() => setMediaActionHandlers({ seek: vi.fn() })).not.toThrow()
      expect(session.setActionHandler).toHaveBeenCalledWith('seekto', expect.any(Function))
    })
  })

  // ---------- setMediaPlaybackState ----------
  describe('setMediaPlaybackState', () => {
    test('reflects "playing" on the session', () => {
      setMediaPlaybackState('playing')
      expect(session.playbackState).toBe('playing')
    })

    test('reflects "paused" on the session', () => {
      setMediaPlaybackState('paused')
      expect(session.playbackState).toBe('paused')
    })

    test('reflects "none" on the session', () => {
      // start with something else
      session.playbackState = 'playing'
      setMediaPlaybackState('none')
      expect(session.playbackState).toBe('none')
    })
  })

  // ---------- clearMediaSession ----------
  describe('clearMediaSession', () => {
    test('resets metadata, playback state, and clears all actions', () => {
      setMediaMetadata({ title: 't', artist: 'a', album: 'b' })
      setMediaPlaybackState('playing')
      setMediaActionHandlers({
        play: vi.fn(),
        pause: vi.fn(),
        nextTrack: vi.fn(),
        previousTrack: vi.fn(),
        seek: vi.fn(),
      })
      session.setActionHandler.mockClear()

      clearMediaSession()

      expect(session.metadata).toBeNull()
      expect(session.playbackState).toBe('none')
      // every action should be cleared with null
      const clearedActions = session.setActionHandler.mock.calls.map(
        ([action, handler]) => `${action}=${handler === null}`,
      )
      expect(clearedActions).toEqual([
        'play=true',
        'pause=true',
        'nexttrack=true',
        'previoustrack=true',
        'seekto=true',
      ])
    })

    test('does not throw when clearing unsupported actions', () => {
      session.setActionHandler.mockImplementation(() => {
        throw new Error('unsupported action')
      })

      expect(() => clearMediaSession()).not.toThrow()
      expect(session.playbackState).toBe('none')
    })
  })

  describe('metadata failures', () => {
    test('clears stale metadata if MediaMetadata construction fails', () => {
      const original = globalThis.MediaMetadata
      session.metadata = new FakeMediaMetadata({ title: 'old', artist: 'a', album: 'b' }) as MediaMetadata
      class ThrowingMediaMetadata {
        constructor() {
          throw new Error('bad artwork')
        }
      }
      Object.defineProperty(globalThis, 'MediaMetadata', {
        value: ThrowingMediaMetadata as unknown as typeof MediaMetadata,
        configurable: true,
      })

      try {
        expect(() => setMediaMetadata({ title: 't', artist: 'a', album: 'b' })).not.toThrow()
        expect(session.metadata).toBeNull()
      } finally {
        Object.defineProperty(globalThis, 'MediaMetadata', {
          value: original,
          configurable: true,
        })
      }
    })
  })

  // ---------- SSR safety ----------
  describe('SSR safety (no window / no mediaSession)', () => {
    test('no-ops when navigator.mediaSession is missing', () => {
      // Replace with an object that does NOT expose mediaSession
      const stub = {} as Navigator
      const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaSession')
      Object.defineProperty(navigator, 'mediaSession', {
        value: undefined,
        configurable: true,
        writable: true,
      })

      // Should not throw
      expect(() => setMediaMetadata({ title: 't', artist: 'a', album: 'b' })).not.toThrow()
      expect(() => setMediaActionHandlers({ play: vi.fn() })).not.toThrow()
      expect(() => setMediaPlaybackState('playing')).not.toThrow()
      expect(() => clearMediaSession()).not.toThrow()

      // Restore for cleanup
      if (originalDescriptor) {
        Object.defineProperty(navigator, 'mediaSession', originalDescriptor)
      } else {
        Object.defineProperty(navigator, 'mediaSession', {
          value: undefined,
          configurable: true,
          writable: true,
        })
      }
      // Suppress unused stub
      expect(stub).toBeDefined()
    })
  })
})
