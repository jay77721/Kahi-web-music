'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePlayerStore } from '@/stores/playerStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useUIStore } from '@/stores/uiStore'
import { ncmApi } from '@/lib/api'
import { normalizeLyricData } from '@/lib/api-adapters'
import { parseLyricResponse } from '@/lib/lrc'
import {
  setMediaMetadata,
  setMediaActionHandlers,
  setMediaPlaybackState,
  clearMediaSession,
} from '@/lib/mediaSession'
import type { Song } from '@/types/api'

const STORE_TIME_UPDATE_INTERVAL_MS = 250
const PRIMARY_STREAM_BITRATE = 320000
const FALLBACK_STREAM_BITRATE = 128000

type AudioEngineSingleton = typeof import('@/lib/audio').audioEngine

let audioEnginePromise: Promise<AudioEngineSingleton> | null = null

function streamUrl(trackId: number, bitrate: number): string {
  return `/api/song/stream?id=${trackId}&br=${bitrate}`
}

function importAudioEngine(): Promise<AudioEngineSingleton> {
  audioEnginePromise ??= import('@/lib/audio').then((module) => module.audioEngine)
  return audioEnginePromise
}

/**
 * PlaybackController - 独立于 UI 的播放逻辑
 * 始终挂载在 app 根布局中，不依赖 PlayerBar 渲染
 */
