'use client'

import { memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Disc3 } from 'lucide-react'
import { imageUrl, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/song'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SongHeroProps {
  song: Song
  className?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COVER_SIZE = 240
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]
const PUBLISH_FALLBACK = '—'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPublishTime(value: number | undefined): string {
  if (!value) return PUBLISH_FALLBACK
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return PUBLISH_FALLBACK
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}.${month}.${day}`
}

function buildArtistNodes(artists: Song['ar']): React.ReactNode {
  if (!artists || artists.length === 0) {
    return <span className="text-[var(--text-tertiary)]">未知艺人</span>
  }
  const nodes = artists.map((artist, index) => (
    <span key={artist.id} className="flex items-center gap-2">
      {index > 0 && <span className="text-[var(--text-quaternary)]">/</span>}
      <Link
        href={`/artist/${artist.id}`}
        className="text-[var(--accent)] hover:underline transition-colors"
        data-testid="song-hero-artist"
      >
        {artist.name}
      </Link>
    </span>
  ))
  return <span className="flex flex-wrap items-center gap-x-2 gap-y-1">{nodes}</span>
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AliasRowProps {
  aliases: string[] | undefined
}

function AliasRow({ aliases }: AliasRowProps) {
  if (!aliases || aliases.length === 0) return null
  return (
    <p className="text-xs text-[var(--text-tertiary)]" data-testid="song-hero-alias">
      {aliases.join(' / ')}
    </p>
  )
}

interface AlbumLinkProps {
  album: Song['al']
}

function AlbumLink({ album }: AlbumLinkProps) {
  if (!album) {
    return <span className="text-[var(--text-tertiary)]">未知专辑</span>
  }
  return (
    <Link
      href={`/album/${album.id}`}
      className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
      data-testid="song-hero-album"
    >
      {album.name}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Hero block for a single song: large cover, title, artists, album link,
 * and small metadata (duration, publish time). Pure presentation; playback
 * actions live in <SongActions />.
 */
function SongHeroImpl({ song, className }: SongHeroProps) {
  const cover = imageUrl(song.al?.picUrl, COVER_SIZE)
  const duration = formatDuration(song.dt ?? 0)
  const publishTime = formatPublishTime(song.publishTime)

  return (
    <motion.section
      data-testid="song-hero"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      className={cn(
        'flex flex-col md:flex-row items-center md:items-end gap-6',
        'p-5 md:p-8 rounded-2xl',
        'bg-[var(--bg-surface)] border border-[var(--border)]',
        'shadow-[var(--shadow-md)]',
        className
      )}
    >
      <div
        className="relative w-48 h-48 md:w-60 md:h-60 rounded-xl overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0 shadow-[var(--shadow-lg)]"
        data-testid="song-hero-cover-wrap"
      >
        <Image
          src={cover}
          alt={song.name}
          width={COVER_SIZE}
          height={COVER_SIZE}
          priority
          className="w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl pointer-events-none"
        />
      </div>

      <div className="flex-1 min-w-0 text-center md:text-left flex flex-col gap-2">
        <span className="inline-flex self-center md:self-start items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
          <Disc3 className="w-3.5 h-3.5" aria-hidden="true" />
          歌曲
        </span>

        <h1
          className="text-2xl md:text-4xl font-bold leading-tight tracking-tight text-[var(--text-primary)] line-clamp-2"
          data-testid="song-hero-title"
        >
          {song.name}
        </h1>

        <AliasRow aliases={song.alia} />

        <div
          className="text-sm text-[var(--text-secondary)]"
          data-testid="song-hero-artists"
        >
          <span className="text-[var(--text-tertiary)] mr-2">歌手</span>
          {buildArtistNodes(song.ar)}
        </div>

        <div className="text-sm text-[var(--text-secondary)]">
          <span className="text-[var(--text-tertiary)] mr-2">专辑</span>
          <AlbumLink album={song.al} />
        </div>

        <dl
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)] pt-1"
          data-testid="song-hero-meta"
        >
          <div className="flex items-center gap-1.5">
            <dt className="uppercase tracking-wider text-[10px]">时长</dt>
            <dd className="tabular-nums text-[var(--text-secondary)]">{duration}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="uppercase tracking-wider text-[10px]">发行</dt>
            <dd className="tabular-nums text-[var(--text-secondary)]">{publishTime}</dd>
          </div>
        </dl>
      </div>
    </motion.section>
  )
}

export const SongHero = memo(SongHeroImpl)
