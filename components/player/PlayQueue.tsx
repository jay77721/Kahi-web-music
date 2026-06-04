'use client'

import { useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { formatDuration, formatArtists } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/song'

export function PlayQueue() {
  const { queue, queueIndex, removeFromQueue, clearQueue } = usePlayerStore()
  const { playQueueOpen, setPlayQueueOpen } = useUIStore()

  const handlePlaySong = useCallback((song: Song | null) => {
    if (!song) return
    // Use the global controller to ensure playback starts
    const ctrl = (window as unknown as Window).__playbackCtrl
    if (ctrl?.playTrack) {
      ctrl.playTrack(song)
    }
  }, [])

  return (
    <Sheet open={playQueueOpen} onOpenChange={setPlayQueueOpen}>
      <SheetContent className="w-[360px] sm:w-[400px] glass p-0">
        <SheetHeader className="px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">
              播放列表
              <span className="text-sm text-[var(--text-tertiary)] ml-2">({queue.length}首)</span>
            </SheetTitle>
            <Button variant="ghost" size="sm" className="text-[var(--text-tertiary)]" onClick={clearQueue}>
              清空
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="py-2">
            {queue.map((song, index) => {
              const isCurrent = index === queueIndex
              return (
                <div
                  key={`${song.id}-${index}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-200',
                    isCurrent
                      ? 'bg-[var(--accent-subtle)] border-l-2 border-l-[var(--accent)]'
                      : 'border-l-2 border-l-transparent hover:bg-[var(--bg-hover)]'
                  )}
                  onClick={() => handlePlaySong(song)}
                >
                  <div className="w-6 text-center">
                    {isCurrent ? (
                      <div className="flex items-end justify-center gap-[2px] h-3.5">
                        <span className="w-[3px] bg-[var(--accent)] rounded-sm animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
                        <span className="w-[3px] bg-[var(--accent)] rounded-sm animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
                        <span className="w-[3px] bg-[var(--accent)] rounded-sm animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm truncate transition-colors duration-200',
                      isCurrent ? 'text-[var(--accent)] font-medium' : 'group-hover:text-[var(--text-primary)]'
                    )}>
                      {song.name}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {formatArtists(song.ar || [])}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
                    {formatDuration(song.dt || 0)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 opacity-0 hover:opacity-100 text-[var(--text-tertiary)]"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromQueue(index)
                    }}
                  >
                    <span className="text-xs">×</span>
                  </Button>
                </div>
              )
            })}
            {queue.length === 0 && (
              <p className="text-center text-[var(--text-tertiary)] text-sm py-12">
                播放列表为空
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
