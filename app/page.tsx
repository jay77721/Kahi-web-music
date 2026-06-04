'use client'

import { useMemo } from 'react'
import { Banner } from '@/components/discover/Banner'
import { BentoGrid } from '@/components/discover/BentoGrid'
import { RecentPlayed } from '@/components/discover/RecentPlayed'
import { PlayerBar } from '@/components/player/PlayerBar'
import { PlayerOverlays } from '@/components/player/PlayerOverlays'
import { AppShell } from '@/components/layout/AppShell'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return '早上好'
  if (hour >= 12 && hour < 18) return '下午好'
  return '晚上好'
}

export default function HomePage() {
  const greeting = useMemo(() => getGreeting(), [])

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-10">
        {/* Greeting */}
        <section className="animate-fade-in pt-2">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
            {greeting}
          </h1>
        </section>

        {/* Recent Played */}
        <section className="section-enter" style={{ animationDelay: '0.05s' }}>
          <RecentPlayed />
        </section>

        {/* Hero Banner Carousel */}
        <section className="section-enter" style={{ animationDelay: '0.1s' }}>
          <Banner />
        </section>

        {/* Bento Discover Grid */}
        <section className="section-enter" style={{ animationDelay: '0.2s' }}>
          <BentoGrid />
        </section>
      </div>
      <PlayerBar />
      <PlayerOverlays />
    </AppShell>
  )
}
