'use client'

import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/skeleton'
import { LeaderboardChartCards } from '@/components/leaderboard/LeaderboardChartCards'
import { LeaderboardTabs, type LeaderboardTabItem } from '@/components/leaderboard/LeaderboardTabs'
import { ncmApi } from '@/lib/api'
import {
  normalizeLeaderboardDetail,
  normalizeLeaderboardList,
  type NormalizedLeaderboardDetail,
  type NormalizedLeaderboardItem,
} from '@/lib/api-adapters'

// Four official charts. IDs are the canonical NCM chart IDs.
const OFFICIAL_CHARTS: LeaderboardTabItem<number>[] = [
  { id: 3779629, label: '新歌榜' },
  { id: 2884035, label: '热歌榜' },
  { id: 19723756, label: '飙升榜' },
  { id: 60131, label: '原创榜' },
]
const LEADERBOARD_SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 5 * 60 * 1000,
} as const
type LeaderboardDetailKey = readonly ['leaderboard-detail', number]

const LazyLeaderboardDetailPanel = lazy(() =>
  import('@/components/leaderboard/LeaderboardDetailPanel').then((module) => ({
    default: module.LeaderboardDetailPanel,
  }))
)

function parseChartId(raw: string | null): number | null {
  if (!raw) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LeaderboardPageFallback />}>
      <LeaderboardPageContent />
    </Suspense>
  )
}

function LeaderboardPageContent() {
  const searchParams = useSearchParams()
  const chartIdFromUrl = parseChartId(searchParams.get('id'))
  const [selectedId, setSelectedId] = useState<number | null>(chartIdFromUrl)
  const [requestedDetailId, setRequestedDetailId] = useState<number | null>(chartIdFromUrl)

  const { data: toplist } = useSWR<NormalizedLeaderboardItem[]>(
    'toplist',
    async () => normalizeLeaderboardList(await ncmApi.toplist()),
    LEADERBOARD_SWR_OPTIONS
  )

  const detailKey = useMemo<LeaderboardDetailKey | null>(
    () => (requestedDetailId == null ? null : (['leaderboard-detail', requestedDetailId] as const)),
    [requestedDetailId]
  )

  const { data: detail, isLoading: detailLoading } = useSWR<NormalizedLeaderboardDetail | null>(
    detailKey,
    async ([, id]: LeaderboardDetailKey) => {
      const result = await ncmApi.topList(id)
      return normalizeLeaderboardDetail(result)
    },
    LEADERBOARD_SWR_OPTIONS
  )

  // Build the cards shown above the tab strip. When the toplist is loaded we
  // fall back to our canonical chart set so the user always sees 4 official
  // chips, with the live data taking precedence.
  const chartCards: LeaderboardTabItem<number>[] = useMemo(
    () =>
      toplist && toplist.length > 0
        ? toplist.slice(0, 4).map((chart) => ({ id: chart.id, label: chart.name }))
        : OFFICIAL_CHARTS,
    [toplist]
  )

  const handleSelectChart = useCallback((id: number) => {
    setSelectedId(id)
    setRequestedDetailId(id)
  }, [])

  return (
    <AppShell>
      <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
        {/* Hero header */}
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2">
            Charts
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
            排行榜
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-xl">
            网易云音乐四大官方榜单，每日更新 · 看看当下最热门的 50 首歌曲。
          </p>
        </header>

        {/* 4 chart cards */}
        <LeaderboardChartCards
          items={chartCards}
          activeId={selectedId}
          onSelect={handleSelectChart}
          className="mb-5"
        />

        {/* Tab strip */}
        <LeaderboardTabs
          items={chartCards}
          activeId={selectedId}
          onChange={handleSelectChart}
          className="mb-4"
        />

        {/* Detail section */}
        <section aria-label="榜单详情" className="mt-2">
          {requestedDetailId == null ? (
            <LeaderboardSelectionPrompt items={chartCards} onSelect={handleSelectChart} />
          ) : detailLoading ? (
            <div className="space-y-2" data-testid="leaderboard-loading">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : detail ? (
            <Suspense fallback={<LeaderboardDetailMountFallback />}>
              <LazyLeaderboardDetailPanel
                key={requestedDetailId}
                chartId={requestedDetailId}
                detail={detail}
              />
            </Suspense>
          ) : (
            <EmptyState message="该榜单暂无数据" />
          )}
        </section>
      </div>
    </AppShell>
  )
}

function LeaderboardPageFallback() {
  return (
    <AppShell>
      <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-36 rounded-lg mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2" data-testid="leaderboard-loading">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </AppShell>
  )
}

function LeaderboardDetailMountFallback() {
  return (
    <div className="space-y-2" data-testid="leaderboard-detail-mounting">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

function LeaderboardSelectionPrompt({
  items,
  onSelect,
}: {
  items: ReadonlyArray<LeaderboardTabItem<number>>
  onSelect: (id: number) => void
}) {
  const quickItems = items.slice(0, 4)

  return (
    <div
      className="border-y border-white/5 py-6 md:flex md:items-center md:justify-between md:gap-6"
      data-testid="leaderboard-empty"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">先选择一个榜单</p>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">歌曲详情会在这里展开。</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:justify-end">
        {quickItems.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`leaderboard-empty-cta-${item.id}`}
            onClick={() => onSelect(item.id)}
            className="rounded-md border border-white/5 bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-white/10 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ message = '选择一个排行榜' }: { message?: string }) {
  return (
    <div
      className="text-center text-[var(--text-tertiary)] py-16 text-sm"
      data-testid="leaderboard-empty"
    >
      {message}
    </div>
  )
}
