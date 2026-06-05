'use client'

import dynamic from 'next/dynamic'
import { useCallback } from 'react'
import { useRequireSession } from '@/hooks/useRequireSession'
import type { Song } from '@/types/song'

interface FMMainPlayerProps {
  song: Song | null | undefined
  isLoading?: boolean
  hasError?: boolean
  onDislike: (id: number) => void
  onNext: () => void
  onRetry?: () => void
  className?: string
}

const LazyFMMainPlayer = dynamic<FMMainPlayerProps>(
  () => import('@/components/fm/FMMainPlayer').then((mod) => mod.FMMainPlayer),
  { loading: () => <FMPlayerSkeleton /> }
)

const AuthenticatedFMPage = dynamic(
  async () => {
    const [
      swrModule,
      layoutModule,
      buttonModule,
      apiModule,
      adaptersModule,
      iconsModule,
    ] = await Promise.all([
      import('swr'),
      import('@/components/layout/AppShell'),
      import('@/components/ui/button'),
      import('@/lib/api'),
      import('@/lib/api-adapters'),
      import('lucide-react'),
    ])

    const useSWR = swrModule.default
    const { AppShell } = layoutModule
    const { Button } = buttonModule
    const { ncmApi } = apiModule
    const { normalizeSongList } = adaptersModule
    const { Radio } = iconsModule

    function AuthenticatedFMContent() {
      const { data: fmSongs, mutate, error } = useSWR<Song[]>(
        'personal-fm',
        async (): Promise<Song[]> => normalizeSongList(await ncmApi.personalFm())
      )

      const handleAdvance = useCallback(
        async (id: number) => {
          try {
            await ncmApi.fmTrash(id)
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'FM advance failed'
            if (typeof console !== 'undefined') {
              console.error(message)
            }
          }
          void mutate()
        },
        [mutate]
      )

      const handleNext = useCallback(() => {
        void mutate()
      }, [mutate])

      const current = fmSongs?.[0] ?? null
      const isInitialLoading = !fmSongs && !error

      return (
        <AppShell>
          <div className="flex flex-col w-full" data-testid="fm-page">
            <header className="flex items-center gap-2 px-6 pt-6 pb-2">
              <Radio className="w-4 h-4 text-[var(--accent)]" aria-hidden />
              <h1 className="text-sm uppercase tracking-[0.18em] text-[var(--text-tertiary)] font-medium">
                私人 FM
              </h1>
            </header>

            {error ? (
              <FMErrorState Button={Button} onRetry={() => void mutate()} />
            ) : isInitialLoading || !current ? (
              <FMPlayerSkeleton />
            ) : (
              <LazyFMMainPlayer
                song={current}
                onDislike={handleAdvance}
                onNext={handleNext}
                onRetry={() => void mutate()}
              />
            )}
          </div>
        </AppShell>
      )
    }

    return AuthenticatedFMContent
  },
  { loading: () => <FMRouteGate testId="fm-content-loading" /> }
)

function FMRouteGate({ testId }: { testId: string }) {
  return (
    <main
      className="flex min-h-dvh w-full flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]"
      data-testid={testId}
      aria-busy="true"
    >
      <header className="flex items-center gap-2 px-6 pt-6 pb-2">
        <div className="h-4 w-4 rounded-full bg-[var(--bg-elevated)]" data-slot="skeleton" />
        <div className="h-4 w-28 rounded-md bg-[var(--bg-elevated)]" data-slot="skeleton" />
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <div
          className="aspect-square w-full max-w-[360px] rounded-full bg-muted"
          data-slot="skeleton"
          data-testid={`${testId}-cover`}
        />
      </div>
    </main>
  )
}

function FMPlayerSkeleton() {
  return (
    <div
      className="flex flex-col items-center w-full p-6 dynamic-bg"
      data-testid="fm-skeleton"
      aria-busy="true"
    >
      <div
        className="aspect-square w-full max-w-[280px] rounded-full bg-muted sm:max-w-[360px]"
        data-slot="skeleton"
        data-testid="fm-skeleton-cover"
      />
      <div className="h-7 w-64 mt-8 rounded-md bg-muted" data-slot="skeleton" data-testid="fm-skeleton-title" />
      <div className="h-4 w-40 mt-3 rounded-md bg-muted" data-slot="skeleton" data-testid="fm-skeleton-artist" />
      <div className="h-2 w-full max-w-md mt-10 rounded-full bg-muted" data-slot="skeleton" data-testid="fm-skeleton-progress" />
      <div className="w-full max-w-md mt-6 flex items-center justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-12 h-12 rounded-full bg-muted" data-slot="skeleton" />
        ))}
      </div>
    </div>
  )
}

function FMErrorState({
  Button,
  onRetry,
}: {
  Button: typeof import('@/components/ui/button').Button
  onRetry: () => void
}) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"
      data-testid="fm-error"
    >
      <p className="text-base text-[var(--text-tertiary)] mb-4">FM 加载失败，请稍后重试</p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="border-[var(--border-light)] text-[var(--text-primary)]"
        data-testid="fm-retry"
      >
        重试
      </Button>
    </div>
  )
}

export default function FMPage() {
  const { isLoggedIn, isRestoringSession } = useRequireSession()

  if (isRestoringSession) {
    return <FMRouteGate testId="fm-session-loading" />
  }

  if (!isLoggedIn) {
    return <FMRouteGate testId="fm-auth-gate" />
  }

  return <AuthenticatedFMPage />
}
