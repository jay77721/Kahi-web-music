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

export default function AlbumPage() {
  const params = useParams()
  const id = params.id as string
  const { playQueue } = usePlayerStore()

  const { data, isLoading, error } = useSWR<NormalizedAlbumDetail>(
    id ? `album-${id}` : null,
    async () => normalizeAlbumDetail(await ncmApi.album(id))
  )

  if (isLoading) {
    return <AppShell><div className="p-6"><Skeleton className="h-96 w-full" /></div></AppShell>
  }

  if (error || !data?.album?.id) {
    return <AppShell><div className="p-6 text-center text-[var(--text-tertiary)]">专辑不存在</div></AppShell>
  }

  const album = data.album
  const songs = data.songs

  return (
    <AppShell>
      <div className="p-4 md:p-6">
        {/* Hero Banner */}
        <HeroBanner
          cover={album.picUrl}
          title={album.name}
          subtitle={album.description}
          badge="专辑"
          meta={{
            count: album.size,
            creator: album.artist ? (
              <Link href={`/artist/${album.artist.id}`} className="hover:underline text-[var(--text-secondary)]">
                {album.artist.name}
              </Link>
            ) : (
              <span>未知歌手</span>
            ),
            plays: [
              album.publishTime ? new Date(album.publishTime).toLocaleDateString() : '',
              album.company,
            ]
              .filter(Boolean)
              .join(' · ') || null,
          }}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)]"
                onClick={() => playQueue(songs, 0)}
              >
                <Play className="w-4 h-4 mr-1" /> 播放全部
              </Button>
              <ShareMenu type="album" id={album.id} title={album.name} />
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
