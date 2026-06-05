'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { AppShell } from '@/components/layout/AppShell'
import { SongTable } from '@/components/common/SongTable'
import { CommentList } from '@/components/comment/CommentList'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { HeroBanner } from '@/components/playlist/HeroBanner'
import { ncmApi } from '@/lib/api'
import {
  normalizeAlbumDetail,
  type NormalizedAlbumDetail,
} from '@/lib/api-adapters'
import { usePlayerStore } from '@/stores/playerStore'
import { Play } from 'lucide-react'
import Link from 'next/link'
import { ShareMenu } from '@/components/common/ShareMenu'

function getRouteId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function formatAlbumDate(value: number | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString()
}

export default function AlbumPage() {
  const params = useParams()
  const id = getRouteId(params?.id as string | string[] | undefined)
  const { playQueue } = usePlayerStore()

  const { data, isLoading, error } = useSWR<NormalizedAlbumDetail>(
    id ? `album-${id}` : null,
    async () => normalizeAlbumDetail(await ncmApi.album(id).catch(() => null))
  )

  if (isLoading) {
    return <AppShell><div className="p-6"><Skeleton className="h-96 w-full" /></div></AppShell>
  }

  if (error || !data?.album?.id) {
    return <AppShell><div className="p-6 text-center text-[var(--text-tertiary)]">专辑不存在</div></AppShell>
  }

  const album = data.album
  const songs = data.songs ?? []
  const albumTitle = album.name?.trim() || '未知专辑'
  const artistName = album.artist?.name?.trim() || '未知歌手'
  const artistId = album.artist?.id
  const albumMeta = [
    formatAlbumDate(album.publishTime),
    album.company,
  ]
    .filter(Boolean)
    .join(' · ') || null

  return (
    <AppShell>
      <div className="p-4 md:p-6">
        {/* Hero Banner */}
        <HeroBanner
          cover={album.picUrl ?? ''}
          title={albumTitle}
          subtitle={album.description}
          badge="专辑"
          meta={{
            count: album.size ?? songs.length,
            creator: artistId ? (
              <Link href={`/artist/${artistId}`} className="hover:underline text-[var(--text-secondary)]">
                {artistName}
              </Link>
            ) : (
              <span>{artistName}</span>
            ),
            plays: albumMeta,
          }}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)]"
                onClick={() => playQueue(songs, 0)}
                disabled={songs.length === 0}
              >
                <Play className="w-4 h-4 mr-1" /> 播放全部
              </Button>
              <ShareMenu type="album" id={album.id} title={albumTitle} />
            </div>
          }
        />

        <SongTable songs={songs} showAlbum={false} />

        <div className="mt-10">
          <CommentList id={id} type="album" />
        </div>
      </div>
    </AppShell>
  )
}
