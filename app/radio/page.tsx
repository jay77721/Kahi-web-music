'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import useSWR from 'swr'
import { ChevronRight, Radio, Play, Users, Headphones } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ncmApi } from '@/lib/api'
import { normalizeDjHotList, normalizeDjProgramToplist, normalizeDjRadioList } from '@/lib/api-adapters'
import { formatCount, imageUrl, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { fadeIn, staggerContainer, staggerItem, hoverLift } from '@/lib/animations'
import type { DjRadio, DjRadioHot, DjProgramToplistItem } from '@/types/dj'

type TabType = 'all' | 'hot' | 'toplist'

const RADIO_GRID_CLASS = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
const RADIO_CARD_SKELETON_COUNT = 12
const INITIAL_RADIO_VISIBLE_COUNT = 24
const RADIO_VISIBLE_INCREMENT = 24
const HOT_RADIO_SWR_OPTIONS = { shouldRetryOnError: false } as const

const tabs: { key: TabType; label: string; icon: ReactNode }[] = [
  { key: 'all', label: '全部电台', icon: <Radio className="w-4 h-4" /> },
  { key: 'hot', label: '热门电台', icon: <Headphones className="w-4 h-4" /> },
  { key: 'toplist', label: '精品节目', icon: <Play className="w-4 h-4" /> },
]

export default function RadioPage() {
  const [activeTab, setActiveTab] = useState<TabType>('hot')

  return (
    <AppShell>
      <div className="page-enter">
        {/* Hero header */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="relative overflow-hidden mb-8"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 gradient-mesh opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-primary)]" />

          <div className="relative px-4 md:px-6 pt-6 pb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-[var(--shadow-glow-lg)]">
                <Radio className="w-8 h-8 text-black" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
                  电台与播客
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  发现优质声音内容，聆听精品节目
                </p>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={activeTab === tab.key}
                  data-testid={`radio-tab-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
                    activeTab === tab.key
                      ? 'bg-[var(--accent)] text-black shadow-[var(--shadow-glow)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content sections */}
        <div className="px-4 md:px-6 pb-8">
          <AnimatePresence mode="wait">
            {activeTab === 'hot' && <HotRadioSection key="hot" />}
            {activeTab === 'all' && <AllRadioSection key="all" />}
            {activeTab === 'toplist' && <ProgramToplistSection key="toplist" />}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  )
}

// ── Hot Radio Section ──────────────────────────────────────────────────────

function HotRadioSection() {
  const { data, error, isLoading } = useSWR<DjRadioHot[]>('djradio-hot', async () => {
    const result = await ncmApi.djhot(12)
    return normalizeDjHotList(result)
  }, HOT_RADIO_SWR_OPTIONS)

  if (error) {
    return <RadioErrorState />
  }

  return (
    <RadioSection
      title="热门电台"
      badge={<Badge variant="secondary" className="text-xs">HOT</Badge>}
      action={
        <Link
          href="#"
          className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-text)] transition-colors"
        >
          查看全部 <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      {isLoading ? (
        <RadioCardGridSkeleton />
      ) : data?.length ? (
        <RadioCardGrid radios={data} />
      ) : (
        <RadioEmptyState title="暂无热门电台" />
      )}
    </RadioSection>
  )
}

// ── All Radio Section ──────────────────────────────────────────────────────

function AllRadioSection() {
  const { data, error, isLoading } = useSWR<DjRadio[]>('djradio-all', async () => {
    const result = await ncmApi.djradio()
    return normalizeDjRadioList(result)
  })

  if (error) {
    return <RadioErrorState />
  }

  return (
    <RadioSection
      title="全部电台"
      action={
        <span className="text-xs text-[var(--text-tertiary)]">
          {data?.length || 0} 个电台
        </span>
      }
    >
      {isLoading ? (
        <RadioCardGridSkeleton />
      ) : data?.length ? (
        <RadioCardGrid radios={data} />
      ) : (
        <RadioEmptyState title="暂无电台内容" />
      )}
    </RadioSection>
  )
}

// ── Program Toplist Section ───────────────────────────────────────────────

function ProgramToplistSection() {
  const { data, error, isLoading } = useSWR<DjProgramToplistItem[]>('djprogram-toplist', async () => {
    const result = await ncmApi.djprogramToplist(20)
    return normalizeDjProgramToplist(result)
  })

  if (error) {
    return <RadioErrorState />
  }

  return (
    <RadioSection
      title="精品节目排行"
      badge={<Badge variant="outline" className="text-xs">TOP 20</Badge>}
    >
      {isLoading ? (
        <ProgramToplistSkeleton />
      ) : data?.length ? (
        <div className="space-y-1 stagger-children">
          {data.map((program, index) => (
            <motion.div
              key={program.id}
              variants={staggerItem}
              className="group flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border)] hover:border-[var(--border-light)] transition-all duration-200 cursor-pointer"
            >
              {/* Rank */}
              <div className={cn(
                'w-6 text-center text-sm font-bold tabular-nums min-w-[24px]',
                index < 3 ? 'text-[var(--accent-text)]' : 'text-[var(--text-tertiary)]'
              )}>
                {index + 1}
              </div>

              {/* Cover */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                <Image
                  src={imageUrl(program.coverUrl, 80)}
                  alt={program.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-lg">
                    <Play className="w-3.5 h-3.5 text-black ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-text)] transition-colors">
                  {program.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[var(--text-secondary)] truncate">
                    {program.dj.nickname}
                  </span>
                  {program.radioId && (
                    <>
                      <span className="text-[var(--text-quaternary)]">·</span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {program.duration > 0 ? formatTime(program.duration) : formatRelativeTime(program.createTime)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Score badge */}
              {program.score && (
                <Badge variant="outline" className="text-[10px] tabular-nums shrink-0">
                  {program.score}分
                </Badge>
              )}

              {/* Play button */}
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <Play className="w-4 h-4 text-[var(--accent)]" fill="currentColor" />
              </Button>
            </motion.div>
          ))}
        </div>
      ) : (
        <RadioEmptyState title="暂无精品节目" />
      )}
    </RadioSection>
  )
}

interface RadioSectionProps {
  title: string
  badge?: ReactNode
  action?: ReactNode
  children: ReactNode
}

function RadioSection({ title, badge, action, children }: RadioSectionProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-[var(--accent)]" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            {title}
          </h2>
          {badge}
        </div>
        {action}
      </div>

      {children}
    </motion.div>
  )
}

function RadioErrorState() {
  return (
    <motion.div variants={fadeIn} className="text-center py-16" data-testid="radio-error-state">
      <p className="text-[var(--text-tertiary)]">加载失败，请稍后重试</p>
    </motion.div>
  )
}

function RadioCardGrid({ radios }: { radios: readonly (DjRadio | DjRadioHot)[] }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_RADIO_VISIBLE_COUNT)
  const effectiveVisibleCount = Math.min(visibleCount, radios.length)
  const visibleRadios = useMemo(
    () => radios.slice(0, effectiveVisibleCount),
    [effectiveVisibleCount, radios]
  )
  const remainingCount = radios.length - effectiveVisibleCount

  return (
    <div className="space-y-6">
      <div className={RADIO_GRID_CLASS}>
        {visibleRadios.map((radio) => (
          <motion.div key={radio.id} variants={staggerItem}>
            <RadioCard radio={radio} />
          </motion.div>
        ))}
      </div>

      {remainingCount > 0 && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="radio-load-more"
            aria-label={`显示更多电台，已显示 ${effectiveVisibleCount} / ${radios.length}`}
            onClick={() =>
              setVisibleCount((count) => Math.min(count + RADIO_VISIBLE_INCREMENT, radios.length))
            }
          >
            显示更多 ({remainingCount})
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Radio Card Component ──────────────────────────────────────────────────

interface RadioCardProps {
  radio: DjRadio | DjRadioHot
}

function RadioCard({ radio }: RadioCardProps) {
  const isHot = 'rank' in radio && typeof radio.rank === 'number'

  return (
    <Link href={`/radio/${radio.id}`} className="group block" data-testid={`radio-card-${radio.id}`}>
      <motion.div
        variants={hoverLift}
        initial="rest"
        whileHover="hover"
        className="relative rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-sm)]"
      >
        {/* Cover image */}
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={imageUrl(radio.picUrl, 300)}
            alt={radio.name}
            width={300}
            height={300}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Play count badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-[10px] bg-black/50 backdrop-blur-sm border-0">
              <Users className="w-2.5 h-2.5 mr-1" />
              {formatCount(radio.subCount)}
            </Badge>
          </div>

          {/* Rank badge for hot items */}
          {isHot && radio.rank && radio.rank <= 3 && (
            <div className="absolute top-2 right-2">
              <Badge className="text-[10px] bg-[var(--accent)] text-black border-0">
                #{radio.rank}
              </Badge>
            </div>
          )}

          {/* Hover play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <motion.div
              initial={{ scale: 0.8, y: 8 }}
              whileHover={{ scale: 1.1 }}
              className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            >
              <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
            </motion.div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-text)] transition-colors">
            {radio.name}
          </h3>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-[var(--text-secondary)] truncate">
              {radio.djName}
            </span>
            <span className="text-[10px] text-[var(--text-quaternary)] tabular-nums">
              {radio.programCount}期
            </span>
          </div>

          {/* Score bar for hot items */}
          {isHot && radio.score > 0 && (
            <div className="mt-2 h-1 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]"
                style={{ width: `${Math.min(radio.score / 10, 100)}%` }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  )
}

// ── Skeleton Components ────────────────────────────────────────────────────

function RadioCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border)]">
      <Skeleton className="aspect-square rounded-none bg-[var(--bg-overlay)]" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full bg-[var(--bg-overlay)]" />
        <Skeleton className="h-3 w-2/3 bg-[var(--bg-overlay)]" />
      </div>
    </div>
  )
}

function RadioCardGridSkeleton() {
  return (
    <div className={RADIO_GRID_CLASS}>
      {Array.from({ length: RADIO_CARD_SKELETON_COUNT }).map((_, index) => (
        <RadioCardSkeleton key={index} />
      ))}
    </div>
  )
}

function ProgramToplistSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-elevated)]">
          <Skeleton className="w-6 h-6 rounded bg-[var(--bg-overlay)]" />
          <Skeleton className="w-12 h-12 rounded-lg bg-[var(--bg-overlay)]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-[var(--bg-overlay)]" />
            <Skeleton className="h-3 w-1/2 bg-[var(--bg-overlay)]" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full bg-[var(--bg-overlay)]" />
        </div>
      ))}
    </div>
  )
}

function RadioEmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-12 text-center">
      <Radio className="mx-auto mb-3 h-8 w-8 text-[var(--text-quaternary)]" aria-hidden="true" />
      <p className="text-sm text-[var(--text-tertiary)]">{title}</p>
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (seconds <= 0) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
