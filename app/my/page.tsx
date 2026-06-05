'use client'

import { useEffect, useMemo, useCallback, type CSSProperties, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { SongTable } from '@/components/common/SongTable'
import { PlaylistGrid } from '@/components/playlist/PlaylistGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ncmApi } from '@/lib/api'
import {
  normalizeIdList,
  normalizePlaylistList,
  normalizeSongList,
} from '@/lib/api-adapters'
import { fetchSongDetailsByIds } from '@/lib/song-details'
import { ProfileHeader } from '@/components/user/ProfileHeader'
import { usePlayerStore } from '@/stores/playerStore'
import { useUserStore } from '@/stores/userStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useDominantColor } from '@/hooks/useDominantColor'
import { imageUrl } from '@/lib/format'
import { mutate as swrMutate } from 'swr'
import { Heart, Clock, Cloud, ListMusic, Plus } from 'lucide-react'
import type { Song } from '@/types/api'
import type { Playlist } from '@/types/playlist'
import type { UserProfile } from '@/types/user'
import type { DominantColor } from '@/lib/color'

const FALLBACK_BG_OKLCH = 'oklch(0.18 0 0)'
const PAGE_SHELL_CLASS = 'min-h-full px-3 pb-4 pt-2 md:p-6'
const PROFILE_HEADER_CLASS = 'max-md:!rounded-xl max-md:!p-3 max-md:[&_>div]:!gap-3 max-md:[&_dd]:!text-sm max-md:[&_dl]:!gap-2 max-md:[&_dl]:!pt-1 max-md:[&_h1]:!text-xl max-md:[&_img]:!size-20'
const TAB_PANEL_CLASS = 'min-h-0 flex-none'
const TAB_TRIGGER_CLASS = '!flex-none shrink-0 data-active:bg-[var(--bg-hover)]'
const LOADING_SKELETON_CLASS = 'h-36 w-full md:h-64'
const EMPTY_STATE_CLASS = 'text-center text-[var(--text-tertiary)] py-6 md:py-12'

type UserStoreSnapshot = {
  isLoggedIn: boolean
  profile: UserProfile | null
  hasRestoredSession?: boolean
}

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

function MyPageFrame({
  children,
  backgroundStyle,
  testId = 'my-page',
}: {
  children: ReactNode
  backgroundStyle: CSSProperties
  testId?: string
}) {
  return (
    <AppShell>
      <div
        data-testid={testId}
        className={PAGE_SHELL_CLASS}
        style={backgroundStyle}
      >
        {children}
      </div>
    </AppShell>
  )
}

function SessionPlaceholder({ backgroundStyle }: { backgroundStyle: CSSProperties }) {
  return (
    <MyPageFrame backgroundStyle={backgroundStyle} testId="my-page-placeholder">
      <div
        role="status"
        aria-label="Loading profile"
        className="glass-subtle w-full max-w-sm rounded-xl p-3 md:p-4"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-28 bg-white/10" />
            <Skeleton className="h-2.5 w-20 bg-white/10" />
          </div>
        </div>
      </div>
    </MyPageFrame>
  )
}

function SongListTab({
  songs,
  isLoading,
  emptyMessage,
  onPlayAll,
}: {
  songs: Song[] | undefined
  isLoading: boolean
  emptyMessage: string
  onPlayAll: (songs: Song[]) => void
}) {
  if (isLoading) {
    return <Skeleton className={LOADING_SKELETON_CLASS} />
  }

  if (songs && songs.length > 0) {
    return <SongTable songs={songs} onPlayAll={() => onPlayAll(songs)} />
  }

  return <p className={EMPTY_STATE_CLASS}>{emptyMessage}</p>
}

function MyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'liked'
  const { isLoggedIn, profile, hasRestoredSession = true } =
    useUserStore() as UserStoreSnapshot
  const { playQueue } = usePlayerStore()
  const { history, clear: clearHistory } = useHistoryStore()
  const historySongs = useMemo(() => history.map((item) => item.song), [history])

  const sampledAvatar = profile ? imageUrl(profile.avatarUrl, 120) : null
  const { color } = useDominantColor(sampledAvatar, { timeoutMs: 4000 })
  const backgroundStyle = useMemo(() => buildBgStyle(color), [color])

  useEffect(() => {
    if (hasRestoredSession && !isLoggedIn) router.replace('/login')
  }, [hasRestoredSession, isLoggedIn, router])

  const { data: likedSongs, isLoading: likedLoading } = useSWR<Song[]>(
    isLoggedIn && tab === 'liked' && !!profile?.userId ? 'likelist' : null,
    async () => {
      const uid = profile?.userId
      if (!uid) return []
      const res = await ncmApi.likelist(uid)
      const ids = normalizeIdList(res)
      if (ids.length === 0) return []
      return fetchSongDetailsByIds(ids)
    }
  )

  const { data: recentSongs, isLoading: recentLoading } = useSWR<Song[]>(
    isLoggedIn && tab === 'recent' ? 'recent-songs' : null,
    async () => {
      return normalizeSongList(await ncmApi.recordRecentSong(50))
    }
  )

  const { data: playlists, isLoading: playlistLoading } = useSWR<Playlist[]>(
    isLoggedIn && tab === 'playlists' && !!profile?.userId ? 'user-playlists' : null,
    async () => {
      const uid = profile?.userId
      if (!uid) return []
      const res = await ncmApi.userPlaylist(uid, 50)
      return normalizePlaylistList(res)
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
      return normalizeSongList(await ncmApi.userCloud(100))
    }
  )

  if (!isLoggedIn && !hasRestoredSession) {
    return <SessionPlaceholder backgroundStyle={backgroundStyle} />
  }

  if (!isLoggedIn) return null

  return (
    <MyPageFrame backgroundStyle={backgroundStyle}>
      {profile && <ProfileHeader user={profile} className={PROFILE_HEADER_CLASS} />}

      <Tabs
        value={tab}
        onValueChange={(v) => router.push(`/my?tab=${v}`)}
        className="mt-4 md:mt-6"
      >
        <div className="-mx-2 mb-4 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:mb-6 md:px-0">
          <TabsList className="glass-subtle min-w-max justify-start">
            <TabsTrigger value="liked" className={TAB_TRIGGER_CLASS}>
              <Heart className="w-4 h-4 mr-1" aria-hidden="true" />喜欢
            </TabsTrigger>
            <TabsTrigger value="local-history" className={TAB_TRIGGER_CLASS}>
              <Clock className="w-4 h-4 mr-1" aria-hidden="true" />本地历史
            </TabsTrigger>
            <TabsTrigger value="recent" className={TAB_TRIGGER_CLASS}>
              <Clock className="w-4 h-4 mr-1" aria-hidden="true" />最近
            </TabsTrigger>
            <TabsTrigger value="playlists" className={TAB_TRIGGER_CLASS}>
              <ListMusic className="w-4 h-4 mr-1" aria-hidden="true" />歌单
            </TabsTrigger>
            <TabsTrigger value="cloud" className={TAB_TRIGGER_CLASS}>
              <Cloud className="w-4 h-4 mr-1" aria-hidden="true" />云盘
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="liked" className={TAB_PANEL_CLASS}>
          <SongListTab
            songs={likedSongs}
            isLoading={likedLoading}
            emptyMessage="暂无喜欢的音乐"
            onPlayAll={(songs) => playQueue(songs, 0)}
          />
        </TabsContent>

        <TabsContent value="local-history" className={TAB_PANEL_CLASS}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">
              本地记录最近播放的 {historySongs.length} 首歌曲
            </span>
            {historySongs.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('确定清空播放历史？')) clearHistory()
                }}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-text)] transition-colors"
              >
                清空历史
              </button>
            )}
          </div>
          {historySongs.length === 0 ? (
            <p className={EMPTY_STATE_CLASS}>
              暂无播放历史<br />
              <span className="text-xs">播放歌曲后将自动记录</span>
            </p>
          ) : (
            <SongTable
              songs={historySongs}
              onPlayAll={() => playQueue(historySongs, 0)}
            />
          )}
        </TabsContent>

        <TabsContent value="recent" className={TAB_PANEL_CLASS}>
          <SongListTab
            songs={recentSongs}
            isLoading={recentLoading}
            emptyMessage="暂无最近播放"
            onPlayAll={(songs) => playQueue(songs, 0)}
          />
        </TabsContent>

          <TabsContent value="playlists" className={TAB_PANEL_CLASS}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--text-tertiary)]">
                共 {playlists?.length ?? 0} 个歌单
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshPlaylists}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-text)] transition-colors"
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
              <Skeleton className={LOADING_SKELETON_CLASS} />
            ) : playlists && playlists.length > 0 ? (
              <PlaylistGrid playlists={playlists} ariaLabel="我的歌单" />
            ) : (
              <p className={EMPTY_STATE_CLASS}>暂无歌单</p>
            )}
          </TabsContent>

          <TabsContent value="cloud" className={TAB_PANEL_CLASS}>
            <SongListTab
              songs={cloudSongs}
              isLoading={cloudLoading}
              emptyMessage="暂无云盘音乐"
              onPlayAll={(songs) => playQueue(songs, 0)}
            />
          </TabsContent>
        </Tabs>
    </MyPageFrame>
  )
}

export default function MyPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6">加载中...</div></AppShell>}>
      <MyPageContent />
    </Suspense>
  )
}
