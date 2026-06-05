'use client'

import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Image from 'next/image'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { SongTable } from '@/components/common/SongTable'
import { BatchActionBar } from '@/components/common/BatchActionBar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tag } from '@/components/common/Tag'
import { ShareMenu } from '@/components/common/ShareMenu'
import { MetadataBento, type BentoItem } from '@/components/playlist/MetadataBento'
import { HeroBanner } from '@/components/playlist/HeroBanner'
import { ncmApi } from '@/lib/api'
import {
  normalizePlaylistDetail,
  type NormalizedPlaylistDetail,
} from '@/lib/api-adapters'
import { formatCount, formatDate, imageUrl } from '@/lib/format'
import { usePlayerStore } from '@/stores/playerStore'
import { useMultiSelect } from '@/hooks/useMultiSelect'
import {
  Play,
  Heart,
  ListMusic,
  Clock,
  User,
  CheckSquare,
  Trash2,
  HeartPlus,
} from 'lucide-react'
import type { Song } from '@/types/song'

function getRouteId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function safeFormatDate(value: number | undefined): string {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知'
  return formatDate(value)
}

const EMPTY_TRACKS: Song[] = []
const INITIAL_TRACK_LIMIT = 30
const INITIAL_ARTWORK_COUNT = 8
const FULL_TRACK_LIMIT = 100

async function fetchPlaylistDetailSlice(
  id: string,
  trackLimit: number
): Promise<NormalizedPlaylistDetail> {
  const [detail, tracks] = await Promise.all([
    ncmApi.playlistDetail(id).catch(() => null),
    ncmApi.playlistTrackAll(id, trackLimit).catch(() => null),
  ])
  const normalized = normalizePlaylistDetail(detail, tracks)

  return {
    ...normalized,
    tracks: normalized.tracks.slice(0, trackLimit),
  }
}

