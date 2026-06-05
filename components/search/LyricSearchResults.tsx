'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Disc3, Music } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ncmApi } from '@/lib/api'
import {
  normalizeSearchResult,
  type NormalizedSearchResult,
} from '@/lib/api-adapters'
import { usePlayerStore } from '@/stores/playerStore'
import { SearchEmptyState } from '@/components/search/SearchEmptyState'
import { cn } from '@/lib/utils'
import { parseLRC } from '@/lib/lrc'
import type { Song, LyricSearchResult, LyricSearchSong } from '@/types/api'

interface LyricSearchResultsProps {
  query: string
}

const FRAGMENT_CONTEXT_CHARS = 30
const LYRIC_SEARCH_SWR_OPTIONS = {
  revalidateOnFocus: false,
  keepPreviousData: false,
} as const

export function LyricSearchResults({ query }: LyricSearchResultsProps) {
  const playSong = usePlayerStore((state) => state.playSong)
  const trimmedQuery = query.trim()
  const swrKey = trimmedQuery ? `lyric-search:${trimmedQuery}` : null

  const { data, isLoading } = useSWR<NormalizedSearchResult>(
    swrKey,
    async () => normalizeSearchResult(await ncmApi.searchLyric(trimmedQuery, 30)),
    LYRIC_SEARCH_SWR_OPTIONS
  )
  const result = useMemo<NormalizedSearchResult>(() => data ?? normalizeSearchResult(null), [data])

  const items = useMemo<LyricSearchResult[]>(() => {
    const songs: LyricSearchSong[] = result.songs ?? []
    if (songs.length === 0) return []

    return songs.map((s) => ({
      id: s.id,
      name: s.name,
      artists: s.ar ?? [],
      album: s.al ?? { id: 0, name: '', picUrl: '' },
      lyric: s.lyric ?? '',
    }))
  }, [result])

  if (isLoading) {
    return <LyricSearchSkeleton />
  }

  if (items.length === 0) {
    return <SearchEmptyState query={trimmedQuery} type="lyrics" />
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <LyricSearchItem
          key={item.id}
          item={item}
          query={trimmedQuery}
          index={index}
          onPlay={() => playSong(toSong(item))}
        />
      ))}
    </div>
  )
}

function LyricSearchItem({
  item,
  query,
  index,
  onPlay,
}: {
  item: LyricSearchResult
  query: string
  index: number
  onPlay: () => void
}) {
  const fragments = useMemo(() => extractFragments(item.lyric, query), [item.lyric, query])
  const artistNames = item.artists.map((a) => a.name).join(' / ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group rounded-xl border border-white/5 bg-[var(--bg-surface)]/60 backdrop-blur-sm p-4',
        'hover:border-[var(--accent)]/30 hover:bg-[var(--bg-surface)]/80 transition-colors'
      )}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onPlay}
          aria-label={`播放 ${item.name}`}
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--accent)]/30 to-[var(--accent)]/10',
            'flex items-center justify-center text-[var(--accent)]',
            'hover:scale-105 active:scale-95 transition-transform'
          )}
        >
          <Music className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
              <HighlightedText text={item.name} query={query} />
            </h3>
            <span className="text-sm text-[var(--text-tertiary)] truncate">
              <HighlightedText text={artistNames} query={query} />
            </span>
            <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 truncate">
              <Disc3 className="w-3 h-3" aria-hidden="true" />
              <HighlightedText text={item.album.name} query={query} />
            </span>
          </div>

          {fragments.length > 0 ? (
            <ul className="space-y-1 mt-2">
              {fragments.map((line, i) => (
                <li
                  key={i}
                  className="text-sm text-[var(--text-secondary)] leading-relaxed"
                >
                  <HighlightedText text={line} query={query} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--text-tertiary)] mt-2 italic">未找到匹配的歌词片段</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return <>{text}</>

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  const lowerQuery = trimmedQuery.toLocaleLowerCase()

  return (
    <>
      {parts.map((part, i) =>
        part.toLocaleLowerCase() === lowerQuery ? (
          <mark
            key={i}
            className="bg-[var(--accent)]/25 text-[var(--accent-text)] rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function extractFragments(lyric: string, query: string): string[] {
  const trimmedQuery = query.trim()
  if (!lyric || !trimmedQuery) return []
  const lines = parseLRC(lyric).map((l) => l.text).filter(Boolean)
  if (lines.length === 0) return []

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escaped, 'i')
  const matches = lines.filter((line) => regex.test(line))

  return matches
    .slice(0, 2)
    .map((line) => clipAround(line, trimmedQuery, FRAGMENT_CONTEXT_CHARS))
}

function clipAround(text: string, query: string, radius: number): string {
  const idx = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase())
  if (idx < 0) {
    return text.length > radius * 2 ? `${text.slice(0, radius * 2)}…` : text
  }
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + query.length + radius)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return `${prefix}${text.slice(start, end)}${suffix}`
}

function toSong(item: LyricSearchResult): Song {
  return {
    id: item.id,
    name: item.name,
    ar: item.artists,
    al: item.album,
    publishTime: 0,
    noCopyrightRcmd: null,
    mv: 0,
  }
}

function LyricSearchSkeleton() {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-label="正在加载歌词搜索结果"
      data-testid="lyric-search-loading"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/5 bg-[var(--bg-surface)]/60 p-4 flex items-start gap-4"
        >
          <Skeleton className="w-12 h-12 rounded-lg bg-[var(--bg-surface)]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded bg-[var(--bg-surface)]" />
            <Skeleton className="h-3 w-2/3 rounded bg-[var(--bg-surface)]" />
            <Skeleton className="h-3 w-1/2 rounded bg-[var(--bg-surface)]" />
          </div>
        </div>
      ))}
    </div>
  )
}
