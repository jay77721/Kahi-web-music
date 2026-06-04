'use client'

import { useCallback, useMemo } from 'react'
import { Play } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { usePlayerStore } from '@/stores/playerStore'
import type { Song } from '@/types/song'
import { cn } from '@/lib/utils'
import { SelectionCheckbox } from './SelectionCheckbox'
import { SongTableRow } from './song-table/SongTableRow'
import { SongTableSkeleton } from './song-table/SongTableSkeleton'
import {
  EMPTY_SELECTION,
  deriveHeaderState,
  getSongTableGridClass,
} from './song-table/SongTableSelection'

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

  const headerState = useMemo(
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
    return <SongTableSkeleton className={className} />
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

  const gridClass = getSongTableGridClass(selectable)

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
          <SongTableRow
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
