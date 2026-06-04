'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Heart, Pause, Play, SkipForward, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlayerStore } from '@/stores/playerStore'
import { useDominantColor } from '@/hooks/useDominantColor'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { imageUrl, formatArtists, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/song'

interface FMMainPlayerProps {
  song: Song | null | undefined
  isLoading?: boolean
  hasError?: boolean
  onDislike: (id: number) => void
  onRetry?: () => void
  className?: string
}

const FALLBACK_BG = `
  radial-gradient(ellipse at 20% 50%, rgba(30, 215, 96, 0.10) 0%, transparent 55%),
  radial-gradient(ellipse at 80% 20%, rgba(120, 80, 220, 0.08) 0%, transparent 55%),
  radial-gradient(ellipse at 50% 80%, rgba(30, 150, 215, 0.05) 0%, transparent 55%),
  linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-secondary) 50%, var(--bg-secondary) 100%)
`

/**
 * Immersive FM main player.
 *
 * Layout (top → bottom):
 *   1. Dominant-color gradient background, tinted by the active cover.
 *   2. Spinning cover (300-400px) with a thin pulse-glow while playing.
 *   3. Title + artist block under the cover.
 *   4. Sticky-style progress slider + timestamps.
 *   5. Action row: dislike / prev (no-op) / play-pause / next / like.
 *
 * Everything below the cover stays inside a max-width column so the layout
 * remains stable across viewports. The component is purely presentational:
 * data fetching, queueing, and FM-specific API calls are the parent's
 * responsibility.
 */
export const FMMainPlayer = memo(function FMMainPlayer({
  song,
  isLoading = false,
  hasError = false,
  onDislike,
  onRetry,
  className,
}: FMMainPlayerProps) {
  const prefersReducedMotion = useReducedMotion()
  const { currentTrack, isPlaying, currentTime, duration, playSong, seek } =
    usePlayerStore()

  // Responsive cover size — smaller on phones, larger on desktop. The disc
  // is the visual anchor of the page so we keep it generous.
  const COVER_SIZE_MOBILE = 280
  const COVER_SIZE_DESKTOP = 360
  const [coverSize, setCoverSize] = useState(COVER_SIZE_MOBILE)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const apply = () => setCoverSize(mq.matches ? COVER_SIZE_DESKTOP : COVER_SIZE_MOBILE)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const coverUrl = song?.al?.picUrl ? imageUrl(song.al.picUrl, coverSize) : null
  const { color } = useDominantColor(coverUrl, { timeoutMs: 4000 })

  const backgroundStyle = useMemo<React.CSSProperties>(() => {
    if (!color) {
      return { background: FALLBACK_BG, transition: 'background 800ms ease-out' }
    }
    return {
      background: `
        radial-gradient(ellipse at 20% 50%, ${color.oklch.replace(')', ' / 0.32)')} 0%, transparent 55%),
        radial-gradient(ellipse at 80% 20%, ${color.oklch.replace(')', ' / 0.20)')} 0%, transparent 55%),
        radial-gradient(ellipse at 50% 80%, ${color.oklch.replace(')', ' / 0.14)')} 0%, transparent 55%),
        linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-secondary) 50%, var(--bg-secondary) 100%)
      `,
      transition: 'background 800ms ease-out',
      ['--color-dynamic-bg' as string]: color.oklch,
    }
  }, [color])

  const isActive = song ? currentTrack?.id === song.id : false
  const showPlaying = isActive && isPlaying
  const spinClass = prefersReducedMotion
    ? ''
    : showPlaying
      ? 'vinyl-disc--playing'
      : 'vinyl-disc--paused'

  const handlePlayPause = useCallback(() => {
    if (!song) return
    if (isActive) {
      const ctrl = (window as unknown as Window).__playbackCtrl
      if (ctrl) {
        ctrl.togglePlay()
      } else {
        usePlayerStore.getState().setIsPlaying(!isPlaying)
      }
    } else {
      playSong(song)
    }
  }, [isActive, isPlaying, playSong, song])

  const handleDislike = useCallback(() => {
    if (!song) return
    onDislike(song.id)
  }, [onDislike, song])

  const handleSeek = useCallback(
    (value: number | readonly number[]) => {
      const next = Array.isArray(value) ? (value[0] ?? 0) : value
      seek(next)
    },
    [seek]
  )

  if (hasError) {
    return (
      <div
        className={cn('flex flex-col items-center justify-center min-h-[60vh] p-6 text-center', className)}
        data-testid="fm-error"
      >
        <p className="text-base text-[var(--text-tertiary)] mb-4">FM 加载失败，请稍后重试</p>
        {onRetry ? (
          <Button
            variant="outline"
            onClick={onRetry}
            className="border-[var(--border-light)] text-[var(--text-primary)]"
            data-testid="fm-retry"
          >
            重试
          </Button>
        ) : null}
      </div>
    )
  }

  if (isLoading || !song) {
    return <FMMainPlayerSkeleton coverSize={coverSize} className={className} />
  }

  return (
    <section
      data-testid="fm-main-player"
      data-cover-size={coverSize}
      data-active={isActive ? 'true' : 'false'}
      data-playing={showPlaying ? 'true' : 'false'}
      className={cn('relative flex flex-col items-center w-full dynamic-bg', className)}
      style={backgroundStyle}
      aria-label="私人电台播放器"
    >
      <FMCover song={song} size={coverSize} spinClass={spinClass} showPlaying={showPlaying} />

      <div className="w-full max-w-md px-6 mt-8 text-center">
        <h2
          className="text-2xl md:text-3xl font-bold truncate text-[var(--text-primary)]"
          data-testid="fm-track-title"
        >
          {song.name}
        </h2>
        <p
          className="text-sm md:text-base text-[var(--text-tertiary)] truncate mt-1"
          data-testid="fm-track-artist"
        >
          {formatArtists(song.ar || [])}
        </p>
      </div>

      <FMProgress
        currentTime={currentTime}
        duration={duration}
        isActive={isActive}
        onSeek={handleSeek}
      />

      <FMActions
        isActive={isActive}
        isPlaying={showPlaying}
        onDislike={handleDislike}
        onPlayPause={handlePlayPause}
        onNext={() => onDislike(song.id)}
      />
    </section>
  )
})

// ---------------------------------------------------------------------------
// Sub-blocks
// ---------------------------------------------------------------------------

interface FMCoverProps {
  song: Song
  size: number
  spinClass: string
  showPlaying: boolean
}

function FMCover({ song, size, spinClass, showPlaying }: FMCoverProps) {
  const coverStyle = {
    width: `${size}px`,
    height: `${size}px`,
  } as const
  return (
    <div
      className="vinyl-stage relative mt-2"
      data-testid="fm-cover"
      data-playing={showPlaying ? 'true' : 'false'}
    >
      <div
        className={cn('vinyl-disc', spinClass)}
        style={coverStyle}
        data-testid="fm-vinyl"
        data-size={size}
        aria-hidden="true"
      >
        <div className="vinyl-disc__cover-wrap">
          {song.al?.picUrl ? (
            <Image
              src={imageUrl(song.al.picUrl, size)}
              alt={song.name}
              width={Math.round(size / 3)}
              height={Math.round(size / 3)}
              className="vinyl-disc__cover"
              style={{ width: `${Math.round(size / 3)}px`, height: `${Math.round(size / 3)}px` }}
              unoptimized
              priority
            />
          ) : null}
          <span
            className="vinyl-disc__hub"
            style={{ width: '8px', height: '8px' }}
          />
        </div>
      </div>
      {showPlaying ? (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full -z-10"
          style={{ boxShadow: '0 0 80px var(--accent-glow), 0 0 120px var(--accent-subtle)' }}
        />
      ) : null}
    </div>
  )
}

interface FMProgressProps {
  currentTime: number
  duration: number
  isActive: boolean
  onSeek: (value: number) => void
}

function FMProgress({ currentTime, duration, isActive, onSeek }: FMProgressProps) {
  const max = duration || (isActive ? 100 : 1)
  const percent = Math.min(100, (currentTime / max) * 100)
  return (
    <div
      className="w-full max-w-md px-6 mt-8"
      data-testid="fm-progress"
      style={{ ['--fm-progress-pct' as string]: `${percent}%` }}
    >
      <input
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={Math.min(currentTime, max)}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="播放进度"
        className="fm-progress__input w-full"
        data-testid="fm-progress-input"
      />
      <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] tabular-nums mt-2">
        <span data-testid="fm-current-time">{formatDuration(currentTime * 1000)}</span>
        <span data-testid="fm-duration">{formatDuration((duration || 0) * 1000)}</span>
      </div>
    </div>
  )
}

