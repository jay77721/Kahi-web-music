'use client'

import Link from 'next/link'
import { Play, ThumbsUp, Share2, Clock } from 'lucide-react'
import type { MV } from '@/types/mv'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MVInfoProps {
  mv: MV
  likedCount?: number
  shareCount?: number
  className?: string
}

function formatPublishTime(value: string | undefined): string {
  if (!value) return '—'
  const trimmed = value.trim()
  if (!trimmed) return '—'
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) {
    return trimmed.slice(0, 10).replace(/-/g, '.')
  }
  return trimmed
}

export function MVInfo({ mv, likedCount = 0, shareCount = 0, className }: MVInfoProps) {
  const playCount = mv.playCount ?? 0
  const artistId = mv.artistId
  const artistName = mv.artistName ?? '未知艺人'

  return (
    <aside
      className={cn(
        'glass rounded-2xl p-5 md:p-6 flex flex-col gap-4',
        'ring-1 ring-[var(--border)] shadow-[var(--shadow-md)]',
        className
      )}
      data-testid="mv-info"
    >
      <header className="space-y-1">
        <h1
          className="text-2xl md:text-3xl font-bold leading-tight tracking-tight"
          data-testid="mv-info-title"
        >
          {mv.name}
        </h1>
        {artistId !== undefined ? (
          <Link
            href={`/artist/${artistId}`}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-text)] transition-colors"
          >
            {artistName}
          </Link>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">{artistName}</p>
        )}
      </header>

      <dl className="grid grid-cols-3 gap-3" data-testid="mv-info-stats">
        <Stat icon={<Play className="w-3.5 h-3.5" />} label="播放" value={formatCount(playCount)} />
        <Stat icon={<ThumbsUp className="w-3.5 h-3.5" />} label="点赞" value={formatCount(likedCount)} />
        <Stat icon={<Share2 className="w-3.5 h-3.5" />} label="分享" value={formatCount(shareCount)} />
      </dl>

      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] pt-1 border-t border-[var(--border-subtle)]">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        <span>发布 · {formatPublishTime(mv.publishTime)}</span>
      </div>

      {mv.desc ? (
        <p
          className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line"
          data-testid="mv-info-desc"
        >
          {mv.desc}
        </p>
      ) : null}
    </aside>
  )
}

interface StatProps {
  icon: React.ReactNode
  label: string
  value: string
}

function Stat({ icon, label, value }: StatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-[var(--bg-hover)] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
        <span className="text-[var(--accent)]" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="text-base font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  )
}
