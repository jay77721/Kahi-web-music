'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Play } from 'lucide-react'
import useSWR from 'swr'
import { ncmApi } from '@/lib/api'
import { formatCount, imageUrl } from '@/lib/format'

interface RecommendPlaylist {
  id: number
  name: string
  picUrl: string
  playCount: number
}

export function RecommendGrid() {
  const { data, isLoading } = useSWR('personalized', async () => {
    const result = await ncmApi.personalized(12)
    return (result as { result?: RecommendPlaylist[] } | undefined)?.result || []
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[120px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-xl bg-[var(--bg-elevated)] shadow-md ${
              i === 0
                ? 'col-span-2 row-span-2'
                : i === 1 || i === 4
                  ? 'col-span-2'
                  : i === 2 || i === 5
                    ? 'row-span-2'
                    : ''
            }`}
          />
        ))}
      </div>
    )
  }

  const playlists = data || []

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 stagger-children auto-rows-[120px]">
      {playlists.map((pl, index) => {
        const isFeatured = index === 0
        const isWide = index === 1 || index === 4
        const isTall = index === 2 || index === 5

        let cardClassName = 'relative rounded-xl overflow-hidden bg-[var(--bg-elevated)] shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-1'
        const imageClassName = 'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
        let contentClassName = 'p-4 flex flex-col justify-end'

        if (isFeatured) {
          cardClassName += ' col-span-2 row-span-2'
          contentClassName = 'p-5 flex flex-col justify-end'
        } else if (isWide) {
          cardClassName += ' col-span-2'
        } else if (isTall) {
          cardClassName += ' row-span-2'
        }

        return (
          <Link key={pl.id} href={`/playlist/${pl.id}`} className="group">
            <div className={cardClassName}>
              <Image
                src={imageUrl(pl.picUrl, isFeatured ? 400 : 200)}
                alt={pl.name}
                width={isFeatured ? 400 : 200}
                height={isFeatured ? 400 : 200}
                className={imageClassName}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className={contentClassName}>
                <p className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors duration-200">
                  {pl.name}
                </p>
                {isFeatured && (
                  <p className="text-xs text-white/70 mt-1 line-clamp-2">
                    根据你的口味精选
                  </p>
                )}
              </div>
              {/* Play count badge */}
              <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-white/90 bg-black/50 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                <Play className="w-2.5 h-2.5" fill="currentColor" />
                {formatCount(pl.playCount)}
              </span>
              {/* Hover play button */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:scale-110 hover:shadow-[0_8px_32px_rgba(30,215,96,0.4)]">
                  <Play className="w-4 h-4 text-black ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
