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

function setActionHandlerSafe(
  session: MediaSession,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null
): void {
  try {
    session.setActionHandler(action, handler)
  } catch {
    // Some browsers expose Media Session but reject unsupported actions.
  }
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

  try {
    session.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: safeArtwork,
    })
  } catch {
    session.metadata = null
  }
}

/**
 * Register action handlers invoked when the user interacts with the
 * OS / browser media UI (play, pause, skip, seek, etc.).
 *
 * Omitted actions are cleared so stale handlers cannot survive a re-bind.
 */
export function setMediaActionHandlers(handlers: MediaActionHandlers): void {
  const session = getSession()
  if (!session) return

  setActionHandlerSafe(session, 'play', handlers.play ?? null)
  setActionHandlerSafe(session, 'pause', handlers.pause ?? null)
  setActionHandlerSafe(session, 'nexttrack', handlers.nextTrack ?? null)
  setActionHandlerSafe(session, 'previoustrack', handlers.previousTrack ?? null)

  if (handlers.seek) {
    setActionHandlerSafe(session, 'seekto', (details) => {
      if (details.seekTime !== undefined) {
        handlers.seek?.(details.seekTime)
      }
    })
  } else {
    setActionHandlerSafe(session, 'seekto', null)
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
  setActionHandlerSafe(session, 'play', null)
  setActionHandlerSafe(session, 'pause', null)
  setActionHandlerSafe(session, 'nexttrack', null)
  setActionHandlerSafe(session, 'previoustrack', null)
  setActionHandlerSafe(session, 'seekto', null)
}
