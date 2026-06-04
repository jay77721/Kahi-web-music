'use client'

import { useCallback, useRef } from 'react'
import Image from 'next/image'
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { audioEngine } from '@/lib/audio'
import { formatDuration, formatArtists, imageUrl } from '@/lib/format'
import { cn } from '@/lib/utils'

export function PlayerBar() {
  const isMobile = useIsMobile()
  const {
    currentTrack, isPlaying, currentTime, duration, volume, isMuted, playMode,
    playbackError,
    setCurrentTime, setVolume, toggleMute,
    next, prev, cyclePlayMode,
  } = usePlayerStore()
  const { togglePlayQueue, playQueueOpen } = useUIStore()
  const isSeeking = useRef(false)

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
    isSeeking.current = true
    setCurrentTime(time)
    audioEngine.seek(time)
    setTimeout(() => { isSeeking.current = false }, 100)
  }, [setCurrentTime])

  const handleVolumeChange = useCallback((value: number | readonly number[]) => {
    setVolume(Array.isArray(value) ? value[0] : value)
  }, [setVolume])

  const playModeIcon = playMode === 'repeat-one' ? Repeat1 : playMode === 'shuffle' ? Shuffle : Repeat
  const PlayModeIcon = playModeIcon

  if (isMobile || !currentTrack) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-[72px] glass flex items-center px-4 gap-4"
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
          <Button variant="ghost" size="icon" className="w-8 h-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={cyclePlayMode} aria-label={playMode === 'repeat-one' ? '单曲循环' : playMode === 'shuffle' ? '随机播放' : '列表循环'}>
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
            {formatDuration(currentTime * 1000)}
          </span>
          <Slider value={[currentTime]} max={duration || 100} step={0.1} onValueChange={handleSeek} className={cn('flex-1 player-slider', isPlaying && 'progress-glow')} />
          <span className="text-[10px] text-[var(--text-tertiary)] w-10 tabular-nums">
            {formatDuration((duration || 0) * 1000)}
          </span>
        </div>
      </div>

      {/* Right: volume + queue */}
      <div className="flex items-center gap-2 w-[200px] justify-end">
        <Button variant="ghost" size="icon" className="w-8 h-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={toggleMute} aria-label="音量">
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-24 player-slider" />
        <Button variant="ghost" size="icon" className={cn('w-8 h-8', playQueueOpen ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]')} onClick={togglePlayQueue} aria-label="播放列表">
          <List className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