export function PlaybackController() {
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying)
  const setLyrics = usePlayerStore((state) => state.setLyrics)
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError)
  const clearPlaybackError = usePlayerStore((state) => state.clearPlaybackError)
  const setHasUserInteracted = usePlayerStore((state) => state.setHasUserInteracted)
  const next = usePlayerStore((state) => state.next)
  const prev = usePlayerStore((state) => state.prev)
  const seek = usePlayerStore((state) => state.seek)

  const currentTrackIdRef = useRef<number | null>(null)
  const audioEngineRef = useRef<AudioEngineSingleton | null>(null)
  const streamRetryRef = useRef<{ trackId: number | null; retried: boolean }>({
    trackId: null,
    retried: false,
  })

  const getAudioEngine = useCallback(async () => {
    audioEngineRef.current ??= await importAudioEngine()
    return audioEngineRef.current
  }, [])

  // Restore persisted state on mount (client-side only)
  useEffect(() => {
    usePlayerStore.getState().restorePlayerState()
    useHistoryStore.getState().restoreHistory()
    useUIStore.getState().restoreTheme()
  }, [])

  // Track change → fetch URL → load → play
  useEffect(() => {
    if (!currentTrack) return
    let cancelled = false
    const trackId = currentTrack.id

    const loadAndPlay = async () => {
      try {
        const audioEngine = await getAudioEngine()
        if (cancelled) return

        // Skip if same track is already playing
        if (currentTrackIdRef.current === trackId && audioEngine.getState() === 'playing') {
          return
        }
        currentTrackIdRef.current = trackId
        clearPlaybackError()

        streamRetryRef.current = { trackId, retried: false }
        await audioEngine.load(streamUrl(trackId, PRIMARY_STREAM_BITRATE))
        if (cancelled) return

        const { volume, isMuted } = usePlayerStore.getState()
        audioEngine.setVolume(isMuted ? 0 : volume)

        const { hasUserInteracted, isPlaying } = usePlayerStore.getState()
        if (hasUserInteracted && isPlaying) {
          audioEngine.play()
        }
      } catch (e) {
        if (cancelled) return
        setPlaybackError(e instanceof Error ? e.message : '加载失败')
        setIsPlaying(false)
      }
    }

    void loadAndPlay()
    return () => { cancelled = true }
    // currentTrack is captured via currentTrack.id; whole object intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, getAudioEngine, setIsPlaying, setPlaybackError, clearPlaybackError])

  // Load lyrics
  useEffect(() => {
    if (!currentTrack) return
    let cancelled = false

    const loadLyrics = async () => {
      try {
        const data = await ncmApi.songLyric(currentTrack.id)
        const lyric = normalizeLyricData(data)
        if (!cancelled && lyric) {
          setLyrics(parseLyricResponse(lyric.lrc.lyric, lyric.tlyric?.lyric))
        }
      } catch { /* lyrics optional */ }
    }

    loadLyrics()
    return () => { cancelled = true }
    // currentTrack is captured via currentTrack.id; whole object intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, setLyrics])

  // AudioEngine events → store
  useEffect(() => {
    if (!currentTrack) return
    let cancelled = false
    let unsubscribe: Array<() => void> = []
    let lastStoreTimeUpdateAt: number | null = null
    const syncCurrentTime = (time: number) => {
      usePlayerStore.getState().setCurrentTime(time)
      lastStoreTimeUpdateAt = Date.now()
    }

    const bindAudioEvents = async () => {
      const audioEngine = await getAudioEngine()
      if (cancelled) return

      const flushCurrentTime = () => {
        syncCurrentTime(audioEngine.getCurrentTime())
      }
      const onPlay = () => { clearPlaybackError(); setIsPlaying(true) }
      const onPause = () => { flushCurrentTime(); setIsPlaying(false) }
      const onEnd = () => { flushCurrentTime(); setIsPlaying(false); next() }
      const retryLowerBitrate = async (): Promise<boolean> => {
        const { currentTrack, hasUserInteracted, isPlaying, volume, isMuted } = usePlayerStore.getState()
        const retry = streamRetryRef.current
        if (!currentTrack || retry.trackId !== currentTrack.id || retry.retried) return false

        retry.retried = true
        try {
          await audioEngine.load(streamUrl(currentTrack.id, FALLBACK_STREAM_BITRATE))
          if (cancelled) return false
          audioEngine.setVolume(isMuted ? 0 : volume)
          if (hasUserInteracted && isPlaying) audioEngine.play()
          return true
        } catch {
          return false
        }
      }
      const onError = (err: unknown) => {
        void (async () => {
          if (await retryLowerBitrate()) return
          if (cancelled) return
          setPlaybackError(err instanceof Error ? err.message : '播放出错')
          setIsPlaying(false)
        })()
      }
      const onLoad = () => {
        const dur = audioEngine.getDuration()
        if (dur > 0) usePlayerStore.getState().setDuration(dur)
      }
      const onTimeUpdate = (time: number) => {
        const now = Date.now()
        if (
          lastStoreTimeUpdateAt === null ||
          now - lastStoreTimeUpdateAt >= STORE_TIME_UPDATE_INTERVAL_MS
        ) {
          syncCurrentTime(time)
        }
      }

      unsubscribe = [
        audioEngine.onPlay(onPlay),
        audioEngine.onPause(onPause),
        audioEngine.onEnd(onEnd),
        audioEngine.onError(onError),
        audioEngine.onLoad(onLoad),
        audioEngine.onTimeUpdate(onTimeUpdate),
      ]
    }

    void bindAudioEvents()

    return () => {
      cancelled = true
      unsubscribe.forEach((off) => off())
    }
  }, [currentTrack, getAudioEngine, setIsPlaying, setPlaybackError, clearPlaybackError, next])

  // Bind Media Session action handlers once (play/pause/next/prev/seek)
  useEffect(() => {
    setMediaActionHandlers({
      play: () => {
        setHasUserInteracted()
        if (!usePlayerStore.getState().currentTrack) return
        setIsPlaying(true)
        void getAudioEngine().then((audioEngine) => {
          if (!audioEngine.isPlaying()) audioEngine.play()
        })
      },
      pause: () => {
        const audioEngine = audioEngineRef.current
        if (audioEngine) audioEngine.pause()
        else setIsPlaying(false)
      },
      nextTrack: () => next(),
      previousTrack: () => prev(),
      seek: (time) => seek(time),
    })
    return () => clearMediaSession()
  }, [getAudioEngine, setHasUserInteracted, setIsPlaying, next, prev, seek])

  // Sync Media Session metadata + playback state with the current track
  useEffect(() => {
    if (!currentTrack) return

    const artistNames = (currentTrack.ar ?? []).map((a) => a.name).join(' / ')
    const albumName = currentTrack.al?.name ?? ''
    const cover = currentTrack.al?.picUrl
    const artwork: MediaImage[] = cover
      ? [
          { src: `${cover}?param=96y96`, sizes: '96x96', type: 'image/jpeg' },
          { src: `${cover}?param=256y256`, sizes: '256x256', type: 'image/jpeg' },
          { src: `${cover}?param=512y512`, sizes: '512x512', type: 'image/jpeg' },
        ]
      : []

    setMediaMetadata({
      title: currentTrack.name,
      artist: artistNames || '未知艺术家',
      album: albumName,
      artwork,
    })
    // currentTrack is captured via id; whole object intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id])

  // Update playback state whenever play/pause toggles
  useEffect(() => {
    if (!currentTrack) {
      setMediaPlaybackState('none')
      return
    }
    setMediaPlaybackState(isPlaying ? 'playing' : 'paused')
  }, [currentTrack, isPlaying])


  // Expose global controls for MiniPlayer / FullScreenPlayer
  useEffect(() => {
    const controls = {
      togglePlay: () => {
        setHasUserInteracted()
        const { currentTrack, isPlaying } = usePlayerStore.getState()
        if (!currentTrack) return

        void getAudioEngine().then((audioEngine) => {
          if (audioEngine.isPlaying() || isPlaying) {
            audioEngine.pause()
            usePlayerStore.getState().setIsPlaying(false)
          } else {
            usePlayerStore.getState().setIsPlaying(true)
            audioEngine.play()
          }
        })
      },
      next: () => usePlayerStore.getState().next(),
      prev: () => usePlayerStore.getState().prev(),
      playTrack: (song: { id: number; name: string; ar?: { id: number; name: string }[]; al?: { picUrl: string } }) => {
        setHasUserInteracted()
        usePlayerStore.getState().playSong(song as Song)
      },
      getState: () => {
        const audioEngine = audioEngineRef.current
        if (!audioEngine) {
          return {
            isPlaying: false,
            state: 'error',
            currentTime: 0,
            duration: 0,
          }
        }
        return {
          isPlaying: audioEngine.isPlaying(),
          state: audioEngine.getState(),
          currentTime: audioEngine.getCurrentTime(),
          duration: audioEngine.getDuration(),
        }
      },
    }
    ;(window as unknown as Window).__playbackCtrl = controls
    return () => {
      if ((window as unknown as Window).__playbackCtrl === controls) {
        delete (window as unknown as Window).__playbackCtrl
      }
    }
  }, [getAudioEngine, setHasUserInteracted])

  return null
}
