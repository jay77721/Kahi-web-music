'use client'

import { useState, useEffect, useCallback, type SyntheticEvent } from 'react'
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useSWR from 'swr'
import { ncmApi } from '@/lib/api'
import { swrFetcher } from '@/lib/swr'
import { BlurImage } from '@/components/common/BlurImage'

interface BannerItem {
  imageUrl: string
  targetId: number
  targetType: number
  typeTitle: string
  titleColor?: string
}

const PAUSE_TOGGLE_SELECTOR = '[data-banner-pause-toggle="true"]'
const BANNER_ROTATE_MS = 5000

function isPauseToggleEvent(event: SyntheticEvent<HTMLElement>): boolean {
  return event.target instanceof Element && event.target.closest(PAUSE_TOGGLE_SELECTOR) !== null
}

export function Banner() {
  const { data, isLoading, error, mutate } = useSWR(
    'banner',
    swrFetcher(async () => {
      const banners = await ncmApi.banner<BannerItem>(0)
      return banners
    })
  )

  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isTabVisible, setIsTabVisible] = useState(true)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const banners = data || []
  const activeIndex = banners.length > 0 ? Math.min(current, banners.length - 1) : 0

  const next = useCallback(() => {
    if (banners.length === 0) return
    setCurrent(() => (activeIndex + 1) % banners.length)
  }, [activeIndex, banners.length])

  const prev = useCallback(() => {
    if (banners.length === 0) return
    setCurrent(() => (activeIndex - 1 + banners.length) % banners.length)
  }, [activeIndex, banners.length])

  useEffect(() => {
    if (!window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updateMotionPreference()
    mediaQuery.addEventListener('change', updateMotionPreference)
    return () => mediaQuery.removeEventListener('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    const updateVisibility = () => setIsTabVisible(document.visibilityState === 'visible')

    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  useEffect(() => {
    if (banners.length <= 1 || isPaused || prefersReducedMotion || !isTabVisible) return
    const timer = setInterval(next, BANNER_ROTATE_MS)
    return () => clearInterval(timer)
  }, [banners.length, isPaused, isTabVisible, next, prefersReducedMotion])

  if (isLoading) {
    return <Skeleton className="w-full aspect-[3/1] md:aspect-[4/1] rounded-2xl" />
  }

  if (error) {
    return (
      <div className="w-full aspect-[3/1] md:aspect-[4/1] rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">轮播加载失败</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--accent-text)] hover:bg-[var(--accent)]/10 gap-1.5"
            onClick={() => mutate()}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (banners.length === 0) {
    return (
      <div className="w-full aspect-[3/1] md:aspect-[4/1] rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center">
        <span className="text-sm text-[var(--text-tertiary)]">暂无推荐内容</span>
      </div>
    )
  }

  const banner = banners[activeIndex]

  const pauseForCarouselInteraction = (event: SyntheticEvent<HTMLDivElement>) => {
    if (isPauseToggleEvent(event)) return
    setIsPaused(true)
  }

  return (
    <div
      className="relative w-full aspect-[3/1] md:aspect-[4/1] rounded-2xl overflow-hidden group shadow-lg"
      onFocus={pauseForCarouselInteraction}
      onPointerDown={pauseForCarouselInteraction}
    >
      <BlurImage
        key={`${banner.targetId}-${banner.targetType}-${activeIndex}`}
        src={`${banner.imageUrl}?param=1080y270`}
        alt={banner.typeTitle}
        fill
        className="object-cover animate-fade-in"
        priority
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

      <span
        className="absolute bottom-3 right-3 px-2.5 py-1 text-xs rounded-full font-medium shadow-md"
        style={{ backgroundColor: banner.titleColor || 'var(--accent)' }}
      >
        {banner.typeTitle}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-300 rounded-full backdrop-blur-sm"
        onClick={prev}
        aria-label="上一张推荐"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-300 rounded-full backdrop-blur-sm"
        onClick={next}
        aria-label="下一张推荐"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        data-banner-pause-toggle="true"
        className="absolute right-3 top-3 w-9 h-9 bg-black/40 hover:bg-black/60 text-white group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-all duration-300 rounded-full backdrop-blur-sm"
        onPointerDown={(event) => event.stopPropagation()}
        onFocus={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          setIsPaused((paused) => !paused)
        }}
        aria-label={isPaused ? '恢复自动轮播' : '暂停自动轮播'}
        aria-pressed={isPaused}
      >
        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </Button>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {banners.map((_, i) => (
          <button
            key={i}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
            onClick={() => {
              setIsPaused(true)
              setCurrent(i)
            }}
            aria-label={`切换到第 ${i + 1} 张`}
            aria-current={i === activeIndex ? 'true' : undefined}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === activeIndex
                  ? 'bg-[var(--accent)] w-6 shadow-[0_0_8px_var(--accent-glow)]'
                  : 'bg-[var(--text-quaternary)] w-1.5 hover:bg-[var(--text-tertiary)]'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
