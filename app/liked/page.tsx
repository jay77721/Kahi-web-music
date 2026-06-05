'use client'

import { useMemo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import useSWR from 'swr'
import { Heart, Play, Shuffle, RefreshCw, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SongTable } from '@/components/common/SongTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useRequireSession } from '@/hooks/useRequireSession'
import { ncmApi } from '@/lib/api'
import { normalizeIdList } from '@/lib/api-adapters'
import { fetchSongDetailsByIds } from '@/lib/song-details'
import { usePlayerStore } from '@/stores/playerStore'
import { useDominantColor } from '@/hooks/useDominantColor'
import { imageUrl } from '@/lib/format'
import type { Song } from '@/types/api'

const LIKED_BACKGROUND_STYLE: CSSProperties = {
  backgroundImage: `
    radial-gradient(ellipse at 20% 0%, oklch(0.36 0.08 350 / 0.32) 0%, transparent 55%),
    radial-gradient(ellipse at 80% 100%, oklch(0.30 0.06 320 / 0.22) 0%, transparent 55%),
    linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)
  `,
}
const EMPTY_SONGS: Song[] = []
const EMPTY_IDS: number[] = []
const LIKED_PAGE_SIZE = 50

type LikedDetailState = {
  idsKey: string
  songs: Song[]
  loadedCount: number
  isLoading: boolean
  error: unknown
}

const EMPTY_DETAIL_STATE: LikedDetailState = {
  idsKey: '',
  songs: EMPTY_SONGS,
  loadedCount: 0,
  isLoading: false,
  error: null,
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return '加载喜欢的音乐失败，请稍后重试'
}

function shuffle<T>(input: ReadonlyArray<T>): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i] as T
    arr[i] = arr[j] as T
    arr[j] = tmp
  }
  return arr
}

function appendSongs(previous: readonly Song[], next: readonly Song[]): Song[] {
  return [...previous, ...next]
}

