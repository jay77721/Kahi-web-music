'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { formatArtists, imageUrl } from '@/lib/format'

export function MiniPlayer() {
  const { currentTrack, isPlaying, setHasUserInteracted } = usePlayerStore()
  const { setFullScreenPlayerOpen } = useUIStore()

  const handleTogglePlay = useCallback(() => {
    setHasUserInteracted()
    const ctrl = (window as unknown as Window).__playbackCtrl
    ctrl?.togglePlay()
  }, [setHasUserInteracted])

  if (!currentTrack) return null

  return (
    <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 glass flex flex-col"
      style={{ borderLeft: '3px solid var(--accent)' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFullScreenPlayerOpen(true) } }}
      onClick={() => setFullScreenPlayerOpen(true)}
    >
      <div className="h-16 flex items-center px-3 gap-3">
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentTrack.name}</p>
          <p className="text-xs text-[var(--text-tertiary)] truncate">
            {formatArtists(currentTrack.ar || [])}
          </p>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handleTogglePlay}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
