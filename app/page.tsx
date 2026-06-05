'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Banner } from '@/components/discover/Banner'
import { RecentPlayed } from '@/components/discover/RecentPlayed'
import { AppShell } from '@/components/layout/AppShell'

const BENTO_VIEWPORT_OPTIONS = { rootMargin: '0px 0px -25% 0px' } as const
const LazyBentoGrid = dynamic(
  () => import('@/components/discover/BentoGrid').then((module) => module.BentoGrid),
  { loading: () => <BentoGridPlaceholder /> }
)

const DEFAULT_GREETING = '欢迎回来'

function subscribeToGreeting() {
  return () => undefined
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return '早上好'
  if (hour >= 12 && hour < 18) return '下午好'
  return '晚上好'
}

function BentoGridPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="grid min-h-[636px] grid-cols-12 gap-3 md:min-h-[728px] md:gap-4 auto-rows-[150px] md:auto-rows-[170px]"
    >
      <div className="col-span-12 md:col-span-4 md:row-span-2 rounded-2xl bg-white/[0.04]" />
      <div className="col-span-6 md:col-span-4 rounded-2xl bg-white/[0.04]" />
      <div className="col-span-6 md:col-span-4 rounded-2xl bg-white/[0.04]" />
      <div className="col-span-12 md:col-span-4 md:row-span-2 rounded-2xl bg-white/[0.04]" />
      <div className="col-span-12 rounded-2xl bg-white/[0.04]" />
    </div>
  )
}

function useDeferredSection() {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [shouldMount, setShouldMount] = useState(false)
  const ref = useCallback((element: HTMLElement | null) => {
    setNode(element)
  }, [])

  useEffect(() => {
    if (shouldMount) return

    if (!node) return

    if (!('IntersectionObserver' in window)) {
      const fallbackTimer = setTimeout(() => setShouldMount(true), 0)
      return () => clearTimeout(fallbackTimer)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldMount(true)
          observer.disconnect()
        }
      },
      BENTO_VIEWPORT_OPTIONS
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [node, shouldMount])

  return [ref, shouldMount] as const
}

export default function HomePage() {
  const [bentoSectionRef, shouldMountBentoGrid] = useDeferredSection()
  const greeting = useSyncExternalStore(
    subscribeToGreeting,
    getGreeting,
    () => DEFAULT_GREETING
  )

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-10">
        {/* Greeting */}
        <section className="animate-fade-in pt-2">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
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
        <section
          ref={bentoSectionRef}
          className="section-enter"
          style={{ animationDelay: '0.2s' }}
        >
          {shouldMountBentoGrid ? <LazyBentoGrid /> : <BentoGridPlaceholder />}
        </section>
      </div>
    </AppShell>
  )
}
