'use client'

import { useState } from 'react'
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
import { formatCount, imageUrl, formatRelativeTime } from '@/lib/format'
import { PlayerBar } from '@/components/player/PlayerBar'
import { PlayerOverlays } from '@/components/player/PlayerOverlays'
import { cn } from '@/lib/utils'
import { fadeIn, staggerContainer, staggerItem, hoverLift } from '@/lib/animations'
import type { DjRadio, DjRadioHot, DjProgramToplistItem } from '@/types/dj'

type TabType = 'all' | 'hot' | 'toplist'

const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
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
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-[var(--shadow-glow-lg)]">
                <Radio className="w-8 h-8 text-black" />
              </div>
              <div>
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
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
                    activeTab === tab.key
                      ? 'bg-[var(--accent)] text-black shadow-[var(--shadow-glow)]'
                      : 'bg-white/[0.06] text-[var(--text-secondary)] hover:bg-white/[0.1] hover:text-[var(--text-primary)]'
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

        <PlayerBar />
        <PlayerOverlays />
      </div>
    </AppShell>
  )
}

// ── Hot Radio Section ──────────────────────────────────────────────────────

function HotRadioSection() {
  const { data, error, isLoading } = useSWR<DjRadioHot[]>('djradio-hot', async () => {
    const result = await ncmApi.djhot(12)
    return (result as DjRadioHot[] | undefined) || []
  })

  if (error) {
    return (
      <motion.div variants={fadeIn} className="text-center py-16">
        <p className="text-[var(--text-tertiary)]">加载失败，请稍后重试</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="hot-content"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="space-y-6"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-[var(--accent)]" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            热门电台
          </h2>
          <Badge variant="secondary" className="text-xs">HOT</Badge>
        </div>
        <Link
          href="#"
          className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
        >
          查看全部 <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <RadioCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {data?.map((radio) => (
            <motion.div key={radio.id} variants={staggerItem}>
              <RadioCard radio={radio} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── All Radio Section ──────────────────────────────────────────────────────

function AllRadioSection() {
  const { data, error, isLoading } = useSWR<DjRadio[]>('djradio-all', async () => {
    const result = await ncmApi.djradio()
    return (result as DjRadio[] | undefined) || []
  })

  if (error) {
    return (
      <motion.div variants={fadeIn} className="text-center py-16">
        <p className="text-[var(--text-tertiary)]">加载失败，请稍后重试</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="all-content"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="space-y-6"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-[var(--accent)]" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            全部电台
          </h2>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          {data?.length || 0} 个电台
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <RadioCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {data?.map((radio) => (
            <motion.div key={radio.id} variants={staggerItem}>
              <RadioCard radio={radio} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Program Toplist Section ───────────────────────────────────────────────

function ProgramToplistSection() {
  const { data, error, isLoading } = useSWR<DjProgramToplistItem[]>('djprogram-toplist', async () => {
    const result = await ncmApi.djprogramToplist(20)
    return (result as DjProgramToplistItem[] | undefined) || []
  })

  if (error) {
    return (
      <motion.div variants={fadeIn} className="text-center py-16">
        <p className="text-[var(--text-tertiary)]">加载失败，请稍后重试</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="toplist-content"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="space-y-6"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-[var(--accent)]" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            精品节目排行
          </h2>
          <Badge variant="outline" className="text-xs">TOP 20</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[#181818]">
              <Skeleton className="w-6 h-6 rounded bg-[#282828]" />
              <Skeleton className="w-12 h-12 rounded-lg bg-[#282828]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-[#282828]" />
                <Skeleton className="h-3 w-1/2 bg-[#282828]" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full bg-[#282828]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1 stagger-children">
          {data?.map((program, index) => (
            <motion.div
              key={program.id}
              variants={staggerItem}
              className="group flex items-center gap-4 p-3 rounded-xl bg-[#181818] hover:bg-[#282828] border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer"
            >
              {/* Rank */}
              <div className={cn(
                'w-6 text-center text-sm font-bold tabular-nums min-w-[24px]',
                index < 3 ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
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
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-lg">
                    <Play className="w-3.5 h-3.5 text-black ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
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
      )}
    </motion.div>
  )
}

// ── Radio Card Component ──────────────────────────────────────────────────

interface RadioCardProps {
  radio: DjRadio | DjRadioHot
}

function RadioCard({ radio }: RadioCardProps) {
  const isHot = 'rank' in radio && typeof radio.rank === 'number'

  return (
    <Link href={`/radio/${radio.id}`} className="group block">
      <motion.div
        variants={hoverLift}
        initial="rest"
        whileHover="hover"
        className="relative rounded-2xl overflow-hidden bg-[#181818] border border-white/5 shadow-[var(--shadow-sm)]"
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
          <h3 className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
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
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
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
    <div className="rounded-2xl overflow-hidden bg-[#181818] border border-white/5">
      <Skeleton className="aspect-square rounded-none bg-[#282828]" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full bg-[#282828]" />
        <Skeleton className="h-3 w-2/3 bg-[#282828]" />
      </div>
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
