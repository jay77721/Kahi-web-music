'use client'

import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Header } from './Header'
import { PlayerBar } from '@/components/player/PlayerBar'
import { PlayerOverlays } from '@/components/player/PlayerOverlays'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useUIStore } from '@/stores/uiStore'
import { usePlayerStore } from '@/stores/playerStore'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile()
  const setIsMobile = useUIStore((state) => state.setIsMobile)
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null)
  const hasCurrentTrack = currentTrackId !== null

  useEffect(() => {
    setIsMobile(isMobile)
  }, [isMobile, setIsMobile])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Sidebar (PC only) */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <Header />

        {/* Content */}
        <main
          id="main-content"
          className={cn(
            'flex-1 overflow-y-auto',
            isMobile && hasCurrentTrack && 'pb-32',
            isMobile && !hasCurrentTrack && 'pb-16',
            !isMobile && hasCurrentTrack && 'pb-24',
            !isMobile && !hasCurrentTrack && 'pb-4'
          )}
        >
          {children}
        </main>
      </div>

      <PlayerBar />
      <PlayerOverlays />

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav />}
    </div>
  )
}
