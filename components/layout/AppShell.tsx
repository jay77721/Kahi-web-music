'use client'

import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Header } from './Header'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useUIStore } from '@/stores/uiStore'
import { usePlayerStore } from '@/stores/playerStore'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile()
  const { setIsMobile } = useUIStore()
  const { currentTrack } = usePlayerStore()

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
            isMobile && currentTrack && 'pb-32',
            isMobile && !currentTrack && 'pb-16',
            !isMobile && 'pb-4'
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav />}
    </div>
  )
}
