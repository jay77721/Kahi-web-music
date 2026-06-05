'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { motion, type Variants } from 'framer-motion'
import { ChevronDown, Users, Mic2 } from 'lucide-react'
import { useDominantColor } from '@/hooks/useDominantColor'
import { imageUrl, formatCount } from '@/lib/format'
import type { DominantColor } from '@/lib/color'
import type { Artist } from '@/types/artist'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ArtistHeroProps {
  artist: Artist
  /** Brief bio (already trimmed by the caller). */
  description?: string
  /** Number of fans/followers — shown as the secondary metric. */
  fanCount?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

const FALLBACK_OKLCH = 'oklch(0.22 0 0)'
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withAlpha(oklch: string, alpha: number): string {
  if (!oklch.endsWith(')')) return oklch
  return `${oklch.slice(0, -1)} / ${alpha})`
}

function buildBackgroundStyle(color: DominantColor | null): CSSProperties {
  const base = color?.oklch ?? FALLBACK_OKLCH
  const top = withAlpha(base, 0.5)
  const mid = withAlpha(base, 0.28)
  const low = withAlpha(base, 0.12)
  return {
    backgroundColor: low,
    backgroundImage: `radial-gradient(ellipse at 25% 30%, ${top} 0%, ${mid} 45%, ${low} 70%, transparent 100%)`,
    transition: 'background-color 800ms ease-out, background-image 800ms ease-out',
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * ArtistHero — large circular avatar + name + fan count + bio,
 * over a radial gradient sampled from the avatar's dominant color.
 *
 * The bio is clamped to 3 lines by default; clicking the toggle expands
 * it inline. The avatar falls back to a Lucide icon when the cover URL
 * is missing.
 */
export function ArtistHero({
  artist,
  description = '',
  fanCount,
  className,
}: ArtistHeroProps) {
  const cover = artist.img1v1Url || artist.picUrl || ''
  const sampledUrl = cover ? imageUrl(cover, 160) : null
  const { color } = useDominantColor(sampledUrl, { timeoutMs: 5000 })
  const backgroundStyle = useMemo(() => buildBackgroundStyle(color), [color])

  const [expanded, setExpanded] = useState<boolean>(false)
  const hasDescription = description.trim().length > 0

  return (
    <motion.section
      data-testid="artist-hero"
      className={cn(
        'artist-hero relative overflow-hidden rounded-2xl mb-6',
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hero-gradient-mask"
        style={backgroundStyle}
      />

      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-5 md:p-8">
        <motion.div
          variants={itemVariants}
          className="flex-shrink-0"
        >
          <div className="artist-avatar-ring w-40 h-40 md:w-64 md:h-64 rounded-full overflow-hidden bg-[var(--bg-elevated)] flex items-center justify-center">
            {cover ? (
              <Image
                src={imageUrl(cover, 320)}
                alt={artist.name}
                width={256}
                height={256}
                priority
                className="w-full h-full object-cover"
              />
            ) : (
              <Mic2 className="w-20 h-20 text-[var(--text-tertiary)]" aria-hidden="true" />
            )}
          </div>
        </motion.div>

        <div className="flex-1 min-w-0 text-center md:text-left flex flex-col gap-3">
          <motion.span
            variants={itemVariants}
            className="inline-flex self-center md:self-start text-[11px] uppercase tracking-[0.18em] text-[var(--accent-text)]"
          >
            艺人
          </motion.span>

          <motion.h1
            variants={itemVariants}
            className="text-2xl md:text-4xl font-bold leading-tight text-[var(--text-primary)]"
          >
            {artist.name}
          </motion.h1>

          {artist.alias && artist.alias.length > 0 && (
            <motion.p
              variants={itemVariants}
              className="text-sm text-[var(--text-tertiary)]"
            >
              {artist.alias.join(' · ')}
            </motion.p>
          )}

          {fanCount !== undefined && fanCount > 0 && (
            <motion.div
              variants={itemVariants}
              className="inline-flex self-center md:self-start items-center gap-1.5 text-sm text-[var(--text-secondary)]"
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              <span>{formatCount(fanCount)} 粉丝</span>
            </motion.div>
          )}

          {hasDescription && (
            <motion.div variants={itemVariants} className="space-y-1">
              <p
                data-testid="artist-description"
                className={cn(
                  'text-sm text-[var(--text-secondary)] leading-relaxed',
                  !expanded && 'truncate-3'
                )}
              >
                {description}
              </p>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="inline-flex items-center gap-1 text-xs text-[var(--accent-text)] hover:underline focus-visible:underline"
              >
                {expanded ? '收起' : '展开'}
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform',
                    expanded && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  )
}
