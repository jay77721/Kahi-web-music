'use client'

import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/stores/playerStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useUIStore } from '@/stores/uiStore'
import { audioEngine } from '@/lib/audio'
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

/**
 * PlaybackController - 独立于 UI 的播放逻辑
 * 始终挂载在 app 根布局中，不依赖 PlayerBar 渲染
 */
export function PlaybackController() {
  const {
    currentTrack, isPlaying,
    setIsPlaying, setLyrics,
    setPlaybackError, clearPlaybackError,
    setHasUserInteracted, next, prev, seek,
  } = usePlayerStore()

  const currentTrackIdRef = useRef<number | null>(null)
  const streamRetryRef = useRef<{ trackId: number | null; retried: boolean }>({
    trackId: null,
    retried: false,
  })

  // Restore persisted state on mount (client-side only)
  useEffect(() => {
    usePlayerStore.getState().restorePlayerState()
    useHistoryStore.getState().restoreHistory()
    useUIStore.getState().restoreTheme()
  }, [])

  // Track change → fetch URL → load → play
  useEffect(() => {
    if (!currentTrack) return

    // Skip if same track is already playing
    if (currentTrackIdRef.current === currentTrack.id && audioEngine.getState() === 'playing') {
      return
    }
    currentTrackIdRef.current = currentTrack.id

    let cancelled = false

    const loadAndPlay = (br = 320000) => {
      try {
        clearPlaybackError()

        const url = `/api/song/stream?id=${currentTrack.id}&br=${br}`

        if (cancelled) return

        streamRetryRef.current = { trackId: currentTrack.id, retried: false }
        audioEngine.load(url)
        const { volume, isMuted } = usePlayerStore.getState()
        audioEngine.setVolume(isMuted ? 0 : volume)

        const { hasUserInteracted, isPlaying } = usePlayerStore.getState()
        if (hasUserInteracted && isPlaying) {
          audioEngine.play()
        }
      } catch (e) {
        if (!cancelled) {
          setPlaybackError(e instanceof Error ? e.message : '加载失败')
          setIsPlaying(false)
        }
      }
    }

    loadAndPlay()
    return () => { cancelled = true }
    // currentTrack is captured via currentTrack.id; whole object intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, setIsPlaying, setPlaybackError, clearPlaybackError])

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
    const onPlay = () => { clearPlaybackError(); setIsPlaying(true) }
    const onPause = () => setIsPlaying(false)
    const onEnd = () => { setIsPlaying(false); next() }
    const retryLowerBitrate = (): boolean => {
      const { currentTrack, hasUserInteracted, isPlaying, volume, isMuted } = usePlayerStore.getState()
      const retry = streamRetryRef.current
      if (!currentTrack || retry.trackId !== currentTrack.id || retry.retried) return false

      retry.retried = true
      try {
        audioEngine.load(`/api/song/stream?id=${currentTrack.id}&br=128000`)
        audioEngine.setVolume(isMuted ? 0 : volume)
        if (hasUserInteracted && isPlaying) audioEngine.play()
        return true
      } catch {
        return false
      }
    }
    const onError = (err: unknown) => {
      if (retryLowerBitrate()) return
      setPlaybackError(err instanceof Error ? err.message : '播放出错')
      setIsPlaying(false)
    }
    const onLoad = () => {
      const dur = audioEngine.getDuration()
      if (dur > 0) usePlayerStore.getState().setDuration(dur)
    }
    const onTimeUpdate = (time: number) => {
      usePlayerStore.getState().setCurrentTime(time)
    }

    const unsubscribe = [
      audioEngine.onPlay(onPlay),
      audioEngine.onPause(onPause),
      audioEngine.onEnd(onEnd),
      audioEngine.onError(onError),
      audioEngine.onLoad(onLoad),
      audioEngine.onTimeUpdate(onTimeUpdate),
    ]

    return () => {
      unsubscribe.forEach((off) => off())
    }
  }, [setIsPlaying, setPlaybackError, clearPlaybackError, next])

  // Bind Media Session action handlers once (play/pause/next/prev/seek)
  useEffect(() => {
    setMediaActionHandlers({
      play: () => {
        setHasUserInteracted()
        if (!audioEngine.isPlaying()) audioEngine.play()
      },
      pause: () => audioEngine.pause(),
      nextTrack: () => next(),
      previousTrack: () => prev(),
      seek: (time) => seek(time),
    })
    return () => clearMediaSession()
  }, [setHasUserInteracted, next, prev, seek])

  // Sync Media Session metadata + playback state with the current track
  useEffect(() => {
    if (!currentTrack) {
      setMediaPlaybackState('none')
      return
    }

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
        if (audioEngine.isPlaying()) {
          audioEngine.pause()
        } else {
          audioEngine.play()
        }
      },
      next: () => usePlayerStore.getState().next(),
      prev: () => usePlayerStore.getState().prev(),
      playTrack: (song: { id: number; name: string; ar?: { id: number; name: string }[]; al?: { picUrl: string } }) => {
        setHasUserInteracted()
        usePlayerStore.getState().playSong(song as Song)
      },
      getState: () => ({
        isPlaying: audioEngine.isPlaying(),
        state: audioEngine.getState(),
        currentTime: audioEngine.getCurrentTime(),
        duration: audioEngine.getDuration(),
      }),
    }
    ;(window as unknown as Window).__playbackCtrl = controls
    return () => {
      if ((window as unknown as Window).__playbackCtrl === controls) {
        delete (window as unknown as Window).__playbackCtrl
      }
    }
  }, [setHasUserInteracted])

  return null
}
