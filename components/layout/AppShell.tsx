'use client'

import { lazy, Suspense, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Header } from './Header'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useUIStore } from '@/stores/uiStore'
import { usePlayerStore } from '@/stores/playerStore'
import { cn } from '@/lib/utils'

const PlayerBar = lazy(() =>
  import('@/components/player/PlayerBar').then((module) => ({ default: module.PlayerBar }))
)
const PlayerOverlays = lazy(() =>
  import('@/components/player/PlayerOverlays').then((module) => ({ default: module.PlayerOverlays }))
)

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile()
  const setIsMobile = useUIStore((state) => state.setIsMobile)
  const playQueueOpen = useUIStore((state) => state.playQueueOpen)
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null)
  const hasCurrentTrack = currentTrackId !== null
  const shouldMountPlayerBar = hasCurrentTrack && !isMobile
  const shouldMountPlayerOverlays = hasCurrentTrack || playQueueOpen

  useEffect(() => {
    setIsMobile(isMobile)
  }, [isMobile, setIsMobile])

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Sidebar (PC only) */}
      <Sidebar />

      {/* Main area */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <Header />

        {/* Content */}
        <main
          id="main-content"
          tabIndex={-1}
          aria-label="主内容"
          className={cn(
            'min-h-0 flex-1 overflow-y-auto scroll-p-4 focus:outline-none',
            hasCurrentTrack
              ? 'pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-24'
              : 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-4'
          )}
        >
          {children}
        </main>
      </div>

      {shouldMountPlayerBar && (
        <Suspense fallback={null}>
          <PlayerBar />
        </Suspense>
      )}
      {shouldMountPlayerOverlays && (
        <Suspense fallback={null}>
          <PlayerOverlays />
        </Suspense>
      )}

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
