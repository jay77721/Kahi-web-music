'use client'

import { useCallback, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, AlertCircle, Loader2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format'

export type MVPlayerStatus = 'loading' | 'ready' | 'error'

interface MVPlayerProps {
  src: string | null | undefined
  poster?: string | null
  className?: string
  autoPlay?: boolean
  onError?: (message: string) => void
}

export function MVPlayer({
  src,
  poster,
  className,
  autoPlay = false,
  onError,
}: MVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [trackedSrc, setTrackedSrc] = useState(src ?? null)
  const [hasErrored, setHasErrored] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>(src ? '' : '无法获取播放地址')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Derive status from props/state during render — no setState-in-effect needed.
  if (src !== trackedSrc) {
    setTrackedSrc(src ?? null)
    setHasErrored(false)
    setIsReady(false)
    setErrorMessage(src ? '' : '无法获取播放地址')
  }

  const status: MVPlayerStatus = !src
    ? 'error'
    : hasErrored
      ? 'error'
      : isReady
        ? 'ready'
        : 'loading'

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setDuration(Number.isFinite(video.duration) ? video.duration : 0)
    setIsReady(true)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
  }, [])

  const handlePlay = useCallback(() => setIsPlaying(true), [])
  const handlePause = useCallback(() => setIsPlaying(false), [])

  const handleError = useCallback(() => {
    setHasErrored(true)
    setErrorMessage('视频加载失败')
    onError?.('视频加载失败')
  }, [onError])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().catch(() => {
        setHasErrored(true)
        setErrorMessage('播放失败')
      })
    } else {
      video.pause()
    }
  }, [])

  const handleSeek = useCallback((value: number | readonly number[]) => {
    const video = videoRef.current
    if (!video) return
    const next = Array.isArray(value) ? (value[0] ?? 0) : value
    video.currentTime = next
    setCurrentTime(next)
  }, [])

  const handleVolumeChange = useCallback(
    (value: number | readonly number[]) => {
      const video = videoRef.current
      if (!video) return
      const next = Array.isArray(value) ? (value[0] ?? 0) : value
      setVolume(next)
      video.volume = next
      if (next > 0 && isMuted) {
        video.muted = false
        setIsMuted(false)
      }
    },
    [isMuted]
  )

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const next = !isMuted
    video.muted = next
    setIsMuted(next)
  }, [isMuted])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === ' ' || event.key === 'k') {
        event.preventDefault()
        togglePlay()
      } else if (event.key === 'ArrowRight') {
        handleSeek(Math.min(currentTime + 5, duration))
      } else if (event.key === 'ArrowLeft') {
        handleSeek(Math.max(currentTime - 5, 0))
      } else if (event.key === 'm') {
        toggleMute()
      }
    },
    [currentTime, duration, handleSeek, toggleMute, togglePlay]
  )

  return (
    <div
      className={cn(
        'relative w-full aspect-video rounded-xl overflow-hidden bg-black group',
        'ring-1 ring-[var(--border)] shadow-[var(--shadow-lg)]',
        className
      )}
      data-testid="mv-player"
      role="region"
      aria-label="MV 视频播放器"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {src ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster ?? undefined}
          className="absolute inset-0 w-full h-full object-contain"
          autoPlay={autoPlay}
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onError={handleError}
        />
      ) : null}

      {status === 'loading' && src ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none"
          data-testid="mv-player-loading"
        >
          <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" aria-hidden="true" />
        </div>
      ) : null}

      {status === 'error' || !src ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center px-6"
          data-testid="mv-player-error"
        >
          <AlertCircle className="w-10 h-10 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="text-sm text-[var(--text-tertiary)]">{errorMessage}</p>
        </div>
      ) : null}

      {status === 'ready' && src ? (
        <div
          className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-10
                     bg-gradient-to-t from-black/80 via-black/40 to-transparent
                     opacity-0 group-hover:opacity-100 focus-within:opacity-100
                     transition-opacity duration-200"
          data-testid="mv-player-controls"
        >
          <Slider
            value={[currentTime]}
            min={0}
            max={Math.max(duration, 0.001)}
            step={0.1}
            onValueChange={handleSeek}
            aria-label="播放进度"
            className="mb-2"
          />
          <div className="flex items-center gap-3 text-white">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? '暂停' : '播放'}
              className="flex items-center justify-center w-9 h-9 rounded-full
                         bg-[var(--accent)] text-black
                         hover:scale-105 active:scale-95 transition-transform
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-[1px]" />}
            </button>
            <span className="text-xs tabular-nums text-[var(--text-secondary)] font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex items-center gap-2 ml-auto w-32">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? '取消静音' : '静音'}
                className="text-white/80 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                aria-label="音量"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
