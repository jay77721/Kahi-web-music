'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { audioEngine } from '@/lib/audio'
import { formatTime, formatArtists, imageUrl } from '@/lib/format'
import { cn } from '@/lib/utils'

export function PlayerBar() {
  const isMobile = useIsMobile()
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null)

  if (isMobile || currentTrackId === null) return null

  return <PlayerBarContent />
}

function PlayerBarContent() {
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const duration = usePlayerStore((state) => state.duration)
  const volume = usePlayerStore((state) => state.volume)
  const isMuted = usePlayerStore((state) => state.isMuted)
  const playMode = usePlayerStore((state) => state.playMode)
  const playbackError = usePlayerStore((state) => state.playbackError)
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const toggleMute = usePlayerStore((state) => state.toggleMute)
  const next = usePlayerStore((state) => state.next)
  const prev = usePlayerStore((state) => state.prev)
  const cyclePlayMode = usePlayerStore((state) => state.cyclePlayMode)
  const togglePlayQueue = useUIStore((state) => state.togglePlayQueue)
  const playQueueOpen = useUIStore((state) => state.playQueueOpen)

  const handleTogglePlay = useCallback(() => {
    const ctrl = (window as unknown as Window).__playbackCtrl
    if (ctrl) {
      ctrl.togglePlay()
    } else {
      if (isPlaying) {
        audioEngine.pause()
      } else {
        audioEngine.play()
      }
    }
  }, [isPlaying])

  const handleSeek = useCallback((value: number | readonly number[]) => {
    const time = Array.isArray(value) ? value[0] : value
    setCurrentTime(time)
    audioEngine.seek(time)
  }, [setCurrentTime])

  const handleVolumeChange = useCallback((value: number | readonly number[]) => {
    setVolume(Array.isArray(value) ? value[0] : value)
  }, [setVolume])

  const playModeIcon = playMode === 'repeat-one' ? Repeat1 : playMode === 'shuffle' ? Shuffle : Repeat
  const PlayModeIcon = playModeIcon
  const playModeLabel = playMode === 'repeat-one' ? '单曲循环' : playMode === 'shuffle' ? '随机播放' : '列表循环'
  const currentTimeLabel = formatTime(currentTime)
  const durationLabel = formatTime(duration || 0)

  if (!currentTrack) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 h-[72px] glass flex items-center px-4 gap-4"
      role="region"
      aria-label="播放器"
      style={{ borderTop: '1px solid transparent', borderImage: 'linear-gradient(to right, var(--accent), transparent) 1' }}>
      {/* Track info */}
      <div className="flex items-center gap-3 w-[240px] min-w-[180px]">
        {currentTrack.al?.picUrl && (
          <Image
            src={imageUrl(currentTrack.al.picUrl, 56)}
            alt={currentTrack.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-lg object-cover"
            style={{ boxShadow: 'var(--shadow-md)' }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium truncate', isPlaying && 'text-glow')}>
            {currentTrack.name}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] truncate">
            {formatArtists(currentTrack.ar || [])}
          </p>
          {playbackError && (
            <p className="text-[11px] text-red-400/80 truncate mt-0.5">{playbackError}</p>
          )}
        </div>
      </div>

      {/* Center: controls + progress */}
      <div className="flex-1 flex flex-col items-center gap-1 max-w-[600px] mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={cyclePlayMode} aria-label={`切换播放模式，当前${playModeLabel}`}>
            <PlayModeIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-[var(--text-primary)] hover:text-[var(--accent)]" onClick={prev} aria-label="上一首">
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] hover:shadow-[var(--shadow-glow)] hover:scale-105 transition-all duration-200"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-[var(--text-primary)] hover:text-[var(--accent)]" onClick={next} aria-label="下一首">
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full">
          <span className="text-[10px] text-[var(--text-tertiary)] w-10 text-right tabular-nums">
            {currentTimeLabel}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className={cn('flex-1 player-slider', isPlaying && 'progress-glow')}
            aria-label="播放进度"
            aria-valuetext={`${currentTimeLabel} / ${durationLabel}`}
          />
          <span className="text-[10px] text-[var(--text-tertiary)] w-10 tabular-nums">
            {durationLabel}
          </span>
        </div>
      </div>

      {/* Right: volume + queue */}
      <div className="flex items-center gap-2 w-[200px] justify-end">
        <Button variant="ghost" size="icon" className="w-8 h-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={toggleMute} aria-label={isMuted || volume === 0 ? '取消静音' : '静音'}>
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-24 player-slider"
          aria-label="音量"
          aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)}%`}
        />
        <Button
          variant="ghost"
          size="icon"
          className={cn('w-8 h-8', playQueueOpen ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]')}
          onClick={togglePlayQueue}
          aria-label="播放列表"
          aria-expanded={playQueueOpen}
          aria-pressed={playQueueOpen}
        >
          <List className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
