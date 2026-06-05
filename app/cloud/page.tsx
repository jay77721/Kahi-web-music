'use client'

import dynamic from 'next/dynamic'
import { useMemo, type CSSProperties } from 'react'
import { useRequireSession } from '@/hooks/useRequireSession'
import type { Song } from '@/types/api'
import type { UserProfile } from '@/types/user'

const CLOUD_BACKGROUND_STYLE: CSSProperties = {
  backgroundImage: `
    radial-gradient(ellipse at 15% 0%, oklch(0.32 0.05 240 / 0.32) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 100%, oklch(0.28 0.04 200 / 0.22) 0%, transparent 55%),
    linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)
  `,
}

interface AuthenticatedCloudPageProps {
  profile: UserProfile | null
}

interface LazySongTableProps {
  songs: Song[]
  onPlayAll?: () => void
}

const LazySongTable = dynamic<LazySongTableProps>(
  () => import('@/components/common/SongTable').then((mod) => mod.SongTable),
  { loading: () => <CloudRowsLoading testId="cloud-song-table-loading" /> }
)

const AuthenticatedCloudPage = dynamic<AuthenticatedCloudPageProps>(
  async () => {
    const [
      swrModule,
      layoutModule,
      skeletonModule,
      buttonModule,
      apiModule,
      adaptersModule,
      playerStoreModule,
      dominantColorModule,
      formatModule,
      iconsModule,
    ] = await Promise.all([
      import('swr'),
      import('@/components/layout/AppShell'),
      import('@/components/ui/skeleton'),
      import('@/components/ui/button'),
      import('@/lib/api'),
      import('@/lib/api-adapters'),
      import('@/stores/playerStore'),
      import('@/hooks/useDominantColor'),
      import('@/lib/format'),
      import('@/components/icons/ProtectedPageIcons'),
    ])

    const useSWR = swrModule.default
    const { AppShell } = layoutModule
    const { Skeleton } = skeletonModule
    const { Button } = buttonModule
    const { ncmApi } = apiModule
    const { normalizeSongList } = adaptersModule
    const { usePlayerStore } = playerStoreModule
    const { useDominantColor } = dominantColorModule
    const { imageUrl } = formatModule
    const { Cloud, RefreshCw, AlertCircle } = iconsModule

    function getErrorMessage(error: unknown): string {
      if (error instanceof Error) return error.message
      return '加载云盘失败，请稍后重试'
    }

    function AuthenticatedCloudContent({ profile }: AuthenticatedCloudPageProps) {
      const { playQueue } = usePlayerStore()
      const sampledAvatar = profile ? imageUrl(profile.avatarUrl, 120) : null
      const { color } = useDominantColor(sampledAvatar, { timeoutMs: 4000 })
      const backgroundStyle = useMemo<CSSProperties>(() => {
        if (!color) return CLOUD_BACKGROUND_STYLE
        return {
          backgroundImage: `
            radial-gradient(ellipse at 20% 0%, ${color.oklch.replace(')', ' / 0.3)')} 0%, transparent 55%),
            radial-gradient(ellipse at 80% 100%, ${color.oklch.replace(')', ' / 0.2)')} 0%, transparent 55%),
            linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)
          `,
          transition: 'background-image 600ms ease-out',
        }
      }, [color])

      const { data, isLoading, error, mutate } = useSWR<Song[]>(
        'cloud-songs',
        async () => normalizeSongList(await ncmApi.userCloud(100))
      )

      const songs = data ?? []
      const total = songs.length

      return (
        <AppShell>
          <section
            data-testid="cloud-page"
            className="min-h-full p-4 md:p-6"
            style={backgroundStyle}
          >
            <header className="mb-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-11 h-11 rounded-2xl flex shrink-0 items-center justify-center bg-[var(--accent)]/15"
                  style={{ boxShadow: '0 0 18px var(--accent-glow)' }}
                >
                  <Cloud className="w-6 h-6 text-[var(--accent)]" aria-hidden="true" />
                </div>
                <h1 className="min-w-0 text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
                  云盘
                </h1>
              </div>
              <p className="text-sm text-[var(--text-tertiary)] sm:ml-14">
                在这里管理你上传的音乐
                {total > 0 && (
                  <span className="ml-2 text-[var(--text-tertiary)]">· 共 {total} 首</span>
                )}
              </p>
            </header>

            {isLoading ? (
              <div data-testid="cloud-loading" className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg bg-[var(--bg-elevated)]" />
                ))}
              </div>
            ) : error ? (
              <div
                data-testid="cloud-error"
                className="flex flex-col items-center justify-center py-16 text-center"
                role="alert"
              >
                <AlertCircle className="w-10 h-10 text-[var(--text-tertiary)] mb-3" aria-hidden="true" />
                <p className="text-sm text-[var(--text-tertiary)] mb-4">
                  {getErrorMessage(error)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void mutate()}
                  className="text-[var(--accent-text)] hover:bg-[var(--bg-hover)]"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  重试
                </Button>
              </div>
            ) : total > 0 ? (
              <LazySongTable songs={songs} onPlayAll={() => playQueue(songs, 0)} />
            ) : (
              <div
                data-testid="cloud-empty"
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div
                  className="w-20 h-20 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-4 border border-[var(--border)]"
                >
                  <Cloud className="w-10 h-10 text-[var(--text-quaternary)]" aria-hidden="true" />
                </div>
                <p className="text-sm text-[var(--text-tertiary)] mb-1">云盘空空如也</p>
                <p className="text-xs text-[var(--text-tertiary)] opacity-70">
                  上传你的第一首音乐，开始收藏吧
                </p>
              </div>
            )}
          </section>
        </AppShell>
      )
    }

    return AuthenticatedCloudContent
  },
  { loading: () => <CloudRouteGate testId="cloud-content-loading" /> }
)

function CloudRouteGate({ testId }: { testId: string }) {
  return (
    <main
      data-testid={testId}
      aria-busy="true"
      className="min-h-dvh bg-[var(--bg-primary)] p-4 text-[var(--text-primary)] md:p-6"
      style={CLOUD_BACKGROUND_STYLE}
    >
      <div className="mx-auto flex min-h-[52vh] w-full max-w-5xl flex-col justify-center">
        <div data-slot="skeleton" className="h-12 w-48 rounded-xl bg-[var(--bg-elevated)]" />
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

function CloudRowsLoading({ testId }: { testId: string }) {
  return (
    <div data-testid={testId} className="space-y-2" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} data-slot="skeleton" className="h-12 w-full rounded-lg bg-[var(--bg-elevated)]" />
      ))}
    </div>
  )
}

export default function CloudPage() {
  const { isLoggedIn, profile, isRestoringSession } = useRequireSession()

  if (isRestoringSession) {
    return <CloudRouteGate testId="cloud-session-loading" />
  }

  if (!isLoggedIn) {
    return <CloudRouteGate testId="cloud-auth-gate" />
  }

  return <AuthenticatedCloudPage profile={profile} />
}
