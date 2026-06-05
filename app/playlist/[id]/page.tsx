'use client'

import { useMemo, useState } from 'react'
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

export default function PlaylistDetailPage() {
  const params = useParams()
  const id = getRouteId(params?.id as string | string[] | undefined)
  const { playQueue } = usePlayerStore()
  const [batchMode, setBatchMode] = useState<boolean>(false)

  const { data, isLoading } = useSWR<NormalizedPlaylistDetail>(
    id ? `playlist-detail-${id}` : null,
    async () => {
      const [detail, tracks] = await Promise.all([
        ncmApi.playlistDetail(id).catch(() => null),
        ncmApi.playlistTrackAll(id, 100).catch(() => null),
      ])
      return normalizePlaylistDetail(detail, tracks)
    }
  )

  const tracks: Song[] = useMemo(() => data?.tracks || [], [data?.tracks])
  const trackIds = useMemo(() => tracks.map((t) => String(t.id)), [tracks])

  const selection = useMultiSelect({
    enableKeyboard: batchMode,
    allIds: trackIds,
  })

  if (isLoading) {
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

  const playlist = data?.playlist

  if (!playlist) {
    return (
      <AppShell>
        <div className="p-6 text-center text-[var(--text-tertiary)]">歌单不存在</div>
      </AppShell>
    )
  }

  const playlistTitle = playlist.name?.trim() || '未命名歌单'
  const playCount = playlist.playCount ?? 0
  const trackCount = tracks.length || playlist.trackCount || 0
  const createDate = safeFormatDate(playlist.createTime)
  const creatorName = playlist.creator?.nickname?.trim() || 'Unknown'

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
                onClick={() => tracks.length > 0 && playQueue(tracks, 0)}
                disabled={tracks.length === 0}
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

        {/* Batch mode toggle */}
        <div className="flex items-center justify-end mb-2 px-2">
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

        {/* Song table */}
        <SongTable
          songs={tracks}
          selectable={batchMode}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.toggle}
          onToggleSelectAll={selection.selectAll}
          onClearSelection={selection.clear}
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
