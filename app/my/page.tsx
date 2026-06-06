'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useRequireSession } from '@/hooks/useRequireSession'
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

interface AuthenticatedMyPageProps {
  profile: UserProfile | null
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

const AuthenticatedMyPage = dynamic<AuthenticatedMyPageProps>(
  async () => {
    const [
      navigationModule,
      swrModule,
      sonnerModule,
      layoutModule,
      songTableModule,
      playlistGridModule,
      skeletonModule,
      tabsModule,
      apiModule,
      adaptersModule,
      songDetailsModule,
      profileHeaderModule,
      playerStoreModule,
      historyStoreModule,
      dominantColorModule,
      formatModule,
      iconsModule,
    ] = await Promise.all([
      import('next/navigation'),
      import('swr'),
      import('sonner'),
      import('@/components/layout/AppShell'),
      import('@/components/common/SongTable'),
      import('@/components/playlist/PlaylistGrid'),
      import('@/components/ui/skeleton'),
      import('@/components/ui/tabs'),
      import('@/lib/api'),
      import('@/lib/api-adapters'),
      import('@/lib/song-details'),
      import('@/components/user/ProfileHeader'),
      import('@/stores/playerStore'),
      import('@/stores/historyStore'),
      import('@/hooks/useDominantColor'),
      import('@/lib/format'),
      import('@/components/icons/ProtectedPageIcons'),
    ])

    const { useRouter, useSearchParams } = navigationModule
    const useSWR = swrModule.default
    const { mutate: swrMutate } = swrModule
    const { toast } = sonnerModule
    const { AppShell } = layoutModule
    const { SongTable } = songTableModule
    const { PlaylistGrid } = playlistGridModule
    const { Skeleton } = skeletonModule
    const { Tabs, TabsList, TabsTrigger, TabsContent } = tabsModule
    const { ncmApi } = apiModule
    const {
      normalizeIdList,
      normalizePlaylistList,
      normalizeSongList,
    } = adaptersModule
    const { fetchSongDetailsByIds } = songDetailsModule
    const { ProfileHeader } = profileHeaderModule
    const { usePlayerStore } = playerStoreModule
    const { useHistoryStore } = historyStoreModule
    const { useDominantColor } = dominantColorModule
    const { imageUrl } = formatModule
    const { Heart, Clock, Cloud, ListMusic, Plus } = iconsModule

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

    function AuthenticatedMyContent({ profile }: AuthenticatedMyPageProps) {
      const router = useRouter()
      const searchParams = useSearchParams()
      const tab = searchParams.get('tab') || 'liked'
      const playQueue = usePlayerStore((state) => state.playQueue)
      const { history, clear: clearHistory } = useHistoryStore()
      const historySongs = useMemo(() => history.map((item) => item.song), [history])

      const sampledAvatar = profile ? imageUrl(profile.avatarUrl, 120) : null
      const { color } = useDominantColor(sampledAvatar, { timeoutMs: 4000 })
      const backgroundStyle = useMemo(() => buildBgStyle(color), [color])

      const { data: likedSongs, isLoading: likedLoading } = useSWR<Song[]>(
        tab === 'liked' && !!profile?.userId ? 'likelist' : null,
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
        tab === 'recent' ? 'recent-songs' : null,
        async () => {
          return normalizeSongList(await ncmApi.recordRecentSong(50))
        }
      )

      const { data: playlists, isLoading: playlistLoading } = useSWR<Playlist[]>(
        tab === 'playlists' && !!profile?.userId ? 'user-playlists' : null,
        async () => {
          const uid = profile?.userId
          if (!uid) return []
          const res = await ncmApi.userPlaylist(uid, 50)
          return normalizePlaylistList(res)
        }
      )

      const handleCreatePlaylist = useCallback(() => {
        toast.info('歌单创建功能即将上线')
      }, [])

      const handleRefreshPlaylists = useCallback(() => {
        void swrMutate('user-playlists')
      }, [])

      const { data: cloudSongs, isLoading: cloudLoading } = useSWR<Song[]>(
        tab === 'cloud' ? 'cloud-songs' : null,
        async () => {
          return normalizeSongList(await ncmApi.userCloud(100))
        }
      )

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

    return AuthenticatedMyContent
  },
  { loading: () => <MyRouteGate testId="my-content-loading" /> }
)

function MyRouteGate({ testId }: { testId: string }) {
  return (
    <main
      data-testid={testId}
      aria-busy="true"
      className="min-h-dvh bg-[var(--bg-primary)] px-3 py-4 text-[var(--text-primary)] md:p-6"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div data-slot="skeleton" className="h-24 w-full max-w-xl rounded-xl bg-[var(--bg-elevated)]" />
        <div className="mt-4 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              data-slot="skeleton"
              className="h-9 w-20 shrink-0 rounded-lg bg-[var(--bg-elevated)]"
            />
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              data-slot="skeleton"
              className="h-12 w-full rounded-lg bg-[var(--bg-elevated)]"
            />
          ))}
        </div>
      </div>
    </main>
  )
}

export default function MyPage() {
  const { isLoggedIn, profile, isRestoringSession } = useRequireSession()

  if (isRestoringSession) {
    return <MyRouteGate testId="my-session-loading" />
  }

  if (!isLoggedIn) {
    return <MyRouteGate testId="my-auth-gate" />
  }

  return (
    <Suspense fallback={<MyRouteGate testId="my-content-loading" />}>
      <AuthenticatedMyPage profile={profile} />
    </Suspense>
  )
}
