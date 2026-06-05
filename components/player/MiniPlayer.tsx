'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { formatArtists, imageUrl } from '@/lib/format'

export function MiniPlayer() {
  const isMobile = useUIStore((state) => state.isMobile)
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null)

  if (!isMobile || currentTrackId === null) return null

  return <MiniPlayerContent />
}

function MiniPlayerContent() {
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const setHasUserInteracted = usePlayerStore((state) => state.setHasUserInteracted)
  const setFullScreenPlayerOpen = useUIStore((state) => state.setFullScreenPlayerOpen)

  const handleTogglePlay = useCallback(() => {
    setHasUserInteracted()
    const ctrl = (window as unknown as Window).__playbackCtrl
    ctrl?.togglePlay()
  }, [setHasUserInteracted])

  if (!currentTrack) return null

  return (
    <div
      role="region"
      aria-label="迷你播放器"
      className="md:hidden fixed bottom-14 left-0 right-0 z-40 glass flex items-center px-3 gap-1"
      style={{ borderLeft: '3px solid var(--accent)' }}
    >
      <button
        type="button"
        className="h-16 flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
        onClick={() => setFullScreenPlayerOpen(true)}
        aria-label={`打开全屏播放器：${currentTrack.name}`}
      >
        {currentTrack.al?.picUrl && (
          <Image
            src={imageUrl(currentTrack.al.picUrl, 48)}
            alt=""
            width={40}
            height={40}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            style={{ boxShadow: 'var(--shadow-md)' }}
          />
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium truncate">{currentTrack.name}</span>
          <span className="block text-xs text-[var(--text-tertiary)] truncate">
            {formatArtists(currentTrack.ar || [])}
          </span>
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10"
        onClick={handleTogglePlay}
        aria-label={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </Button>
    </div>
  )
}
