'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import useSWR from 'swr'
import { ncmApi } from '@/lib/api'
import { usePlayerStore } from '@/stores/playerStore'
import { imageUrl } from '@/lib/format'
import type { Song } from '@/types/song'

const RANKING_IDS = [
  { id: 19723756, name: '飙升榜' },
  { id: 3779629, name: '新歌榜' },
  { id: 2884035, name: '热歌榜' },
]

export function RankingPreview() {
  const { data, isLoading } = useSWR('rankings-preview', async () => {
    const results = await Promise.all(
      RANKING_IDS.map(async (r) => {
        const data = await ncmApi.topList(r.id)
        return {
          ...r,
          tracks: (data as { playlist?: { tracks?: Song[] } } | undefined)?.playlist?.tracks || [],
          coverUrl: (data as { playlist?: { coverImgUrl?: string } } | undefined)?.playlist?.coverImgUrl || '',
        }
      })
    )
    return results
  })

  const { playSong } = usePlayerStore()

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-6 w-32 mb-4 bg-[var(--bg-elevated)]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-[var(--bg-elevated)]" />
          ))}
        </div>
      </div>
    )
  }

  const rankings = data || []

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
        {rankings.map((ranking) => (
          <div
            key={ranking.id}
            className="bg-[var(--bg-elevated)] rounded-xl overflow-hidden border border-white/5 hover:bg-[var(--bg-overlay)] transition-all duration-200 shadow-md group"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[var(--text-primary)] text-sm">{ranking.name}</h3>
                <Link
                  href={`/leaderboard?id=${ranking.id}`}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors duration-200"
                >
                  查看全部
                </Link>
              </div>
              <div className="space-y-1">
                {ranking.tracks.map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all duration-200 group/song"
                    onClick={() => playSong(song)}
                  >
                    <span className={`w-5 text-center text-sm font-bold ${
                      index < 3
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-tertiary)]'
                    }`}>
                      {index + 1}
                    </span>
                    {song.al?.picUrl && (
                      <Image
                        src={imageUrl(song.al.picUrl, 80)}
                        alt="Album cover"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium text-[var(--text-primary)] group-hover/song:text-[var(--accent)] transition-colors duration-200">{song.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {song.ar?.map(a => a.name).join(' / ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
