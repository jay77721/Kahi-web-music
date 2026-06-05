'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Play, RefreshCw } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SongTable } from '@/components/common/SongTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { DailyHero } from '@/components/discover/DailyHero'
import { ncmApi } from '@/lib/api'
import { normalizeSongList } from '@/lib/api-adapters'
import { usePlayerStore } from '@/stores/playerStore'
import { useUserStore } from '@/stores/userStore'
import type { Song } from '@/types/song'

const DAILY_LIMIT = 30

export default function DailyPage() {
  const router = useRouter()
  const { isLoggedIn } = useUserStore()
  const { playQueue } = usePlayerStore()

  const { data, isLoading, error, mutate } = useSWR<Song[]>(
    isLoggedIn ? 'recommend-songs' : null,
    async (): Promise<Song[]> => {
      return normalizeSongList(await ncmApi.recommendSongs())
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  )

  // Cap the visible list at 30 songs for the curated daily grid.
  const visibleSongs = useMemo<Song[]>(
    () => (data ?? []).slice(0, DAILY_LIMIT),
    [data]
  )

  useEffect(() => {
    if (!isLoggedIn) router.push('/login')
  }, [isLoggedIn, router])

  if (!isLoggedIn) return null

  return (
    <AppShell>
      <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
        <DailyHero />

        {/* Action bar */}
        <div className="flex items-center justify-between mt-6 mb-4">
          <p className="text-sm text-[var(--text-tertiary)]">
            {isLoading
              ? '正在加载推荐…'
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
