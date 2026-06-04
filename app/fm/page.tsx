'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { AppShell } from '@/components/layout/AppShell'
import { FMMainPlayer } from '@/components/fm/FMMainPlayer'
import { ncmApi } from '@/lib/api'
import { normalizeSongList } from '@/lib/api-adapters'
import { useUserStore } from '@/stores/userStore'
import { PlayerBar } from '@/components/player/PlayerBar'
import { PlayerOverlays } from '@/components/player/PlayerOverlays'
import { Radio } from 'lucide-react'
import type { Song } from '@/types/song'

/**
 * Personal FM page — renders an immersive single-track experience.
 * All heavy lifting (cover, controls, color, progress) lives in
 * `<FMMainPlayer />`; this page is a thin SWR + auth shell.
 */
export default function FMPage() {
  const router = useRouter()
  const { isLoggedIn } = useUserStore()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login')
    }
  }, [isLoggedIn, router])

  const { data: fmSongs, mutate, error } = useSWR<Song[]>(
    isLoggedIn ? 'personal-fm' : null,
    async (): Promise<Song[]> => {
      return normalizeSongList(await ncmApi.personalFm())
    }
  )

  const handleAdvance = useCallback(
    async (id: number) => {
      try {
        await ncmApi.fmTrash(id)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'FM advance failed'
        // Log to the console only — the UI does not block on this.
        if (typeof console !== 'undefined') {
          console.error(message)
        }
      }
      void mutate()
    },
    [mutate]
  )

  if (!isLoggedIn) return null

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

        <FMMainPlayer
          song={current}
          isLoading={isInitialLoading}
          hasError={Boolean(error)}
          onDislike={handleAdvance}
          onRetry={() => void mutate()}
        />
      </div>
      <PlayerBar />
      <PlayerOverlays />
    </AppShell>
  )
}