export default function PlaylistDetailPage() {
  const params = useParams()
  const id = getRouteId(params?.id as string | string[] | undefined)
  const { playQueue } = usePlayerStore()
  const [batchMode, setBatchMode] = useState<boolean>(false)
  const [isLoadingFullTracks, setIsLoadingFullTracks] = useState<boolean>(false)
  const [fullTracksLoadedForId, setFullTracksLoadedForId] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR<NormalizedPlaylistDetail>(
    id ? `playlist-detail-${id}` : null,
    () => fetchPlaylistDetailSlice(id, INITIAL_TRACK_LIMIT)
  )

  const tracks = data?.tracks ?? EMPTY_TRACKS
  const trackIds = useMemo(() => tracks.map((t) => String(t.id)), [tracks])

  const selection = useMultiSelect({
    enableKeyboard: batchMode,
    allIds: trackIds,
  })

  const playlist = data?.playlist
  const playlistTitle = playlist?.name?.trim() || '未命名歌单'
  const playCount = playlist?.playCount ?? 0
  const trackCount = playlist?.trackCount || tracks.length || 0
  const createDate = safeFormatDate(playlist?.createTime)
  const creatorName = playlist?.creator?.nickname?.trim() || 'Unknown'
  const fullTrackTarget = Math.min(
    FULL_TRACK_LIMIT,
    Math.max(trackCount, tracks.length)
  )
  const canLoadFullTracks =
    fullTracksLoadedForId !== id && tracks.length < fullTrackTarget
  const trackSummary =
    trackCount > tracks.length
      ? `已显示 ${tracks.length} / ${trackCount} 首`
      : `共 ${tracks.length} 首`
  const loadFullTracksLabel =
    fullTrackTarget >= FULL_TRACK_LIMIT
      ? `加载完整前 ${FULL_TRACK_LIMIT}`
      : `加载全部 ${fullTrackTarget}`

  const loadFullTracks = useCallback(async (): Promise<Song[]> => {
    if (!id || !playlist || isLoadingFullTracks) return tracks

    setIsLoadingFullTracks(true)
    try {
      const trackPayload = await ncmApi.playlistTrackAll(id, FULL_TRACK_LIMIT)
      const normalized = normalizePlaylistDetail({ playlist }, trackPayload)
      const nextTracks = normalized.tracks.slice(0, FULL_TRACK_LIMIT)
      const nextData: NormalizedPlaylistDetail = {
        playlist,
        tracks: nextTracks.length > 0 ? nextTracks : tracks,
      }

      await mutate(nextData, { revalidate: false })
      setFullTracksLoadedForId(id)
      return nextData.tracks
    } catch {
      toast.error('加载歌曲失败，请稍后重试')
      return tracks
    } finally {
      setIsLoadingFullTracks(false)
    }
  }, [id, isLoadingFullTracks, mutate, playlist, tracks])

  const handleLoadFullTracks = useCallback(async () => {
    await loadFullTracks()
  }, [loadFullTracks])

  const handlePlayAll = useCallback(async () => {
    const queue = canLoadFullTracks ? await loadFullTracks() : tracks
    if (queue.length > 0) {
      playQueue(queue, 0)
    }
  }, [canLoadFullTracks, loadFullTracks, playQueue, tracks])

  if (isLoading && !data) {
    return (
      <AppShell>
        <div className="p-6 space-y-6">
          <div className="flex gap-6">
            <Skeleton className="w-48 h-48 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </AppShell>
    )
  }

  if (!playlist) {
    return (
      <AppShell>
        <div className="p-6 text-center text-[var(--text-tertiary)]">歌单不存在</div>
      </AppShell>
    )
  }

  const handleToggleBatchMode = () => {
    const next = !batchMode
    setBatchMode(next)
    if (!next) {
      selection.clear()
    }
  }

  const handleBatchDelete = () => {
    toast.info(`已请求从歌单中删除 ${selection.count} 首歌曲（功能开发中）`)
    selection.clear()
  }

  const handleBatchFavorite = () => {
    toast.success(`已收藏 ${selection.count} 首歌曲（功能开发中）`)
    selection.clear()
  }

  // Build metadata tiles for the bento grid.
  // - play count: large hero tile
  // - track count: medium
  // - favorites (subscribedCount): medium
  // - creator nickname: small
  // - creation date: small
  const bentoItems: BentoItem[] = [
    {
      icon: <Play />,
      label: 'PLAYS',
      value: formatCount(playCount),
      size: 'lg',
      color: 'var(--accent)',
    },
    {
      icon: <ListMusic />,
      label: 'TRACKS',
      value: `${trackCount}`,
      size: 'md',
      color: '#7dd3fc',
    },
    {
      icon: <Heart />,
      label: 'FAVORITES',
      value: formatCount(playlist.subscribedCount ?? 0),
      size: 'md',
      color: '#f472b6',
    },
    {
      icon: <User />,
      label: 'CREATOR',
      value: creatorName,
      size: 'sm',
      color: '#a78bfa',
    },
    {
      icon: <Clock />,
      label: 'CREATED',
      value: createDate,
      size: 'sm',
      color: '#fbbf24',
    },
  ]

  return (
    <AppShell>
      <div className="p-4 md:p-6">
        {/* Hero Banner */}
        <HeroBanner
          cover={playlist.coverImgUrl ?? ''}
          title={playlistTitle}
          subtitle={playlist.description}
          badge="歌单"
          meta={{
            plays: formatCount(playCount),
            count: trackCount,
            creator: playlist.creator ? (
              <span className="flex items-center gap-1.5">
                <Image
                  src={imageUrl(playlist.creator.avatarUrl, 24)}
                  alt={creatorName}
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full"
                />
                <span>{creatorName}</span>
                <span className="text-xs text-[var(--text-quaternary)]">
                  {createDate}
                </span>
              </span>
            ) : null,
          }}
          actions={
            <>
              <Button
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)]"
                onClick={handlePlayAll}
                disabled={tracks.length === 0 || isLoadingFullTracks}
              >
                <Play className="w-4 h-4 mr-1" />
                播放全部
              </Button>
              <Button variant="outline" className="border-[var(--border)]">
                <Heart className="w-4 h-4 mr-1" />
                收藏
              </Button>
              <ShareMenu type="playlist" id={playlist.id} title={playlistTitle} />
            </>
          }
        />

        {/* Metadata Bento Grid */}
        <MetadataBento items={bentoItems} className="mb-6" />

        {/* Tags */}
        {playlist.tags && playlist.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {playlist.tags.map((tag: string) => (
              <Tag key={tag} label={tag} onClick={() => undefined} />
            ))}
          </div>
        )}

        {/* Track controls */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2 px-2">
          <span
            className="text-xs text-[var(--text-tertiary)] font-medium"
            data-testid="playlist-track-summary"
          >
            {trackSummary}
          </span>
          <div className="flex items-center justify-end gap-2">
            {canLoadFullTracks && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadFullTracks}
                disabled={isLoadingFullTracks}
                className="border-[var(--border)]"
                data-testid="playlist-load-full"
              >
                <ListMusic className="w-4 h-4 mr-1.5" />
                {isLoadingFullTracks ? '加载中...' : loadFullTracksLabel}
              </Button>
            )}
            <Button
              variant={batchMode ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleBatchMode}
              disabled={tracks.length === 0}
              className={
                batchMode
                  ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black'
                  : 'border-[var(--border)]'
              }
              data-testid="batch-mode-toggle"
            >
              <CheckSquare className="w-4 h-4 mr-1.5" />
              {batchMode ? '退出批量操作' : '批量操作'}
            </Button>
          </div>
        </div>

        {/* Song table */}
        <SongTable
          songs={tracks}
          animated={false}
          initialArtworkCount={INITIAL_ARTWORK_COUNT}
          selectable={batchMode}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.toggle}
          onToggleSelectAll={selection.selectAll}
          onClearSelection={selection.clear}
          onPlayAll={handlePlayAll}
        />
      </div>
      <BatchActionBar
        selectedCount={selection.count}
        onClear={selection.clear}
        actions={[
          {
            label: '收藏',
            icon: <HeartPlus className="w-3.5 h-3.5" />,
            onClick: handleBatchFavorite,
          },
          {
            label: '从歌单删除',
            icon: <Trash2 className="w-3.5 h-3.5" />,
            danger: true,
            onClick: handleBatchDelete,
          },
        ]}
      />
    </AppShell>
  )
}
