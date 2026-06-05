'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Play, History } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useHistoryStore } from '@/stores/historyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { imageUrl } from '@/lib/format'

interface RecentPlayedProps {
  /** Maximum number of items to render. Defaults to 6 for the home first screen. */
  maxItems?: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
} as const

const COVER_IMAGE_SIZES =
  '(max-width: 639px) calc((100vw - 2rem - 0.75rem) / 2), (max-width: 767px) calc((100vw - 2rem - 1.5rem) / 3), (max-width: 1023px) calc((100vw - 3rem - 3rem) / 4), calc((100vw - 3rem - 5rem) / 6)'

const BREAKPOINT_QUERIES = [
  '(min-width: 640px)',
  '(min-width: 768px)',
  '(min-width: 1024px)',
] as const

function getInitialCoverCount() {
  if (typeof window === 'undefined') return 2
  if (window.matchMedia('(min-width: 1024px)').matches) return 6
  if (window.matchMedia('(min-width: 768px)').matches) return 4
  if (window.matchMedia('(min-width: 640px)').matches) return 3
  return 2
}

function useInitialCoverCount() {
  const [count, setCount] = useState(getInitialCoverCount)

  useEffect(() => {
    const mediaQueries = BREAKPOINT_QUERIES.map((query) => window.matchMedia(query))
    const updateCount = () => setCount(getInitialCoverCount())

    updateCount()
    mediaQueries.forEach((mediaQuery) => {
      mediaQuery.addEventListener('change', updateCount)
    })

    return () => {
      mediaQueries.forEach((mediaQuery) => {
        mediaQuery.removeEventListener('change', updateCount)
      })
    }
  }, [])

  return count
}

function useDeferredCoversReady(enabled: boolean) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!enabled || ready || typeof window === 'undefined') return

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => setReady(true), {
        timeout: 1200,
      })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = setTimeout(() => setReady(true), 160)
    return () => clearTimeout(timeoutId)
  }, [enabled, ready])

  return ready
}

/**
 * RecentPlayed — horizontal responsive grid of recently played songs.
 *
 * Pulls the persisted history from `useHistoryStore` and renders a
 * 2/3/4/6-column cover grid. Clicking a tile triggers playback via
 * the global player store. When the history is empty, renders a
 * subtle empty-state hint.
 */
export function RecentPlayed({ maxItems = 6 }: RecentPlayedProps) {
  const history = useHistoryStore((s) => s.history)
  const playSong = usePlayerStore((s) => s.playSong)
  const initialCoverCount = useInitialCoverCount()

  const items = history.slice(0, maxItems)
  const deferredCoversReady = useDeferredCoversReady(
    items.length > initialCoverCount
  )

  if (items.length === 0) {
    return (
      <section aria-labelledby="recent-played-heading">
        <SectionHeader />
        <div
          className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-10 px-6 flex flex-col items-center justify-center text-center"
          role="status"
        >
          <History className="w-8 h-8 text-white/30 mb-2" aria-hidden="true" />
          <p className="text-sm text-[var(--text-secondary)]">
            还没有播放记录
          </p>
          <p className="text-xs text-white/40 mt-1">
            播放歌曲后会在这里显示
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="recent-played-heading">
      <SectionHeader />

      <motion.div
        role="list"
        aria-label="最近播放"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {items.map((entry, index) => {
          const { song } = entry
          const cover = imageUrl(song.al?.picUrl, 200)
          const shouldRenderCover = index < initialCoverCount || deferredCoversReady
          return (
            <motion.button
              key={song.id}
              type="button"
              role="listitem"
              variants={itemVariants}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={() => playSong(song)}
              aria-label={`播放 ${song.name}`}
              className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white/5 shadow-sm transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-black/40">
                {shouldRenderCover ? (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    sizes={COVER_IMAGE_SIZES}
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                    fetchPriority={index < initialCoverCount ? 'auto' : 'low'}
                  />
                ) : (
                  <div className="absolute inset-0 bg-white/[0.03]" aria-hidden="true" />
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-2 right-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
                  aria-hidden="true"
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 text-black ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--accent-text)] transition-colors duration-200">
                {song.name}
              </p>
            </motion.button>
          )
        })}
      </motion.div>
    </section>
  )
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <History className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
      <h2
        id="recent-played-heading"
        className="text-lg md:text-xl font-semibold text-[var(--text-primary)]"
      >
        最近播放
      </h2>
    </div>
  )
}
