'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, CalendarClock, Play, Radio, UserRound } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ncmApi } from '@/lib/api'
import { normalizeDjProgramList } from '@/lib/api-adapters'
import { formatRelativeTime, imageUrl } from '@/lib/format'
import type { DjProgram } from '@/types/dj'

function getRouteId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function formatProgramDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export default function RadioDetailPage() {
  const params = useParams()
  const id = getRouteId(params?.id as string | string[] | undefined)
  const radioId = Number(id)
  const hasValidId = Number.isFinite(radioId) && radioId > 0

  const { data, isLoading, error } = useSWR<DjProgram[]>(
    hasValidId ? `djprogram-${radioId}` : null,
    async () => normalizeDjProgramList(await ncmApi.djprogram(radioId, 30))
  )

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-4 md:p-6" data-testid="radio-detail-loading">
          <Skeleton className="mb-6 h-28 w-full rounded-2xl" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  if (!hasValidId || error) {
    return (
      <AppShell>
        <div className="p-4 md:p-6" data-testid="radio-detail-error">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
            <Radio className="mx-auto mb-3 size-10 text-[var(--text-tertiary)]" aria-hidden="true" />
            <p className="mb-4 text-sm text-[var(--text-tertiary)]">电台不存在或加载失败</p>
            <Button variant="outline" size="sm" render={<Link href="/radio" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              返回电台
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const programs = data ?? []

  return (
    <AppShell>
      <div className="min-h-full p-4 md:p-6" data-testid="radio-detail-page">
        <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]">
          <Link
            href="/radio"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent-text)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            电台
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/15 shadow-[var(--shadow-glow)]">
                <Radio className="size-7 text-[var(--accent)]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Radio
                </p>
                <h1 className="truncate text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">
                  电台节目
                </h1>
                <p className="mt-1 text-sm text-[var(--text-tertiary)]">电台 ID {radioId}</p>
              </div>
            </div>
            <Badge variant="secondary" className="self-start sm:self-auto">
              共 {programs.length} 期
            </Badge>
          </div>
        </header>

        {programs.length > 0 ? (
          <section
            className="space-y-2"
            aria-label="电台节目列表"
            data-testid="radio-program-list"
          >
            {programs.map((program, index) => (
              <ProgramRow key={`${program.id}-${index}`} program={program} index={index} />
            ))}
          </section>
        ) : (
          <div
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-16 text-center"
            data-testid="radio-detail-empty"
            role="status"
          >
            <Radio className="mx-auto mb-3 size-10 text-[var(--text-quaternary)]" aria-hidden="true" />
            <p className="text-sm text-[var(--text-tertiary)]">暂无节目</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function ProgramRow({ program, index }: { program: DjProgram; index: number }) {
  const host = program.dj?.nickname?.trim() || '未知主播'
  const duration = formatProgramDuration(program.duration)
  const timeLabel = duration || formatRelativeTime(program.createTime)

  return (
    <article
      className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 transition-colors hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]"
      data-testid={`radio-program-card-${program.id}`}
    >
      <div className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-[var(--text-tertiary)]">
        {String(index + 1).padStart(2, '0')}
      </div>

      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-overlay)]">
        <Image
          src={imageUrl(program.coverUrl, 120)}
          alt={program.name}
          width={56}
          height={56}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-medium text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-text)]">
          {program.name}
        </h2>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-tertiary)]">
          <span className="inline-flex min-w-0 items-center gap-1">
            <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{host}</span>
          </span>
          {timeLabel ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {timeLabel}
            </span>
          ) : null}
        </div>
        {program.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--text-tertiary)]">
            {program.description}
          </p>
        ) : null}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 rounded-full opacity-80 group-hover:bg-[var(--bg-accent-subtle)] group-hover:text-[var(--accent)] sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={`播放节目 ${program.name}`}
      >
        <Play className="size-4" fill="currentColor" aria-hidden="true" />
      </Button>
    </article>
  )
}
