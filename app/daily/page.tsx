'use client'

import dynamic from 'next/dynamic'
import { useRequireSession } from '@/hooks/useRequireSession'
import type { Song } from '@/types/song'

const DAILY_LIMIT = 30

const AuthenticatedDailyPage = dynamic(
  async () => {
    const [
      swrModule,
      iconsModule,
      layoutModule,
      songTableModule,
      skeletonModule,
      buttonModule,
      dailyHeroModule,
      apiModule,
      adaptersModule,
      playerStoreModule,
    ] = await Promise.all([
      import('swr'),
      import('lucide-react'),
      import('@/components/layout/AppShell'),
      import('@/components/common/SongTable'),
      import('@/components/ui/skeleton'),
      import('@/components/ui/button'),
      import('@/components/discover/DailyHero'),
      import('@/lib/api'),
      import('@/lib/api-adapters'),
      import('@/stores/playerStore'),
    ])

    const useSWR = swrModule.default
    const { Play, RefreshCw } = iconsModule
    const { AppShell } = layoutModule
    const { SongTable } = songTableModule
    const { Skeleton } = skeletonModule
    const { Button } = buttonModule
    const { DailyHero } = dailyHeroModule
    const { ncmApi } = apiModule
    const { normalizeSongList } = adaptersModule
    const { usePlayerStore } = playerStoreModule

    function AuthenticatedDailyContent() {
      const { playQueue } = usePlayerStore()

      const { data, isLoading, error, mutate } = useSWR<Song[]>(
        'recommend-songs',
        async (): Promise<Song[]> => {
          return normalizeSongList(await ncmApi.recommendSongs())
        },
        {
          revalidateOnFocus: false,
          dedupingInterval: 60_000,
        }
      )

      const visibleSongs = (data ?? []).slice(0, DAILY_LIMIT)

      return (
        <AppShell>
          <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
            <DailyHero />

            <div className="flex items-center justify-between mt-6 mb-4">
              <p className="text-sm text-[var(--text-tertiary)]">
                {isLoading
                  ? '正在加载推荐...'
                  : data
                    ? `已为你挑选 ${visibleSongs.length} 首`
                    : ''}
              </p>
              <div className="flex items-center gap-2">
                {data && data.length > 0 && (
                  <Button
                    size="sm"
                    data-testid="daily-play-all"
                    onClick={() => playQueue(visibleSongs, 0)}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-semibold rounded-full px-6 transition-all duration-200 hover:shadow-[0_0_20px_var(--accent-glow)]"
                  >
                    <Play className="w-4 h-4 mr-1.5 fill-current" aria-hidden />
                    全部播放
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="daily-refresh"
                  onClick={() => void mutate()}
                  aria-label="刷新推荐"
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2" data-testid="daily-loading">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <p
                className="text-center text-[var(--text-tertiary)] py-12 text-sm"
                data-testid="daily-error"
              >
                加载失败，请稍后重试
              </p>
            ) : visibleSongs.length > 0 ? (
              <SongTable
                songs={visibleSongs}
                onPlayAll={() => playQueue(visibleSongs, 0)}
              />
            ) : (
              <p
                className="text-center text-[var(--text-tertiary)] py-12 text-sm"
                data-testid="daily-empty"
              >
                暂无推荐
              </p>
            )}
          </div>
        </AppShell>
      )
    }

    return AuthenticatedDailyContent
  },
  { loading: () => <DailyRouteGate testId="daily-content-loading" /> }
)

function DailyRouteGate({ testId }: { testId: string }) {
  return (
    <main
      data-testid={testId}
      aria-busy="true"
      className="min-h-dvh bg-[var(--bg-primary)] px-4 py-6 text-[var(--text-primary)] md:px-6"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div data-slot="skeleton" className="h-40 w-full rounded-2xl bg-[var(--bg-elevated)]" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
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

export default function DailyPage() {
  const { isLoggedIn, isRestoringSession } = useRequireSession()

  if (isRestoringSession) {
    return <DailyRouteGate testId="daily-session-loading" />
  }

  if (!isLoggedIn) {
    return <DailyRouteGate testId="daily-auth-gate" />
  }

  return <AuthenticatedDailyPage />
}
