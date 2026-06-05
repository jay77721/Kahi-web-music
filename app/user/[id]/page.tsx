'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Image from 'next/image'
import { AppShell } from '@/components/layout/AppShell'
import { PlaylistCard } from '@/components/common/PlaylistCard'
import { Skeleton } from '@/components/ui/skeleton'
import { ncmApi } from '@/lib/api'
import { normalizePlaylistList, normalizeUserProfile } from '@/lib/api-adapters'
import { imageUrl, formatCount } from '@/lib/format'
import type { Playlist } from '@/types/playlist'
import type { UserProfile } from '@/types/user'

export default function UserPage() {
  const params = useParams()
  const id = params.id as string

  const { data, isLoading, error } = useSWR<{ profile: UserProfile | null; playlists: Playlist[] }>(
    id ? `user-${id}` : null,
    async () => {
      const [detail, playlists] = await Promise.all([
        ncmApi.userDetail(id),
        ncmApi.userPlaylist(id, 50),
      ])
      return {
        profile: normalizeUserProfile(detail),
        playlists: normalizePlaylistList(playlists),
      }
    }
  )

  if (isLoading) {
    return <AppShell><div className="p-6"><Skeleton className="h-64 w-full" /></div></AppShell>
  }

  const profile = data?.profile
  const playlists = data?.playlists || []

  if (error || !profile) {
    return <AppShell><div className="p-6 text-center text-[var(--text-tertiary)]">用户不存在</div></AppShell>
  }

  return (
    <AppShell>
      {/* Hero */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <Image src={imageUrl(profile.backgroundUrl || profile.avatarUrl, 1080)} alt={profile.nickname} width={1080} height={1080} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/60 to-transparent" />
        <div className="absolute bottom-6 left-4 right-4 flex items-end gap-4 md:left-6 md:right-6">
          <Image src={imageUrl(profile.avatarUrl, 80)} alt={profile.nickname} width={80} height={80} className="w-20 h-20 shrink-0 rounded-full border-4 border-[var(--bg-primary)] object-cover" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{profile.nickname}</h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              Lv.{profile.level || 0} · {formatCount(profile.followeds || 0)}粉丝 · {formatCount(profile.follows || 0)}关注
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {profile.signature && (
          <p className="text-sm text-[var(--text-tertiary)] mb-6">{profile.signature}</p>
        )}

        <div className="flex gap-4 mb-6">
          <div className="text-center">
            <p className="text-lg font-bold">{formatCount(profile.playlistCount || 0)}</p>
            <p className="text-xs text-[var(--text-tertiary)]">歌单</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{formatCount(profile.listenSongs || 0)}</p>
            <p className="text-xs text-[var(--text-tertiary)]">听过</p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">歌单</h2>
        {playlists.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {playlists.map((pl) => (
              <PlaylistCard key={pl.id} id={pl.id} name={pl.name} coverUrl={pl.coverImgUrl} playCount={pl.playCount} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-10 text-center">
            <p className="text-sm text-[var(--text-tertiary)]">暂无公开歌单</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
