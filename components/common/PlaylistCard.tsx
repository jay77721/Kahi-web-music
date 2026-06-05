'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
import { formatCount, imageUrl } from '@/lib/format'
import { BlurImage } from '@/components/common/BlurImage'

interface PlaylistCardProps {
  id: number
  name: string
  coverUrl: string
  playCount?: number
  className?: string
}

export function PlaylistCard({ id, name, coverUrl, playCount, className }: PlaylistCardProps) {
  return (
    <Link href={`/playlist/${id}`} className={`group cursor-pointer hover-lift ${className || ''}`}>
      <div className="relative aspect-square rounded-xl overflow-hidden mb-2 border border-transparent transition-all duration-300 group-hover:border-[var(--accent)]/30 group-hover:shadow-[0_0_16px_var(--accent-glow)]">
        <BlurImage
          src={imageUrl(coverUrl, 200)}
          alt={name}
          width={200}
          height={200}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
        />
        {playCount !== undefined && playCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[10px] text-[var(--text-primary)] glass px-1.5 py-0.5 rounded-full">
            <Play className="w-2.5 h-2.5" />
            {formatCount(playCount)}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-11 h-11 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-[0_0_24px_var(--accent-glow)] transition-transform duration-300 group-hover:scale-110">
            <Play className="w-5 h-5 text-[var(--text-inverse)] ml-0.5" />
          </div>
        </div>
      </div>
      <p className="text-sm text-[var(--text-secondary)] line-clamp-2 group-hover:text-[var(--text-primary)] transition-colors duration-300">
        {name}
      </p>
    </Link>
  )
}