export default function LikedPage() {
  const { isLoggedIn, profile, isRestoringSession } = useRequireSession()
  const { playQueue, setPlayMode } = usePlayerStore()
  const [detailState, setDetailState] = useState<LikedDetailState>(EMPTY_DETAIL_STATE)
  const detailRequestRef = useRef(0)

  const sampledAvatar = profile ? imageUrl(profile.avatarUrl, 120) : null
  const { color } = useDominantColor(sampledAvatar, { timeoutMs: 4000 })

  const backgroundStyle = useMemo<CSSProperties>(() => {
    if (!color) return LIKED_BACKGROUND_STYLE
    return {
      backgroundImage: `
        radial-gradient(ellipse at 20% 0%, ${color.oklch.replace(')', ' / 0.32)')} 0%, transparent 55%),
        radial-gradient(ellipse at 80% 100%, ${color.oklch.replace(')', ' / 0.22)')} 0%, transparent 55%),
        linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)
      `,
      transition: 'background-image 600ms ease-out',
    }
  }, [color])

  const { data: likedIds, isLoading: isLoadingIds, error: idsError, mutate } = useSWR<number[]>(
    isLoggedIn && profile?.userId ? `liked-song-ids-${profile.userId}` : null,
    async () => {
      const uid = profile?.userId
      if (!uid) return []
      return normalizeIdList(await ncmApi.likelist(uid))
    }
  )
  const ids = likedIds ?? EMPTY_IDS
  const idsKey = useMemo(() => likedIds?.join(',') ?? '', [likedIds])
  const isDetailStateCurrent = detailState.idsKey === idsKey
  const songs = isDetailStateCurrent ? detailState.songs : EMPTY_SONGS
  const loadedCount = isDetailStateCurrent ? detailState.loadedCount : 0
  const isLoadingDetails = isDetailStateCurrent
    ? detailState.isLoading
    : Boolean(likedIds && ids.length > 0)
  const detailsError = isDetailStateCurrent ? detailState.error : null
  const total = ids.length
  const hasMore = loadedCount < total

  const loadDetailsPage = useCallback(
    async (startIndex: number, mode: 'replace' | 'append') => {
      if (ids.length === 0) return []

      const pageIds = ids.slice(startIndex, startIndex + LIKED_PAGE_SIZE)
      if (pageIds.length === 0) return []

      const requestId = detailRequestRef.current + 1
      detailRequestRef.current = requestId
      setDetailState((previous) => ({
        idsKey,
        songs: mode === 'append' && previous.idsKey === idsKey ? previous.songs : EMPTY_SONGS,
        loadedCount: mode === 'append' && previous.idsKey === idsKey ? previous.loadedCount : 0,
        isLoading: true,
        error: null,
      }))

      try {
        const pageSongs = await fetchSongDetailsByIds(pageIds, LIKED_PAGE_SIZE)
        if (detailRequestRef.current !== requestId) return []

        setDetailState((previous) => {
          const previousSongs =
            mode === 'append' && previous.idsKey === idsKey ? previous.songs : EMPTY_SONGS

          return {
            idsKey,
            songs: mode === 'replace' ? pageSongs : [...previousSongs, ...pageSongs],
            loadedCount: Math.min(startIndex + pageIds.length, ids.length),
            isLoading: false,
            error: null,
          }
        })
        return pageSongs
      } catch (error) {
        if (detailRequestRef.current === requestId) {
          setDetailState((previous) => ({
            idsKey,
            songs: previous.idsKey === idsKey ? previous.songs : EMPTY_SONGS,
            loadedCount: previous.idsKey === idsKey ? previous.loadedCount : 0,
            isLoading: false,
            error,
          }))
        }
        return []
      }
    },
    [ids, idsKey]
  )

  useEffect(() => {
    if (!likedIds || likedIds.length === 0) return

    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    const pageIds = likedIds.slice(0, LIKED_PAGE_SIZE)

    const loadInitialDetails = async () => {
      try {
        const pageSongs = await fetchSongDetailsByIds(pageIds, LIKED_PAGE_SIZE)
        if (detailRequestRef.current !== requestId) return

        setDetailState({
          idsKey,
          songs: pageSongs,
          loadedCount: Math.min(pageIds.length, likedIds.length),
          isLoading: false,
          error: null,
        })
      } catch (error) {
        if (detailRequestRef.current !== requestId) return

        setDetailState({
          idsKey,
          songs: EMPTY_SONGS,
          loadedCount: 0,
          isLoading: false,
          error,
        })
      }
    }

    void loadInitialDetails()
    return () => {
      detailRequestRef.current += 1
    }
  }, [idsKey, likedIds])

  const loadMore = useCallback(() => {
    if (isLoadingDetails || !hasMore) return
    void loadDetailsPage(loadedCount, 'append')
  }, [hasMore, isLoadingDetails, loadedCount, loadDetailsPage])

  const ensureAllSongsLoaded = useCallback(async () => {
    if (ids.length === 0) return EMPTY_SONGS
    if (loadedCount >= ids.length) return songs

    if (ids.slice(loadedCount).length === 0) return songs

    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setDetailState((previous) => ({
      idsKey,
      songs: previous.idsKey === idsKey ? previous.songs : songs,
      loadedCount: previous.idsKey === idsKey ? previous.loadedCount : loadedCount,
      isLoading: true,
      error: null,
    }))

    try {
      let nextSongs = songs
      for (let startIndex = loadedCount; startIndex < ids.length; startIndex += LIKED_PAGE_SIZE) {
        const pageIds = ids.slice(startIndex, startIndex + LIKED_PAGE_SIZE)
        const pageSongs = await fetchSongDetailsByIds(pageIds, LIKED_PAGE_SIZE)
        if (detailRequestRef.current !== requestId) return null

        nextSongs = appendSongs(nextSongs, pageSongs)
        const nextLoadedCount = Math.min(startIndex + pageIds.length, ids.length)
        setDetailState({
          idsKey,
          songs: nextSongs,
          loadedCount: nextLoadedCount,
          isLoading: nextLoadedCount < ids.length,
          error: null,
        })
      }
      return nextSongs
    } catch (error) {
      if (detailRequestRef.current === requestId) {
        setDetailState((previous) => ({
          idsKey,
          songs: previous.idsKey === idsKey ? previous.songs : songs,
          loadedCount: previous.idsKey === idsKey ? previous.loadedCount : loadedCount,
          isLoading: false,
          error,
        }))
      }
      return null
    }
  }, [ids, idsKey, loadedCount, songs])

  const handlePlayAll = useCallback(() => {
    if (isLoadingDetails) return
    void (async () => {
      const queue = await ensureAllSongsLoaded()
      if (!queue || queue.length === 0) return
      setPlayMode('sequential')
      playQueue(queue, 0)
    })()
  }, [ensureAllSongsLoaded, isLoadingDetails, playQueue, setPlayMode])

  const handleShuffle = useCallback(() => {
    if (isLoadingDetails) return
    void (async () => {
      const queue = await ensureAllSongsLoaded()
      if (!queue || queue.length === 0) return
      setPlayMode('shuffle')
      playQueue(shuffle(queue), 0)
    })()
  }, [ensureAllSongsLoaded, isLoadingDetails, playQueue, setPlayMode])

  const handleRetry = useCallback(() => {
    if (idsError) {
      void mutate()
      return
    }
    void loadDetailsPage(0, 'replace')
  }, [idsError, loadDetailsPage, mutate])

  const isInitialDetailsLoading = ids.length > 0 && songs.length === 0 && isLoadingDetails
  const isLoading = isLoadingIds || isInitialDetailsLoading
  const error = idsError ?? (songs.length === 0 ? detailsError : null)

  if (isRestoringSession) {
    return (
      <AppShell>
        <section
          data-testid="liked-session-loading"
          className="min-h-full p-4 md:p-6"
          style={backgroundStyle}
        >
          <Skeleton className="h-16 w-64 rounded-2xl" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg bg-[var(--bg-elevated)]" />
            ))}
          </div>
        </section>
      </AppShell>
    )
  }

  if (!isLoggedIn) return null

  return (
    <AppShell>
      <section
        data-testid="liked-page"
        className="min-h-full p-4 md:p-6"
        style={backgroundStyle}
      >
        <header className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-11 h-11 rounded-2xl flex shrink-0 items-center justify-center bg-[var(--accent)]/15"
              style={{ boxShadow: '0 0 18px var(--accent-glow)' }}
            >
              <Heart className="w-6 h-6 text-[var(--accent)]" aria-hidden="true" />
            </div>
            <h1 className="min-w-0 text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
              我喜欢的音乐
            </h1>
          </div>
          <p className="text-sm text-[var(--text-tertiary)] sm:ml-14">
            你收藏的所有歌曲
            {total > 0 && (
              <span className="ml-2">· 共 {total} 首</span>
            )}
          </p>
        </header>

        {total > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-6 sm:ml-14">
            <Button
              size="sm"
              onClick={handlePlayAll}
              disabled={isLoadingDetails}
              data-testid="liked-play-all"
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-semibold rounded-full px-6 py-2 transition-all duration-200 hover:shadow-[0_0_20px_var(--accent-glow)]"
            >
              <Play className="w-4 h-4 mr-1.5 fill-current" aria-hidden="true" />
              全部播放
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShuffle}
              disabled={isLoadingDetails}
              data-testid="liked-shuffle"
              className="text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-full px-5"
            >
              <Shuffle className="w-4 h-4 mr-1.5" aria-hidden="true" />
              随机播放
            </Button>
          </div>
        )}

        {isLoading ? (
          <div data-testid="liked-loading" className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg bg-[var(--bg-elevated)]" />
            ))}
          </div>
        ) : error ? (
          <div
            data-testid="liked-error"
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
              onClick={handleRetry}
              className="text-[var(--accent-text)] hover:bg-[var(--bg-hover)]"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
              重试
            </Button>
          </div>
        ) : total > 0 ? (
          <>
            <SongTable
              songs={songs}
              onPlayAll={handlePlayAll}
              animated={false}
            />
            {hasMore ? (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoadingDetails}
                  data-testid="liked-load-more"
                  className="rounded-full px-5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                >
                  {isLoadingDetails ? '加载中...' : `加载更多 (${songs.length}/${total})`}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div
            data-testid="liked-empty"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-4 border border-[var(--border)]">
              <Heart className="w-10 h-10 text-[var(--text-quaternary)]" aria-hidden="true" />
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mb-1">还没有收藏的歌曲</p>
            <p className="text-xs text-[var(--text-tertiary)] opacity-70">
              在歌曲菜单中点击「收藏」即可添加到这里
            </p>
          </div>
        )}
      </section>
    </AppShell>
  )
}
