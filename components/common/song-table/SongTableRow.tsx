import { memo, type MouseEvent } from 'react'
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
  const contextMenu = useSongContextMenu()

  const handlePlayClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onPlaySong(song)
  }

  const handleAddToQueueClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onAddToQueue(song)
  }

  const openContextMenuAt = (x: number, y: number, triggerElement?: HTMLElement | null) => {
    contextMenu?.openMenu(song, x, y, triggerElement)
  }

  const handleOpenContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    openContextMenuAt(event.clientX, event.clientY)
  }

  const handleOpenContextMenuButton = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    openContextMenuAt(rect.left, rect.bottom, event.currentTarget)
  }

  return (
    <RowItem
      data-song-id={song.id}
      data-song-name={song.name}
      data-song-artist={artists}
      data-song-album={song.al?.name || ''}
      data-song-pic={song.al?.picUrl || ''}
      data-song-duration={song.dt || 0}
      data-selected={rowSelected ? 'true' : undefined}
      {...(animated ? { variants: rowVariants } : {})}
      role="listitem"
      className={cn(
        gridClass,
        'group items-center px-2 py-2 rounded-lg cursor-pointer transition-all duration-200 relative focus-within:bg-[var(--bg-hover)]',
        rowSelected
          ? 'bg-[var(--bg-accent-subtle)] border-l-[3px] border-[var(--accent)]'
          : isCurrent
            ? 'bg-[var(--bg-accent-subtle)] border-l-2 border-[var(--accent)]'
            : 'hover:bg-[var(--bg-hover)] border-l-2 border-transparent'
      )}
      onDoubleClick={() => onPlaySong(song)}
      onContextMenu={handleOpenContextMenu}
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
              <span className="group-hover:opacity-0 group-focus-within:opacity-0 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-opacity duration-200">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`播放歌曲 ${song.name}`}
                className="absolute inset-0 w-auto h-auto flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
                onClick={handlePlayClick}
              >
                <Play className="w-3.5 h-3.5 text-[var(--text-primary)] fill-current" aria-hidden="true" />
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
              alt={song.al?.name ? `${song.al.name} 封面` : `${song.name} 专辑封面`}
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
            showActions && 'group-hover:opacity-0 group-focus-within:opacity-0'
          )}
        >
          {formatDuration(song.dt || 0)}
        </span>
        {showActions && (
          <div className="flex items-center gap-0.5 absolute right-2 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`添加歌曲 ${song.name} 到播放队列`}
              className="w-7 h-7"
              onClick={handleAddToQueueClick}
            >
              <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`打开歌曲 ${song.name} 的更多操作菜单`}
              aria-haspopup="menu"
              className="w-7 h-7"
              onClick={handleOpenContextMenuButton}
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </RowItem>
  )
})
