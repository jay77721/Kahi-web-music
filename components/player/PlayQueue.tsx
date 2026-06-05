'use client'

import { useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlayingIndicator } from '@/components/common/PlayingIndicator'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { formatDuration, formatArtists } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/song'

const CLOSED_QUEUE: Song[] = []

export function PlayQueue() {
  const playQueueOpen = useUIStore((state) => state.playQueueOpen)
  const setPlayQueueOpen = useUIStore((state) => state.setPlayQueueOpen)
  const queue = usePlayerStore((state) => (playQueueOpen ? state.queue : CLOSED_QUEUE))
  const queueIndex = usePlayerStore((state) => (playQueueOpen ? state.queueIndex : -1))
  const isPlaying = usePlayerStore((state) => (playQueueOpen ? state.isPlaying : false))
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue)
  const clearQueue = usePlayerStore((state) => state.clearQueue)

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
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--text-tertiary)]"
              onClick={clearQueue}
              disabled={queue.length === 0}
              aria-label={queue.length > 0 ? `清空播放列表，共${queue.length}首` : '播放列表为空，无需清空'}
            >
              清空
            </Button>
          </div>
        </SheetHeader>

        {playQueueOpen && (
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="py-2" role="list" aria-label="播放队列歌曲">
              {queue.map((song, index) => {
                const isCurrent = index === queueIndex
                return (
                  <div
                    key={`${song.id}-${index}`}
                    role="listitem"
                    className={cn(
                      'group flex items-center gap-1 px-4 py-2.5 transition-colors duration-200 focus-within:bg-[var(--bg-hover)]',
                      isCurrent
                        ? 'bg-[var(--accent-subtle)] border-l-2 border-l-[var(--accent)]'
                        : 'border-l-2 border-l-transparent hover:bg-[var(--bg-hover)]'
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
                      onClick={() => handlePlaySong(song)}
                      aria-label={`播放 ${song.name}`}
                      aria-current={isCurrent ? 'true' : undefined}
                    >
                      <span className="w-6 text-center" aria-hidden="true">
                        {isCurrent ? (
                          <PlayingIndicator isPlaying={isPlaying} size="sm" />
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">{index + 1}</span>
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={cn(
                          'block text-sm truncate transition-colors duration-200',
                          isCurrent ? 'text-[var(--accent-text)] font-medium' : 'group-hover:text-[var(--text-primary)]'
                        )}>
                          {song.name}
                        </span>
                        <span className="block text-xs text-[var(--text-tertiary)] truncate">
                          {formatArtists(song.ar || [])}
                        </span>
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
                        {formatDuration(song.dt || 0)}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 text-[var(--text-tertiary)]"
                      onClick={() => removeFromQueue(index)}
                      aria-label={`从播放列表移除 ${song.name}`}
                    >
                      <span className="text-xs" aria-hidden="true">×</span>
                    </Button>
                  </div>
                )
              })}
              {queue.length === 0 && (
                <p className="text-center text-[var(--text-tertiary)] text-sm py-12" role="status">
                  播放列表为空
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
