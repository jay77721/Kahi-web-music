'use client'

import { memo, useCallback, useMemo } from 'react'
import { Play, Plus, MoreHorizontal } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlayerStore } from '@/stores/playerStore'
import { formatDuration, formatArtists, imageUrl } from '@/lib/format'
import type { Song } from '@/types/song'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { SongContextMenu } from './SongContextMenu'
import { PlayingIndicator } from './PlayingIndicator'
import { SelectionCheckbox } from './SelectionCheckbox'

interface SongTableProps {
  songs: Song[]
  showIndex?: boolean
  showAlbum?: boolean
  showActions?: boolean
  isLoading?: boolean
  /**
   * Whether to play a staggered entrance animation on the rows.
   * Defaults to `true` for a polished first-paint feel.
   * Set to `false` for tests or reduced-motion environments.
   */
  animated?: boolean
  /**
   * Enable batch-selection mode. Adds a checkbox column on the left and a
   * tri-state header checkbox.
   */
  selectable?: boolean
  /** Set of currently-selected song ids (as strings). */
  selectedIds?: ReadonlySet<string>
  /** Called when a row checkbox is toggled. */
  onToggleSelect?: (id: string) => void
  /** Called when the header checkbox is toggled. Receives the full id list. */
  onToggleSelectAll?: (ids: ReadonlyArray<string>) => void
  /** Called to clear the selection (used when header checkbox is clicked in "all" state). */
  onClearSelection?: () => void
  onPlayAll?: () => void
  className?: string
}

// ── framer-motion variants ───────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
    },
  },
}

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

type HeaderCheckboxState = 'none' | 'partial' | 'all'

function deriveHeaderState(
  total: number,
  selectedCount: number
): HeaderCheckboxState {
  if (selectedCount === 0) return 'none'
  if (selectedCount >= total) return 'all'
  return 'partial'
}

// ── Row sub-component ────────────────────────────────────────────────────────

interface SongRowProps {
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

/**
 * Single song row. Wrapped in `React.memo` so a state change that only
 * affects one row (e.g. the playing indicator on row N) does not cascade
 * and re-render the other 29 rows in the table.
 */
const SongRow = memo(function SongRow({
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
}: SongRowProps) {
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
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlaySong(song)
                  }}
                >
                  <Play className="w-3.5 h-3.5 text-[var(--text-primary)] fill-current" />
                </Button>
              </>
            )}
          </span>
        )}

        {/* Song name + album art */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Album art - hidden until hover */}
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

        {/* Artist (desktop) */}
        <span className="hidden md:block text-sm text-[var(--text-secondary)] truncate">
          {artists}
        </span>

        {/* Album (desktop) */}
        {showAlbum && (
          <span className="hidden md:block text-sm text-[var(--text-secondary)] truncate">
            {song.al?.name}
          </span>
        )}

        {/* Duration + actions */}
        <div className="flex items-center gap-1 w-12 justify-end">
          <span className={cn(
            "text-xs transition-opacity duration-200",
            isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]',
            showActions && 'group-hover:opacity-0'
          )}>
            {formatDuration(song.dt || 0)}
          </span>
          {showActions && (
            <div className="hidden group-hover:flex items-center gap-0.5 absolute right-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddToQueue(song)
                }}
              >
                <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={(e) => e.stopPropagation()}
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

// ── Main component ───────────────────────────────────────────────────────────