interface FMActionsProps {
  isActive: boolean
  isPlaying: boolean
  onDislike: () => void
  onPlayPause: () => void
  onNext: () => void
}

function FMActions({ isActive, isPlaying, onDislike, onPlayPause, onNext }: FMActionsProps) {
  return (
    <div
      className="w-full max-w-md px-6 mt-6 mb-10 flex items-center justify-between"
      data-testid="fm-actions"
      role="group"
      aria-label="FM 播放控件"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onDislike}
        className="w-12 h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        aria-label="不喜欢这首歌"
        data-testid="fm-dislike"
      >
        <ThumbsDown className="w-6 h-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDislike}
        className="w-12 h-12 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        aria-label="上一首 (FM 模式与下一首相同)"
        data-testid="fm-prev"
      >
        <ThumbsDown className="w-6 h-6 opacity-60 rotate-180" />
      </Button>
      <Button
        size="icon"
        onClick={onPlayPause}
        className="w-16 h-16 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] hover:scale-105 transition-all duration-200 shadow-[var(--shadow-glow)]"
        aria-label={isActive && isPlaying ? '暂停' : '播放'}
        data-testid="fm-play"
        data-state={isActive && isPlaying ? 'playing' : 'paused'}
      >
        {isActive && isPlaying ? (
          <Pause className="w-7 h-7" />
        ) : (
          <Play className="w-7 h-7 ml-0.5" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        className="w-12 h-12 text-[var(--text-primary)] hover:text-[var(--accent)]"
        aria-label="下一首"
        data-testid="fm-next"
      >
        <SkipForward className="w-6 h-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDislike}
        className="w-12 h-12 text-[var(--accent)] hover:text-[var(--accent-hover)] hover:bg-[var(--bg-accent-subtle)]"
        aria-label="收藏"
        data-testid="fm-like"
      >
        <Heart className="w-6 h-6" />
      </Button>
    </div>
  )
}

interface FMMainPlayerSkeletonProps {
  coverSize: number
  className?: string
}

function FMMainPlayerSkeleton({ coverSize, className }: FMMainPlayerSkeletonProps) {
  const coverStyle = { width: `${coverSize}px`, height: `${coverSize}px` } as const
  return (
    <div
      className={cn(
        'flex flex-col items-center w-full p-6 dynamic-bg',
        className
      )}
      data-testid="fm-skeleton"
      aria-busy="true"
    >
      <Skeleton className="rounded-full" style={coverStyle} data-testid="fm-skeleton-cover" />
      <Skeleton className="h-7 w-64 mt-8 rounded-md" data-testid="fm-skeleton-title" />
      <Skeleton className="h-4 w-40 mt-3 rounded-md" data-testid="fm-skeleton-artist" />
      <Skeleton className="h-2 w-full max-w-md mt-10 rounded-full" data-testid="fm-skeleton-progress" />
      <div className="w-full max-w-md mt-6 flex items-center justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-12 h-12 rounded-full" />
        ))}
      </div>
    </div>
  )
}
