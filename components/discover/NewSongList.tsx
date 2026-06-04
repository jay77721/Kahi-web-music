'use client'

import Image from 'next/image'
import { Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useSWR from 'swr'
import { ncmApi } from '@/lib/api'
import { imageUrl, formatArtists } from '@/lib/format'
import { usePlayerStore } from '@/stores/playerStore'
import type { Song } from '@/types/song'

interface NewSongItem {
  id: number
  name: string
  song: Song
  picUrl: string
}

export function NewSongList() {
  const { data, isLoading } = useSWR('personalized-newsong', async () => {
    const result = await ncmApi.personalizedNewSong(12)
    return (result as { result?: NewSongItem[] } | undefined)?.result || []
  })
  const { playSong, addToQueue } = usePlayerStore()

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-6 w-32 mb-4 bg-[var(--bg-elevated)]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="w-12 h-12 rounded-lg bg-[var(--bg-elevated)]" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4 rounded bg-[var(--bg-elevated)]" />
                <Skeleton className="h-3 w-1/2 rounded bg-[var(--bg-elevated)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const songs = data || []

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
        {songs.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all duration-200"
            onClick={() => playSong(item.song)}
          >
            <span className="w-6 text-center text-sm font-medium text-[var(--text-tertiary)] group-hover:hidden">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="w-6 hidden group-hover:flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-[var(--text-primary)] fill-current" />
            </div>
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
              <Image
                src={imageUrl(item.picUrl || item.song?.al?.picUrl, 48)}
                alt="Album cover"
                width={48}
                height={48}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate font-medium text-[var(--text-primary)]">{item.name}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {item.song?.ar ? formatArtists(item.song.ar) : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation()
                addToQueue(item.song)
              }}
            >
              <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
