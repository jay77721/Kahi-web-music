'use client'

import { CalendarDays, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DailyHeroProps {
  date?: Date
  title?: string
  subtitle?: string
  className?: string
}

const DEFAULT_TITLE = '每日推荐'
const DEFAULT_SUBTITLE = '为今日精心挑选 · 30 首契合你口味的新歌'

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
  return `${year} 年 ${month} 月 ${day} 日 · 星期${weekday}`
}

/**
 * Hero card for the daily recommendations page.
 * Shows the current date (defaults to `new Date()`) and a title block.
 */
export function DailyHero({
  date,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  className,
}: DailyHeroProps) {
  const target = date ?? new Date()
  const isoDate = target.toISOString().slice(0, 10)
  const dateLabel = formatDate(target)

  return (
    <section
      data-testid="daily-hero"
      data-iso-date={isoDate}
      aria-labelledby="daily-hero-title"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/5',
        'bg-gradient-to-br from-[var(--bg-elevated)] via-[var(--bg-surface)] to-[var(--bg-secondary)]',
        'p-6 md:p-8 shadow-lg',
        className
      )}
    >
      {/* Decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] font-medium">
          <CalendarDays className="w-3.5 h-3.5" aria-hidden />
          <time dateTime={isoDate} data-testid="daily-hero-date">
            {dateLabel}
          </time>
        </div>

        <h1
          id="daily-hero-title"
          className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2"
        >
          {title}
          <Sparkles className="w-5 h-5 text-[var(--accent)]" aria-hidden />
        </h1>

        <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-xl">
          {subtitle}
        </p>
      </div>
    </section>
  )
}
