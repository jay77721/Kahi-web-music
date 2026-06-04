import { memo } from 'react'
import Image from 'next/image'
import { motion, type Variants } from 'framer-motion'
import { MoreHorizontal, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlayingIndicator } from '@/components/common/PlayingIndicator'
import { SelectionCheckbox } from '@/components/common/SelectionCheckbox'
import { useSongContextMenu } from '@/components/common/SongContextMenu'
import { formatArtists, formatDuration, imageUrl } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/song'

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

interface SongTableRowProps {
  song: Song
  index: number
  isCurrent: boolean
  isPlaying: boolean
  selectable: boolean
  rowSelected: boolean
  showIndex: boolean
  showActions: boolean
  showAlbum: boolean
  gridClass: string
  animated: boolean
  onPlaySong: (song: Song) => void
  onAddToQueue: (song: Song) => void
  onToggleSelect?: (id: string) => void
}

export const SongTableRow = memo(function SongTableRow({
  song,
  index,
  isCurrent,
  isPlaying,
  selectable,
  rowSelected,
  showIndex,
  showActions,
  showAlbum,
  gridClass,
  animated,
  onPlaySong,
  onAddToQueue,
  onToggleSelect,
}: SongTableRowProps) {
  const songId = String(song.id)
  const artists = formatArtists(song.ar || [])
  const RowItem = animated ? motion.div : 'div'

  return (
    <SongContextMenu>
      <RowItem
        data-song-id={song.id}
        data-song-name={song.name}
        data-song-artist={artists}
        data-song-album={song.al?.name || ''}
        data-song-pic={song.al?.picUrl || ''}
        data-song-duration={song.dt || 0}
        data-selected={rowSelected ? 'true' : undefined}
        {...(animated ? { variants: rowVariants } : {})}
        className={cn(
          gridClass,
          'group items-center px-2 py-2 rounded-lg cursor-pointer transition-all duration-200 relative',
          rowSelected
            ? 'bg-[var(--bg-accent-subtle)] border-l-[3px] border-[var(--accent)]'
            : isCurrent
              ? 'bg-[var(--bg-accent-subtle)] border-l-2 border-[var(--accent)]'
              : 'hover:bg-[var(--bg-hover)] border-l-2 border-transparent'
        )}
        onDoubleClick={() => onPlaySong(song)}
      >
        {selectable && (
          <SelectionCheckbox
            data-testid={`song-row-checkbox-${song.id}`}
            aria-label={`选择歌曲 ${song.name}`}
            state={rowSelected ? 'all' : 'none'}
            onChange={() => onToggleSelect?.(songId)}
          />
        )}
        {showIndex && (
          <span className="w-8 text-center text-sm relative flex items-center justify-center">
            {isCurrent ? (
              <PlayingIndicator isPlaying={isPlaying} size="sm" />
            ) : (
              <>
                <span className="group-hover:hidden text-[var(--text-tertiary)] group-hover:text-[var(--accent)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute inset-0 w-auto h-auto hidden group-hover:flex items-center justify-center"
                  onClick={(event) => {
                    event.stopPropagation()
                    onPlaySong(song)
                  }}
                >
                  <Play className="w-3.5 h-3.5 text-[var(--text-primary)] fill-current" />
                </Button>
              </>
            )}
          </span>
        )}

        <div className="flex items-center gap-3 min-w-0">
          {song.al?.picUrl && (
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 shadow-md">
              <Image
                src={imageUrl(song.al.picUrl, 80)}
                alt="Album cover"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className={cn('text-sm truncate font-medium', isCurrent && 'text-[var(--accent)]')}>
              {song.name}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] truncate md:hidden">
              {artists}
            </p>
          </div>
        </div>

        <span className="hidden md:block text-sm text-[var(--text-secondary)] truncate">
          {artists}
        </span>

        {showAlbum && (
          <span className="hidden md:block text-sm text-[var(--text-secondary)] truncate">
            {song.al?.name}
          </span>
        )}

        <div className="flex items-center gap-1 w-12 justify-end">
          <span
            className={cn(
              'text-xs transition-opacity duration-200',
              isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]',
              showActions && 'group-hover:opacity-0'
            )}
          >
            {formatDuration(song.dt || 0)}
          </span>
          {showActions && (
            <div className="hidden group-hover:flex items-center gap-0.5 absolute right-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={(event) => {
                  event.stopPropagation()
                  onAddToQueue(song)
                }}
              >
                <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </Button>
            </div>
          )}
        </div>
      </RowItem>
    </SongContextMenu>
  )
})
