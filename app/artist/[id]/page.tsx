'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Image from 'next/image'
import {
  Music,
  Disc3,
  Film,
  Users as UsersIcon,
  Play,
  UserPlus,
  ChevronRight,
  Mic2,
  TrendingUp,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SongTable } from '@/components/common/SongTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArtistHero } from '@/components/artist/ArtistHero'
import { ncmApi } from '@/lib/api'
import {
  normalizeArtistDetail,
  type NormalizedArtistDetail,
} from '@/lib/api-adapters'
import { formatCount, imageUrl } from '@/lib/format'
import { usePlayerStore } from '@/stores/playerStore'
import { cn } from '@/lib/utils'
import type { Album } from '@/types/album'
import type { Artist } from '@/types/artist'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ArtistPageData = NormalizedArtistDetail
type ArtistPrimaryData = Pick<ArtistPageData, 'artist' | 'songs'>
type ArtistDeferredData = Pick<ArtistPageData, 'albums' | 'desc' | 'simiArtists'>

interface StatTile {
  icon: ReactNode
  label: string
  value: string
  color: string
  size: 'lg' | 'sm'
}

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

const UNKNOWN_ARTIST = '未知艺人'
const UNKNOWN_ALBUM = '未知专辑'

function getRouteId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function formatAlbumYear(value: number | undefined): string {
  if (!value) return '未知年份'
  const year = new Date(value).getFullYear()
  return Number.isFinite(year) ? String(year) : '未知年份'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ArtistPageSkeleton() {
  return (
    <div data-testid="artist-skeleton" className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-5 md:p-8 rounded-2xl bg-[var(--bg-secondary)]">
        <Skeleton className="w-40 h-40 md:w-64 md:h-64 rounded-full" />
        <div className="flex-1 space-y-3 w-full">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-16 w-full max-w-xl" />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        <Skeleton className="col-span-12 md:col-span-6 h-40 rounded-2xl" />
        <Skeleton className="col-span-6 md:col-span-3 h-40 rounded-2xl" />
        <Skeleton className="col-span-6 md:col-span-3 h-40 rounded-2xl" />
        <Skeleton className="col-span-12 h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  )
}

interface SectionHeaderProps {
  icon: ReactNode
  title: string
  count?: string | number
}

function SectionHeader({ icon, title, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-[var(--text-primary)]">
        <span className="text-[var(--accent)]">{icon}</span>
        <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
        {count !== undefined && (
          <span className="text-xs text-[var(--text-tertiary)] font-medium">
            ({count})
          </span>
        )}
      </div>
    </div>
  )
}

interface StatsBentoProps {
  tiles: readonly StatTile[]
}

function StatsBento({ tiles }: StatsBentoProps) {
  return (
    <div
      role="list"
      aria-label="Artist stats"
      className="grid grid-cols-12 gap-3 md:gap-4 mb-6 stagger-children"
    >
      {tiles.map((tile, idx) => {
        const isLg = tile.size === 'lg'
        return (
          <div
            key={`${tile.label}-${idx}`}
            role="listitem"
            className={cn(
              'bento-card relative flex flex-col justify-between overflow-hidden',
              'rounded-2xl border border-white/10 bg-white/5',
              'p-4 md:p-5 min-h-[120px] md:min-h-[140px]',
              'transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white/10',
              isLg
                ? 'col-span-12 md:col-span-6 md:row-span-2 min-h-[200px] md:min-h-[296px]'
                : 'col-span-6 md:col-span-3'
            )}
            style={{ ['--bento-accent' as string]: tile.color }}
          >
            <div
              className="flex items-center gap-2 text-white/70"
              style={{ color: tile.color }}
            >
              <span className="[&_svg]:w-4 [&_svg]:h-4">{tile.icon}</span>
              <span className="text-[10px] md:text-xs font-medium uppercase tracking-wider text-white/60">
                {tile.label}
              </span>
            </div>
            <div
              className={cn(
                'font-semibold text-white leading-none',
                isLg ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl'
              )}
            >
              {tile.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface AlbumsRailProps {
  albums: readonly Album[]
}

function AlbumsRail({ albums }: AlbumsRailProps) {
  if (albums.length === 0) return null
  return (
    <div className="mb-6 section-enter">
      <SectionHeader
        icon={<Disc3 className="w-5 h-5" />}
        title="专辑"
        count={albums.length}
      />
      <div
        className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x"
        style={{ scrollbarWidth: 'thin' }}
      >
        {albums.map((album) => {
          const albumName = album.name?.trim() || UNKNOWN_ALBUM
          return (
            <Link
              key={album.id}
              href={`/album/${album.id}`}
              className="group flex-shrink-0 w-40 snap-start hover-lift"
            >
              <div className="aspect-square rounded-xl overflow-hidden mb-2 border border-transparent transition-all duration-300 group-hover:border-[var(--accent)]/30 group-hover:shadow-[0_0_16px_var(--accent-glow)]">
                <Image
                  src={imageUrl(album.picUrl, 240)}
                  alt={albumName}
                  width={240}
                  height={240}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <p className="text-sm text-[var(--text-secondary)] line-clamp-2 group-hover:text-[var(--text-primary)] transition-colors duration-300">
                {albumName}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                {formatAlbumYear(album.publishTime)}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

interface SimilarArtistsProps {
  artists: readonly Artist[]
}

function SimilarArtists({ artists }: SimilarArtistsProps) {
  if (artists.length === 0) return null
  return (
    <div className="mb-6 section-enter">
      <SectionHeader
        icon={<TrendingUp className="w-5 h-5" />}
        title="相似艺人"
        count={artists.length}
      />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {artists.slice(0, 6).map((similar) => {
          const artistName = similar.name?.trim() || UNKNOWN_ARTIST
          return (
            <Link
              key={similar.id}
              href={`/artist/${similar.id}`}
              className="group flex flex-col items-center text-center hover-lift"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mb-2 border-2 border-transparent transition-all duration-300 group-hover:border-[var(--accent)]/40 group-hover:shadow-[0_0_20px_var(--accent-glow)]">
                {similar.picUrl ? (
                  <Image
                    src={imageUrl(similar.picUrl, 200)}
                    alt={artistName}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--bg-elevated)] flex items-center justify-center">
                    <Mic2 className="w-8 h-8 text-[var(--text-tertiary)]" />
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2 group-hover:text-[var(--text-primary)] transition-colors duration-300 w-full">
                {artistName}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadArtistPrimary(id: string): Promise<ArtistPrimaryData> {
  const [detailRes, songsRes] = await Promise.all([
    ncmApi.artistDetail(id).catch(() => null),
    ncmApi.artistSongs(id, 10).catch(() => null),
  ])

  const normalized = normalizeArtistDetail({
    detail: detailRes,
    songs: songsRes,
  })

  return {
    artist: normalized.artist,
    songs: normalized.songs,
  }
}

async function loadArtistDeferred(id: string): Promise<ArtistDeferredData> {
  const [albumsRes, descRes, simiRes] = await Promise.all([
    ncmApi.artistAlbum(id, 12).catch(() => null),
    ncmApi.artistDesc(id).catch(() => null),
    ncmApi.simiArtist(id).catch(() => null),
  ])

  const normalized = normalizeArtistDetail({
    albums: albumsRes,
    desc: descRes,
    simi: simiRes,
  })

  return {
    albums: normalized.albums,
    desc: normalized.desc,
    simiArtists: normalized.simiArtists.slice(0, 6),
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ArtistPage() {
  const params = useParams()
  const id = getRouteId(params?.id as string | string[] | undefined)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const [deferredReadyId, setDeferredReadyId] = useState<string | null>(null)

  const { data: primaryData, isLoading } = useSWR<ArtistPrimaryData>(
    id ? `artist-primary-${id}` : null,
    () => loadArtistPrimary(id)
  )

  const artist = primaryData?.artist
  const shouldScheduleDeferred = Boolean(id && artist && deferredReadyId !== id)

  useEffect(() => {
    if (!shouldScheduleDeferred) return

    let active = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null

    const markReady = () => {
      if (active) setDeferredReadyId(id)
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(markReady, { timeout: 1800 })
    } else {
      timeoutId = setTimeout(markReady, 900)
    }

    return () => {
      active = false
      if (idleId !== null && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [id, shouldScheduleDeferred])

  const { data: deferredData, isLoading: isDeferredLoading, error: deferredError } = useSWR<ArtistDeferredData>(
    id && deferredReadyId === id ? `artist-deferred-${id}` : null,
    () => loadArtistDeferred(id)
  )

  if (isLoading) {
    return (
      <AppShell>
        <ArtistPageSkeleton />
      </AppShell>
    )
  }

  const songs = primaryData?.songs ?? []
  const albums = deferredData?.albums ?? []
  const desc = deferredData?.desc ?? ''
  const simiArtists = deferredData?.simiArtists ?? []

  if (!artist) {
    return (
      <AppShell>
        <div
          data-testid="artist-not-found"
          className="p-6 text-center text-[var(--text-tertiary)]"
        >
          歌手不存在
        </div>
      </AppShell>
    )
  }

  const hotSongs = songs.slice(0, 10)
  const fanCount = (artist as Artist & { fansCount?: number }).fansCount ?? 0
  const deferredSettled =
    deferredData !== undefined ||
    Boolean(deferredError) ||
    (deferredReadyId === id && !isDeferredLoading)
  const showEmptyContent =
    deferredSettled &&
    albums.length === 0 &&
    simiArtists.length === 0 &&
    hotSongs.length === 0

  const statTiles: StatTile[] = [
    {
      icon: <Music />,
      label: 'SONGS',
      value: String(artist.musicSize ?? songs.length),
      color: 'var(--accent)',
      size: 'lg',
    },
    {
      icon: <Disc3 />,
      label: 'ALBUMS',
      value: String(artist.albumSize ?? albums.length),
      color: '#7dd3fc',
      size: 'sm',
    },
    {
      icon: <Film />,
      label: 'MVS',
      value: String(artist.mvSize ?? 0),
      color: '#f472b6',
      size: 'sm',
    },
    {
      icon: <UsersIcon />,
      label: 'FANS',
      value: fanCount > 0 ? formatCount(fanCount) : '—',
      color: '#a78bfa',
      size: 'sm',
    },
  ]

  return (
    <AppShell>
      <div className="p-4 md:p-6" data-testid="artist-page">
        <ArtistHero
          artist={artist}
          description={desc}
          fanCount={fanCount}
          className="mb-6"
        />

        <StatsBento tiles={statTiles} />

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-semibold rounded-full px-6"
            onClick={() => hotSongs.length > 0 && playQueue(hotSongs, 0)}
            disabled={hotSongs.length === 0}
            data-testid="play-all"
          >
            <Play className="w-4 h-4 mr-1.5 fill-current" />
            播放热门
          </Button>
          <Button
            variant="outline"
            className="border-[var(--border)] rounded-full"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            关注
          </Button>
        </div>

        {/* Hot songs */}
        <section className="mb-6 section-enter">
          <SectionHeader
            icon={<Music className="w-5 h-5" />}
            title="热门歌曲"
            count={hotSongs.length}
          />
          <SongTable songs={hotSongs} animated />
        </section>

        <AlbumsRail albums={albums} />
        <SimilarArtists artists={simiArtists} />

        {showEmptyContent && (
          <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">
            暂无内容
            <ChevronRight className="inline w-4 h-4 ml-1 align-text-bottom" />
          </div>
        )}
      </div>
    </AppShell>
  )
}
