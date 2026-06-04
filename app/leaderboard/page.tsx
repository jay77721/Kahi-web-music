'use client'

import { useEffect, useState, useRef } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import { Trophy, ListMusic, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SongTable } from '@/components/common/SongTable'
import { Skeleton } from '@/components/ui/skeleton'
import { LeaderboardTabs, type LeaderboardTabItem } from '@/components/leaderboard/LeaderboardTabs'
import { ncmApi } from '@/lib/api'
import { imageUrl } from '@/lib/format'
import { PlayerBar } from '@/components/player/PlayerBar'
import { PlayerOverlays } from '@/components/player/PlayerOverlays'
import { usePlayerStore } from '@/stores/playerStore'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/song'

interface ChartItem {
  id: number
  name: string
  coverImgUrl: string
}

interface ChartDetail {
  name: string
  coverImgUrl: string
  tracks: Song[]
}

// Four official charts. IDs are the canonical NCM chart IDs.
const OFFICIAL_CHARTS: LeaderboardTabItem<number>[] = [
  { id: 3779629, label: '新歌榜' },
  { id: 2884035, label: '热歌榜' },
  { id: 19723756, label: '飙升榜' },
  { id: 60131, label: '原创榜' },
]

export default function LeaderboardPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const { playQueue } = usePlayerStore()
  const selectedIdRef = useRef<number | null>(null)

  const { data: toplist } = useSWR<ChartItem[]>('toplist', async () => {
    const result = await ncmApi.toplist()
    const data = result as unknown as { list?: ChartItem[] }
    return data.list ?? []
  })

  const { data: detail, isLoading: detailLoading } = useSWR<ChartDetail | null>(
    selectedId ? `top-list-${selectedId}` : null,
    async () => {
      const result = await ncmApi.topList(selectedId as number)
      const data = result as unknown as { playlist?: ChartDetail }
      return data.playlist ?? null
    }
  )

  // Auto-select the first chart when the list loads.
  useEffect(() => {
    if (toplist && toplist.length > 0 && selectedId === null && !selectedIdRef.current) {
      const first = toplist[0]
      selectedIdRef.current = first.id
      setSelectedId(first.id)
    }
  }, [toplist, selectedId])

  // Build the cards shown above the tab strip. When the toplist is loaded we
  // fall back to our canonical chart set so the user always sees 4 official
  // chips, with the live data taking precedence.
  const chartCards: LeaderboardTabItem<number>[] = toplist && toplist.length > 0
    ? toplist.slice(0, 4).map((c) => ({ id: c.id, label: c.name, coverUrl: c.coverImgUrl }))
    : OFFICIAL_CHARTS

  const tracks = detail?.tracks ?? []
  const visibleTracks = tracks.slice(0, 50)

  return (
    <AppShell>
      <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
        {/* Hero header */}
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2">
            <Trophy className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden />
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
        <section
          aria-label="官方榜单"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          {chartCards.map((chart, index) => {
            const isActive = chart.id === selectedId
            return (
              <button
                key={chart.id}
                type="button"
                onClick={() => setSelectedId(chart.id)}
                data-testid={`chart-card-${chart.id}`}
                aria-pressed={isActive}
                className={cn(
                  'group relative overflow-hidden rounded-xl border text-left p-4',
                  'transition-all duration-200 hover:-translate-y-0.5',
                  isActive
                    ? 'border-[var(--accent)] bg-[var(--bg-accent-subtle)] shadow-[0_0_24px_rgba(30,215,96,0.18)]'
                    : 'border-white/5 bg-[var(--bg-elevated)] hover:border-white/10'
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold',
                      isActive
                        ? 'bg-[var(--accent)] text-black'
                        : 'bg-white/5 text-[var(--text-tertiary)]'
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-semibold truncate',
                        isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                      )}
                    >
                      {chart.label}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">官方榜</p>
                  </div>
                </div>

                {chart.coverUrl && (
                  <div className="mt-3 relative w-full aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={imageUrl(chart.coverUrl, 200)}
                      alt={chart.label}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}

                <ChevronRight
                  className={cn(
                    'absolute top-3 right-3 w-4 h-4 transition-transform duration-200',
                    isActive
                      ? 'text-[var(--accent)] translate-x-0.5'
                      : 'text-[var(--text-quaternary)] group-hover:translate-x-0.5'
                  )}
                  aria-hidden
                />
              </button>
            )
          })}
        </section>

        {/* Tab strip */}
        <LeaderboardTabs
          items={chartCards}
          activeId={selectedId}
          onChange={setSelectedId}
          className="mb-4"
        />

        {/* Detail section */}
        <section aria-label="榜单详情" className="mt-2">
          {detailLoading ? (
            <div className="space-y-2" data-testid="leaderboard-loading">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !selectedId ? (
            <EmptyState />
          ) : detail ? (
            <div data-testid="leaderboard-detail">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                  <Image
                    src={imageUrl(detail.coverImgUrl, 200)}
                    alt={detail.name}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold truncate">{detail.name}</h2>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
                    <ListMusic className="w-3.5 h-3.5" aria-hidden />
                    前 {visibleTracks.length} 首 · 共 {tracks.length} 首
                  </p>
                </div>
              </div>
              <SongTable
                songs={visibleTracks}
                onPlayAll={() => visibleTracks.length > 0 && playQueue(visibleTracks, 0)}
              />
            </div>
          ) : (
            <EmptyState message="该榜单暂无数据" />
          )}
        </section>
      </div>
      <PlayerBar />
      <PlayerOverlays />
    </AppShell>
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
