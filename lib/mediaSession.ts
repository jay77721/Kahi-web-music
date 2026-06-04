/**
 * Media Session API wrapper.
 *
 * Provides typed helpers around `navigator.mediaSession` so the browser
 * can show playback metadata + controls in the OS / browser media UI
 * (lock-screen cover on mobile, media keys, AV hardware buttons, etc.).
 *
 * All helpers are SSR-safe and no-op when the API is unavailable.
 */

export interface MediaSessionMetadataInput {
  title: string
  artist: string
  album: string
  /** Cover artwork URL. The browser will pick the best size from this list. */
  artwork?: MediaImage[]
}

export interface MediaActionHandlers {
  play?: () => void
  pause?: () => void
  nextTrack?: () => void
  previousTrack?: () => void
  seek?: (time: number) => void
}

export type MediaPlaybackState = 'playing' | 'paused' | 'none'

/** Returns true if the current environment exposes `navigator.mediaSession`. */
function isSupported(): boolean {
  return typeof window !== 'undefined' && 'mediaSession' in navigator
}

function getSession(): MediaSession | null {
  if (!isSupported()) return null
  return navigator.mediaSession
}

/**
 * Update the metadata displayed in the OS / browser media UI.
 * Pass empty strings (or omit) to clear the current metadata.
 */
export function setMediaMetadata(metadata: MediaSessionMetadataInput): void {
  const session = getSession()
  if (!session) return
  if (typeof MediaMetadata === 'undefined') return

  const { title, artist, album, artwork } = metadata
  const safeArtwork: MediaImage[] = Array.isArray(artwork) ? artwork : []

  const mediaMetadata = new MediaMetadata({
    title,
    artist,
    album,
    artwork: safeArtwork,
  })
  session.metadata = mediaMetadata
}

/**
 * Register action handlers invoked when the user interacts with the
 * OS / browser media UI (play, pause, skip, seek, etc.).
 *
 * Only the provided handlers are updated; omitted actions keep their
 * previous binding (or none, if never set).
 */
export function setMediaActionHandlers(handlers: MediaActionHandlers): void {
  const session = getSession()
  if (!session) return

  session.setActionHandler('play', handlers.play ?? null)
  session.setActionHandler('pause', handlers.pause ?? null)
  session.setActionHandler('nexttrack', handlers.nextTrack ?? null)
  session.setActionHandler('previoustrack', handlers.previousTrack ?? null)

  if (handlers.seek) {
    session.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        handlers.seek?.(details.seekTime)
      }
    })
  } else {
    session.setActionHandler('seekto', null)
  }
}

/** Update the current playback state shown in the OS media UI. */
export function setMediaPlaybackState(state: MediaPlaybackState): void {
  const session = getSession()
  if (!session) return
  session.playbackState = state
}

/** Reset all media session state (metadata, actions, playback state). */
export function clearMediaSession(): void {
  const session = getSession()
  if (!session) return

  session.metadata = null
  session.playbackState = 'none'
  session.setActionHandler('play', null)
  session.setActionHandler('pause', null)
  session.setActionHandler('nexttrack', null)
  session.setActionHandler('previoustrack', null)
  session.setActionHandler('seekto', null)
}
