'use client'

import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/stores/playerStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useUIStore } from '@/stores/uiStore'
import { audioEngine } from '@/lib/audio'
import { ncmApi } from '@/lib/api'
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
    currentTrack, hasUserInteracted,
    setIsPlaying, setLyrics,
    setPlaybackError, clearPlaybackError,
    setHasUserInteracted, next, prev, seek,
  } = usePlayerStore()

  const currentTrackIdRef = useRef<number | null>(null)

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
    let retryCount = 0
    const MAX_RETRIES = 2

    const loadAndPlay = async (isRetry = false) => {
      try {
        if (!isRetry) clearPlaybackError()
        const br = isRetry ? 128000 : 320000

        const url = `/api/song/stream?id=${currentTrack.id}&br=${br}`

        if (!url) {
          if (!cancelled && retryCount < MAX_RETRIES) {
            retryCount++
            setTimeout(() => loadAndPlay(true), 500)
            return
          }
          if (!cancelled) {
            setPlaybackError('无法获取播放链接')
            setIsPlaying(false)
          }
          return
        }

        if (cancelled) return

        audioEngine.load(url)

        if (hasUserInteracted) {
          audioEngine.play()
        }
      } catch (e) {
        if (!cancelled && retryCount < MAX_RETRIES) {
          retryCount++
          setTimeout(() => loadAndPlay(true), 500)
          return
        }
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
  }, [currentTrack?.id, hasUserInteracted, setIsPlaying, setPlaybackError, clearPlaybackError])

  // Load lyrics
  useEffect(() => {
    if (!currentTrack) return
    let cancelled = false

    const loadLyrics = async () => {
      try {
        const data = await ncmApi.songLyric(currentTrack.id)
        const wrapped = (data as { data?: { lrc?: { lyric?: string }; tlyric?: { lyric?: string } } } | undefined)?.data
        if (!cancelled && wrapped) {
          setLyrics(parseLyricResponse(wrapped.lrc?.lyric || '', wrapped.tlyric?.lyric))
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
    const onError = (err: unknown) => {
      setPlaybackError(err instanceof Error ? err.message : '播放出错')
      setIsPlaying(false)
    }
    const onLoad = () => {
      const dur = audioEngine.getDuration()
      if (dur > 0) usePlayerStore.getState().setDuration(dur)
    }

    audioEngine.onPlay(onPlay)
    audioEngine.onPause(onPause)
    audioEngine.onEnd(onEnd)
    audioEngine.onError(onError)
    audioEngine.onLoad(onLoad)

    return () => {
      audioEngine.onPlay(() => {})
      audioEngine.onPause(() => {})
      audioEngine.onEnd(() => {})
      audioEngine.onError(() => {})
      audioEngine.onLoad(() => {})
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
  const isPlaying = usePlayerStore((s) => s.isPlaying)
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
    return () => { delete (window as unknown as Window).__playbackCtrl }
  }, [setHasUserInteracted])

  return null
}
