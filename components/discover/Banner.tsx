'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react'
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

export function Banner() {
  const { data, isLoading, error, mutate } = useSWR(
    'banner',
    swrFetcher(async () => {
      const banners = await ncmApi.banner<BannerItem>(0)
      return banners
    })
  )

  const [current, setCurrent] = useState(0)
  const banners = data || []

  const next = useCallback(() => {
    if (banners.length === 0) return
    setCurrent((c) => (c + 1) % banners.length)
  }, [banners.length])

  const prev = useCallback(() => {
    if (banners.length === 0) return
    setCurrent((c) => (c - 1 + banners.length) % banners.length)
  }, [banners.length])

  // Auto-rotate
  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [banners.length, next])

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
            className="text-[var(--accent)] hover:bg-[var(--accent)]/10 gap-1.5"
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

  const banner = banners[current]

  return (
    <div className="relative w-full aspect-[3/1] md:aspect-[4/1] rounded-2xl overflow-hidden group shadow-lg">
      {/* Image with smooth crossfade */}
      {banners.map((b, i) => (
        <BlurImage
          key={`${b.targetId}-${b.targetType}-${i}`}
          src={b.imageUrl + '?param=1080y270'}
          alt={b.typeTitle}
          fill
          className="object-cover transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0 }}
          priority={i === current}
        />
      ))}

      {/* Dramatic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

      {/* Type badge */}
      <span
        className="absolute bottom-3 right-3 px-2.5 py-1 text-xs rounded-full font-medium shadow-md"
        style={{ backgroundColor: banner.titleColor || 'var(--accent)' }}
      >
        {banner.typeTitle}
      </span>

      {/* Navigation arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full backdrop-blur-sm"
        onClick={prev}
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full backdrop-blur-sm"
        onClick={next}
      >
        <ChevronRight className="w-5 h-5" />
      </Button>

      {/* Dots with accent color for active */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === current
                ? 'bg-[var(--accent)] w-6 shadow-[0_0_8px_var(--accent-glow)]'
                : 'bg-[var(--text-quaternary)] w-1.5 hover:bg-[var(--text-tertiary)]'
            }`}
            onClick={() => setCurrent(i)}
            aria-label={`切换到第 ${i + 1} 张`}
          />
        ))}
      </div>
    </div>
  )
}
