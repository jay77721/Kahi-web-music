'use client'

import { useEffect, useMemo, useCallback, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Heart, Play, Shuffle, RefreshCw, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SongTable } from '@/components/common/SongTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ncmApi, unwrapField } from '@/lib/api'
import { PlayerBar } from '@/components/player/PlayerBar'
import { PlayerOverlays } from '@/components/player/PlayerOverlays'
import { usePlayerStore } from '@/stores/playerStore'
import { useUserStore } from '@/stores/userStore'
import { useDominantColor } from '@/hooks/useDominantColor'
import { imageUrl } from '@/lib/format'
import type { Song } from '@/types/api'

const LIKED_BACKGROUND_STYLE: CSSProperties = {
  backgroundImage: `
    radial-gradient(ellipse at 20% 0%, oklch(0.36 0.08 350 / 0.32) 0%, transparent 55%),
    radial-gradient(ellipse at 80% 100%, oklch(0.30 0.06 320 / 0.22) 0%, transparent 55%),
    linear-gradient(180deg, #0a0a0a 0%, #110d10 50%, #0a0a0a 100%)
  `,
}

const MAX_SONGS_PER_FETCH = 100

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

export default function LikedPage() {
  const router = useRouter()
  const { isLoggedIn, profile } = useUserStore()
  const { playQueue, setPlayMode } = usePlayerStore()

  const sampledAvatar = profile ? imageUrl(profile.avatarUrl, 120) : null
  const { color } = useDominantColor(sampledAvatar, { timeoutMs: 4000 })

  const backgroundStyle = useMemo<CSSProperties>(() => {
    if (!color) return LIKED_BACKGROUND_STYLE
    return {
      backgroundImage: `
        radial-gradient(ellipse at 20% 0%, ${color.oklch.replace(')', ' / 0.32)')} 0%, transparent 55%),
        radial-gradient(ellipse at 80% 100%, ${color.oklch.replace(')', ' / 0.22)')} 0%, transparent 55%),
        linear-gradient(180deg, #0a0a0a 0%, #110d10 50%, #0a0a0a 100%)
      `,
      transition: 'background-image 600ms ease-out',
    }
  }, [color])

  useEffect(() => {
    if (!isLoggedIn) router.push('/login')
  }, [isLoggedIn, router])

  const { data, isLoading, error, mutate } = useSWR<Song[]>(
    isLoggedIn && profile?.userId ? 'liked-songs' : null,
    async () => {
      const uid = profile?.userId
      if (!uid) return []
      const ids = unwrapField<number[]>(await ncmApi.likelist(uid), 'ids') || []
      if (ids.length === 0) return []
      const detail = await ncmApi.songDetail(ids.slice(0, MAX_SONGS_PER_FETCH).join(','))
      return unwrapField<Song[]>(detail, 'songs') || []
    }
  )

  const handlePlayAll = useCallback(() => {
    if (!data || data.length === 0) return
    setPlayMode('sequential')
    playQueue(data, 0)
  }, [data, playQueue, setPlayMode])

  const handleShuffle = useCallback(() => {
    if (!data || data.length === 0) return
    setPlayMode('shuffle')
    playQueue(shuffle(data), 0)
  }, [data, playQueue, setPlayMode])

  if (!isLoggedIn) return null

  const total = data?.length ?? 0

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
              className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--accent)]/15"
              style={{ boxShadow: '0 0 18px var(--accent-glow)' }}
            >
              <Heart className="w-6 h-6 text-[var(--accent)]" aria-hidden="true" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
              我喜欢的音乐
            </h1>
          </div>
          <p className="text-sm text-[var(--text-tertiary)] ml-14">
            你收藏的所有歌曲
            {total > 0 && (
              <span className="ml-2">· 共 {total} 首</span>
            )}
          </p>
        </header>

        {total > 0 && (
          <div className="flex items-center gap-3 mb-6 ml-14">
            <Button
              size="sm"
              onClick={handlePlayAll}
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
              <Skeleton key={i} className="h-12 w-full rounded-lg bg-[#181818]" />
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
              onClick={() => void mutate()}
              className="text-[var(--accent)] hover:bg-[var(--bg-hover)]"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
              重试
            </Button>
          </div>
        ) : data && data.length > 0 ? (
          <SongTable
            songs={data}
            onPlayAll={handlePlayAll}
            animated={false}
          />
        ) : (
          <div
            data-testid="liked-empty"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mb-4 border border-white/[0.06]">
              <Heart className="w-10 h-10 text-white/30" aria-hidden="true" />
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mb-1">还没有收藏的歌曲</p>
            <p className="text-xs text-[var(--text-tertiary)] opacity-70">
              在歌曲菜单中点击「收藏」即可添加到这里
            </p>
          </div>
        )}
      </section>
      <PlayerBar />
      <PlayerOverlays />
    </AppShell>
  )
}
