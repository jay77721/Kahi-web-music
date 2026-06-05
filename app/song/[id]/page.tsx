'use client'

import { useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/skeleton'
import { SongHero } from '@/components/song/SongHero'
import { SongActions } from '@/components/song/SongActions'
import { LyricsPanel } from '@/components/player/LyricsPanel'
import { CommentList } from '@/components/comment/CommentList'
import { ncmApi } from '@/lib/api'
import { normalizeLyricData, normalizeSongList } from '@/lib/api-adapters'
import { imageUrl } from '@/lib/format'
import { parseLyricResponse } from '@/lib/lrc'
import { usePlayerStore } from '@/stores/playerStore'
import { toast } from 'sonner'
import type { LyricLine, Song } from '@/types/song'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SongBundle {
  song: Song | null
  lyrics: LyricLine[]
  simiSongs: Song[]
}

const SIMI_LIMIT = 10
const MIN_LYRIC_LENGTH = 1

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SongDetailPage() {
  const params = useParams()
  const id = (params?.id as string | undefined) ?? ''
  const { playQueue, seek, currentTrack, currentTime } = usePlayerStore()

  const { data, isLoading } = useSWR<SongBundle | undefined>(
    id ? `song-detail-${id}` : null,
    async (): Promise<SongBundle> => {
      const [detail, lyric, simi] = await Promise.all([
        ncmApi.songDetail(id).catch(() => null),
        ncmApi.songLyric(id).catch(() => null),
        ncmApi.simiSong(id).catch(() => null),
      ])

      const song = normalizeSongList(detail)[0] ?? null
      const lyricRoot = normalizeLyricData(lyric)
      const lrcText = lyricRoot?.lrc?.lyric ?? ''
      const tlyricText = lyricRoot?.tlyric?.lyric ?? ''
      const lyrics = lrcText.length >= MIN_LYRIC_LENGTH
        ? parseLyricResponse(lrcText, tlyricText)
        : []
      const simiSongs = normalizeSongList(simi)

      return { song, lyrics, simiSongs }
    }
  )

  const song = useMemo(() => data?.song ?? null, [data?.song])
  const lyrics = useMemo(() => data?.lyrics ?? [], [data?.lyrics])
  const simiSongs = useMemo(() => data?.simiSongs ?? [], [data?.simiSongs])

  const isCurrent = currentTrack?.id === song?.id
  const lyricCurrentTime = isCurrent ? currentTime : 0

  const handleLyricSeek = useCallback(
    (time: number) => {
      if (!isCurrent) {
        toast.info('播放后可点击歌词跳转')
        return
      }
      seek(time)
    },
    [isCurrent, seek]
  )

  const handlePlaySimilar = useCallback(
    (songs: Song[], startIndex: number) => {
      playQueue(songs, startIndex)
    },
    [playQueue]
  )

  const similarPreview = useMemo(
    () => simiSongs.slice(0, SIMI_LIMIT),
    [simiSongs]
  )

  if (isLoading) {
    return <SongDetailSkeleton />
  }

  if (!song) {
    return <SongDetailError />
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6" data-testid="song-page">
        <header className="space-y-4">
          <SongHero song={song} />
          <SongActions song={song} />
        </header>

        <section
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          data-testid="song-body"
        >
          <div className="lg:col-span-2 space-y-6">
            {song.al ? <AlbumCard album={song.al} /> : null}
            <CommentList id={id} type="song" />
          </div>
          <aside className="space-y-3" data-testid="song-lyrics">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">歌词</h2>
            <LyricsPanel
              lyrics={lyrics}
              currentTime={lyricCurrentTime}
              onSeek={handleLyricSeek}
            />
          </aside>
        </section>

        {similarPreview.length > 0 ? (
          <SimilarSongs songs={similarPreview} onPlay={handlePlaySimilar} />
        ) : null}
      </div>
    </AppShell>
  )
}

// ---------------------------------------------------------------------------
// Sub-components (kept local — single-use, no test surface outside this page)
// ---------------------------------------------------------------------------

interface AlbumCardProps {
  album: NonNullable<Song['al']>
}

function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link
      href={`/album/${album.id}`}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
      data-testid="song-album-card"
    >
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0">
        <Image
          src={imageUrl(album.picUrl, 160)}
          alt={album.name}
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          所属专辑
        </p>
        <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-text)] transition-colors">
          {album.name}
        </p>
      </div>
    </Link>
  )
}

interface SimilarSongsProps {
  songs: Song[]
  onPlay: (songs: Song[], startIndex: number) => void
}

function SimilarSongs({ songs, onPlay }: SimilarSongsProps) {
  return (
    <section data-testid="song-similar">
      <header className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg md:text-xl font-bold tracking-tight">相似歌曲</h2>
        <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
          {songs.length} 首
        </span>
      </header>
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin"
        data-testid="song-similar-rail"
      >
        {songs.map((s, index) => (
          <SimilarCard
            key={s.id}
            song={s}
            onClick={() => onPlay(songs, index)}
          />
        ))}
      </div>
    </section>
  )
}

interface SimilarCardProps {
  song: Song
  onClick: () => void
}

function SimilarCard({ song, onClick }: SimilarCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex-shrink-0 w-36 md:w-40 text-left snap-start"
      data-testid="song-similar-card"
    >
      <div className="aspect-square rounded-lg overflow-hidden bg-[var(--bg-elevated)] mb-2">
        <Image
          src={imageUrl(song.al?.picUrl, 240)}
          alt={song.name}
          width={160}
          height={160}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-text)] transition-colors">
        {song.name}
      </p>
      <p className="text-xs text-[var(--text-tertiary)] truncate">
        {song.ar?.map((a) => a.name).join(' / ') ?? '未知艺人'}
      </p>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Loading & error states
// ---------------------------------------------------------------------------

function SongDetailSkeleton() {
  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6" data-testid="song-skeleton">
        <div className="flex flex-col md:flex-row gap-6 p-5 md:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
          <Skeleton className="w-48 h-48 md:w-60 md:h-60 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </AppShell>
  )
}

function SongDetailError() {
  return (
    <AppShell>
      <div
        className="p-4 md:p-6"
        data-testid="song-error"
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
          <p className="text-base text-[var(--text-tertiary)]">歌曲不存在或加载失败</p>
        </div>
      </div>
    </AppShell>
  )
}