export function SongTable({
  songs,
  showIndex = true,
  showAlbum = true,
  showActions = true,
  isLoading = false,
  animated = true,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onPlayAll,
  className,
}: SongTableProps) {
  const { playSong, playQueue, addToQueue, currentTrack, isPlaying } = usePlayerStore()

  const handlePlaySong = useCallback((song: Song) => {
    playSong(song)
  }, [playSong])

  const handleAddToQueue = useCallback((song: Song) => {
    addToQueue(song)
  }, [addToQueue])

  // Stable string[] of all song ids in the current order. Used to compute
  // the tri-state header checkbox and to forward to the parent selector.
  const allIds = useMemo<string[]>(
    () => songs.map((s) => String(s.id)),
    [songs]
  )

  // Stable `selectionSet` to avoid re-running `.has` across every render.
  // (We can't switch the `selectedIds` prop type, but memoising a derived
  // value keeps the row's data-* attribute referentially stable.)
  const selectionSet: ReadonlySet<string> = useMemo(
    () => selectedIds ?? EMPTY_SELECTION,
    [selectedIds]
  )

  const headerState = useMemo<HeaderCheckboxState>(
    () => deriveHeaderState(allIds.length, selectionSet.size),
    [allIds.length, selectionSet.size]
  )

  const currentTrackId = currentTrack?.id

  const handleHeaderToggle = useCallback(() => {
    if (headerState === 'all') {
      onClearSelection?.()
    } else {
      onToggleSelectAll?.(allIds)
    }
  }, [headerState, onClearSelection, onToggleSelectAll, allIds])

  const handlePlayAll = useCallback(() => {
    if (onPlayAll) {
      onPlayAll()
    } else {
      playQueue(songs, 0)
    }
  }, [onPlayAll, playQueue, songs])

  if (isLoading) {
    return (
      <div className={cn('space-y-1', className)}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="w-6 h-4 rounded bg-[var(--bg-elevated)]" />
            <Skeleton className="w-10 h-10 rounded bg-[var(--bg-elevated)]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4 rounded bg-[var(--bg-elevated)]" />
              <Skeleton className="h-3 w-1/2 rounded bg-[var(--bg-elevated)]" />
            </div>
            <Skeleton className="h-3 w-14 rounded bg-[var(--bg-elevated)]" />
          </div>
        ))}
      </div>
    )
  }

  if (songs.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-tertiary)] text-sm">
        暂无歌曲
      </div>
    )
  }

  // When animation is enabled, the parent + children must be motion components
  // so variants (and staggerChildren) propagate. When disabled, fall back to
  // plain <div> elements to avoid motion overhead and keep tests deterministic.
  const RowContainer = animated ? motion.div : 'div'

  // Static class strings keep Tailwind JIT happy: building them via template
  // strings can hide the final class name from the source scanner.
  const gridClass = selectable
    ? 'grid grid-cols-[auto_auto_1fr_auto] md:grid-cols-[auto_auto_1fr_minmax(80px,1fr)_minmax(60px,1fr)_auto] gap-3'
    : 'grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_minmax(80px,1fr)_minmax(60px,1fr)_auto] gap-3'

  return (
    <div className={cn('', className)}>
      {/* Header with play all */}
      {songs.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-2">
          <Button
            size="sm"
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-semibold rounded-full px-6 py-2 transition-all duration-200 hover:shadow-[0_0_20px_var(--accent-glow)]"
            onClick={handlePlayAll}
          >
            <Play className="w-4 h-4 mr-1.5 fill-current" />
            播放全部
          </Button>
          <span className="text-xs text-[var(--text-tertiary)] font-medium">
            共 {songs.length} 首
          </span>
        </div>
      )}

      {/* Table header */}
      <div
        className={cn(
          gridClass,
          'px-2 py-2 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest border-b border-[var(--border)]'
        )}
      >
        {selectable && (
          <SelectionCheckbox
            data-testid="song-table-select-all"
            aria-label="选择全部歌曲"
            state={headerState}
            onChange={handleHeaderToggle}
          />
        )}
        {showIndex && <span className="w-8 text-center">#</span>}
        <span className="truncate">歌曲</span>
        <span className="hidden md:block truncate">歌手</span>
        {showAlbum && <span className="hidden md:block truncate">专辑</span>}
        <span className="w-12 text-right">时长</span>
      </div>

      {/* Song rows */}
      <RowContainer
        {...(animated
          ? {
              initial: 'hidden' as const,
              animate: 'show' as const,
              variants: containerVariants,
            }
          : {})}
      >
        {songs.map((song, index) => (
          <SongRow
            key={song.id}
            song={song}
            index={index}
            isCurrent={currentTrackId === song.id}
            isPlaying={isPlaying}
            selectable={selectable}
            rowSelected={selectable && selectionSet.has(String(song.id))}
            showIndex={showIndex}
            showActions={showActions}
            showAlbum={showAlbum}
            gridClass={gridClass}
            animated={animated}
            onPlaySong={handlePlaySong}
            onAddToQueue={handleAddToQueue}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </RowContainer>
    </div>
  )
}

// Module-level frozen empty set. Reusing the same reference across renders
// when the caller does not pass `selectedIds` keeps referential equality
// stable for downstream consumers (e.g. memoised rows that depend on it).
const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>()
