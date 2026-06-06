'use client'

import { memo } from 'react'
import { PlaylistCard } from '@/components/common/PlaylistCard'
import type { Playlist } from '@/types/playlist'

export interface PlaylistGridProps {
  playlists: Playlist[]
  className?: string
  ariaLabel?: string
}

function PlaylistGridImpl({
  playlists,
  className,
  ariaLabel = '歌单列表',
}: PlaylistGridProps) {
  if (playlists.length === 0) return null

  return (
    <ul
      role="list"
      aria-label={ariaLabel}
      className={
        'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 stagger-children ' +
        (className ?? '')
      }
    >
      {playlists.map((pl) => {
        const name = pl.name?.trim() || '未命名歌单'
        return (
          <li
            key={pl.id}
            className="list-none"
            data-playlist-id={pl.id}
          >
            <PlaylistCard
              id={pl.id}
              name={name}
              coverUrl={pl.coverImgUrl ?? ''}
              playCount={pl.playCount ?? 0}
            />
          </li>
        )
      })}
    </ul>
  )
}

export const PlaylistGrid = memo(PlaylistGridImpl)
export default PlaylistGrid
