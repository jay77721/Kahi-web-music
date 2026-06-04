'use client'

import { useEffect, useMemo, useCallback, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { SongTable } from '@/components/common/SongTable'
import { PlaylistGrid } from '@/components/playlist/PlaylistGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ncmApi, unwrapField } from '@/lib/api'
import { PlayerBar } from '@/components/player/PlayerBar'
import { PlayerOverlays } from '@/components/player/PlayerOverlays'
import { ProfileHeader } from '@/components/user/ProfileHeader'
import { usePlayerStore } from '@/stores/playerStore'
import { useUserStore } from '@/stores/userStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useDominantColor } from '@/hooks/useDominantColor'
import { imageUrl } from '@/lib/format'
import { mutate as swrMutate } from 'swr'
import { Heart, Clock, Cloud, ListMusic, Plus } from 'lucide-react'
import type {
  Song,
  Playlist,
} from '@/types/api'
import type { DominantColor } from '@/lib/color'

const FALLBACK_BG_OKLCH = 'oklch(0.18 0 0)'

function withAlpha(oklch: string, alpha: number): string {
  if (!oklch.endsWith(')')) return oklch
  return `${oklch.slice(0, -1)} / ${alpha})`
}

function buildBgStyle(color: DominantColor | null): CSSProperties {
  const base = color?.oklch ?? FALLBACK_BG_OKLCH
  return {
    backgroundImage: `
      radial-gradient(ellipse at 20% 0%, ${withAlpha(base, 0.35)} 0%, transparent 55%),
      radial-gradient(ellipse at 80% 100%, ${withAlpha(base, 0.22)} 0%, transparent 55%),
      linear-gradient(180deg, #0a0a0a 0%, #0d0f0a 50%, #0a0a0a 100%)
    `,
    transition: 'background-image 600ms ease-out',
  }
}

function MyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'liked'
  const { isLoggedIn, profile } = useUserStore()
  const { playQueue } = usePlayerStore()
  const { history, clear: clearHistory } = useHistoryStore()

  const sampledAvatar = profile ? imageUrl(profile.avatarUrl, 120) : null
  const { color } = useDominantColor(sampledAvatar, { timeoutMs: 4000 })
  const backgroundStyle = useMemo(() => buildBgStyle(color), [color])

  useEffect(() => {
    if (!isLoggedIn) router.push('/login')
  }, [isLoggedIn, router])

  const { data: likedSongs, isLoading: likedLoading } = useSWR<Song[]>(
    isLoggedIn && tab === 'liked' && !!profile?.userId ? 'likelist' : null,
    async () => {
      const uid = profile?.userId
      if (!uid) return []
      const res = await ncmApi.likelist(uid)
      const ids = unwrapField<number[]>(res, 'ids') || []
      if (ids.length === 0) return []
      const detail = await ncmApi.songDetail(ids.slice(0, 100).join(','))
      return unwrapField<Song[]>(detail, 'songs') || []
    }
  )

  const { data: recentSongs, isLoading: recentLoading } = useSWR<Song[]>(
    isLoggedIn && tab === 'recent' ? 'recent-songs' : null,
    async () => {
      const res = await ncmApi.recordRecentSong(50)
      const list = unwrapField<{ data: Song }[]>(res, 'list') || []
      return list.map((item) => item.data)
    }
  )

  const { data: playlists, isLoading: playlistLoading } = useSWR<Playlist[]>(
    isLoggedIn && tab === 'playlists' && !!profile?.userId ? 'user-playlists' : null,
    async () => {
      const uid = profile?.userId
      if (!uid) return []
      const res = await ncmApi.userPlaylist(uid, 50)
      return unwrapField<Playlist[]>(res, 'playlist') || []
    }
  )

  const handleCreatePlaylist = useCallback(() => {
    if (!isLoggedIn) {
      toast.error('请先登录')
      return
    }
    toast.info('歌单创建功能即将上线')
  }, [isLoggedIn])

  const handleRefreshPlaylists = useCallback(() => {
    void swrMutate('user-playlists')
  }, [])

  const { data: cloudSongs, isLoading: cloudLoading } = useSWR<Song[]>(
    isLoggedIn && tab === 'cloud' ? 'cloud-songs' : null,
    async () => {
      const res = await ncmApi.userCloud(100)
      const list = unwrapField<{ simpleSong: Song }[]>(res, 'list') || []
      return list.map((item) => item.simpleSong)
    }
  )

  if (!isLoggedIn) return null

  return (
    <AppShell>
      <div
        data-testid="my-page"
        className="min-h-full p-4 md:p-6"
        style={backgroundStyle}
      >
        {profile && <ProfileHeader user={profile} />}

        <Tabs
          value={tab}
          onValueChange={(v) => router.push(`/my?tab=${v}`)}
          className="mt-6"
        >
          <TabsList className="glass-subtle mb-6">
            <TabsTrigger value="liked" className="data-[state=active]:bg-[var(--bg-hover)]">
              <Heart className="w-4 h-4 mr-1" aria-hidden="true" />喜欢
            </TabsTrigger>
            <TabsTrigger value="local-history" className="data-[state=active]:bg-[var(--bg-hover)]">
              <Clock className="w-4 h-4 mr-1" aria-hidden="true" />本地历史
            </TabsTrigger>
            <TabsTrigger value="recent" className="data-[state=active]:bg-[var(--bg-hover)]">
              <Clock className="w-4 h-4 mr-1" aria-hidden="true" />最近
            </TabsTrigger>
            <TabsTrigger value="playlists" className="data-[state=active]:bg-[var(--bg-hover)]">
              <ListMusic className="w-4 h-4 mr-1" aria-hidden="true" />歌单
            </TabsTrigger>
            <TabsTrigger value="cloud" className="data-[state=active]:bg-[var(--bg-hover)]">
              <Cloud className="w-4 h-4 mr-1" aria-hidden="true" />云盘
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liked">
            {likedLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : likedSongs && likedSongs.length > 0 ? (
              <SongTable songs={likedSongs} onPlayAll={() => playQueue(likedSongs, 0)} />
            ) : (
              <p className="text-center text-[var(--text-tertiary)] py-12">暂无喜欢的音乐</p>
            )}
          </TabsContent>

          <TabsContent value="local-history">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-[var(--text-tertiary)]">
                本地记录最近播放的 {history.length} 首歌曲
              </span>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('确定清空播放历史？')) clearHistory()
                  }}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                >
                  清空历史
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-center text-[var(--text-tertiary)] py-12">
                暂无播放历史<br />
                <span className="text-xs">播放歌曲后将自动记录</span>
              </p>
            ) : (
              <SongTable
                songs={history.map((h) => h.song)}
                onPlayAll={() => playQueue(history.map((h) => h.song), 0)}
              />
            )}
          </TabsContent>

          <TabsContent value="recent">
            {recentLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : recentSongs && recentSongs.length > 0 ? (
              <SongTable songs={recentSongs} onPlayAll={() => playQueue(recentSongs, 0)} />
            ) : (
              <p className="text-center text-[var(--text-tertiary)] py-12">暂无最近播放</p>
            )}
          </TabsContent>

          <TabsContent value="playlists">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--text-tertiary)]">
                共 {playlists?.length ?? 0} 个歌单
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshPlaylists}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                >
                  刷新
                </button>
                <button
                  type="button"
                  onClick={handleCreatePlaylist}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-black hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  新建歌单
                </button>
              </div>
            </div>
            {playlistLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : playlists && playlists.length > 0 ? (
              <PlaylistGrid playlists={playlists} ariaLabel="我的歌单" />
            ) : (
              <p className="text-center text-[var(--text-tertiary)] py-12">暂无歌单</p>
            )}
          </TabsContent>

          <TabsContent value="cloud">
            {cloudLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : cloudSongs && cloudSongs.length > 0 ? (
              <SongTable songs={cloudSongs} onPlayAll={() => playQueue(cloudSongs, 0)} />
            ) : (
              <p className="text-center text-[var(--text-tertiary)] py-12">暂无云盘音乐</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <PlayerBar />
      <PlayerOverlays />
    </AppShell>
  )
}

export default function MyPage() {
  return (
    <Suspense fallback={<div className="p-6">加载中...</div>}>
      <MyPageContent />
    </Suspense>
  )
}
