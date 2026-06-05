'use client'

import { useCallback, useMemo, useState } from 'react'
import { SongTable } from '@/components/common/SongTable'
import { Button } from '@/components/ui/button'
import type { NormalizedLeaderboardDetail } from '@/lib/api-adapters'
import { usePlayerStore } from '@/stores/playerStore'

const INITIAL_TRACK_LIMIT = 12
const FULL_TRACK_LIMIT = 50
const EMPTY_TRACKS: NormalizedLeaderboardDetail['tracks'] = []

interface LeaderboardDetailPanelProps {
  chartId: number
  detail: NormalizedLeaderboardDetail
}

export function LeaderboardDetailPanel({ chartId, detail }: LeaderboardDetailPanelProps) {
  const [expandedChartId, setExpandedChartId] = useState<number | null>(null)
  const playQueue = usePlayerStore((state) => state.playQueue)

  const tracks = detail.tracks ?? EMPTY_TRACKS
  const displayLimit = expandedChartId === chartId ? FULL_TRACK_LIMIT : INITIAL_TRACK_LIMIT
  const visibleTracks = useMemo(() => tracks.slice(0, displayLimit), [tracks, displayLimit])
  const cappedTrackCount = Math.min(tracks.length, FULL_TRACK_LIMIT)
  const canExpandTracks = visibleTracks.length < cappedTrackCount

  const handlePlayVisibleTracks = useCallback(() => {
    if (visibleTracks.length > 0) {
      playQueue(visibleTracks, 0)
    }
  }, [playQueue, visibleTracks])

  return (
    <div data-testid="leaderboard-detail">
      <div className="mb-3 min-w-0">
        <h2 className="truncate text-lg font-bold text-[var(--text-primary)] md:text-xl">
          {detail.name}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          已显示 {visibleTracks.length}/{cappedTrackCount} 首 · 共 {tracks.length} 首
        </p>
      </div>
      <SongTable
        songs={visibleTracks}
        showArtwork={false}
        showActions={false}
        animated={false}
        onPlayAll={handlePlayVisibleTracks}
      />
      {canExpandTracks ? (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="leaderboard-load-full"
            onClick={() => setExpandedChartId(chartId)}
            className="rounded-lg px-4 text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            加载完整前 {FULL_TRACK_LIMIT} 首
          </Button>
        </div>
      ) : null}
    </div>
  )
}
