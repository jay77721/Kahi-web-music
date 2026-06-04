'use client'

import { memo, useMemo, type ReactNode, type CSSProperties } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useDominantColor } from '@/hooks/useDominantColor'
import { imageUrl } from '@/lib/format'
import type { DominantColor } from '@/lib/color'

export interface HeroBannerMeta {
  plays?: string | number | null
  count?: string | number | null
  creator?: ReactNode
}

export interface HeroBannerProps {
  cover: string
  title: string
  subtitle?: string
  meta?: HeroBannerMeta
  badge?: string
  actions?: ReactNode
  className?: string
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]
const FALLBACK_COLOR_OKLCH = 'oklch(0.18 0 0)'

function withAlpha(oklch: string, alpha: number): string {
  // Inject "/ <alpha>" before the closing paren: "oklch(L C H)" -> "oklch(L C H / a)"
  if (!oklch.endsWith(')')) return oklch
  return `${oklch.slice(0, -1)} / ${alpha})`
}

function buildBackgroundStyle(color: DominantColor | null): CSSProperties {
  const base = color?.oklch ?? FALLBACK_COLOR_OKLCH
  const tint = withAlpha(base, 0.3)
  const top = withAlpha(base, 0.45)
  const mid = withAlpha(base, 0.18)
  return {
    backgroundColor: tint,
    backgroundImage: `linear-gradient(180deg, ${top} 0%, ${mid} 50%, transparent 100%)`,
    transition: 'background-color 600ms ease-out, background-image 600ms ease-out',
  }
}

interface MetaRowProps {
  meta?: HeroBannerMeta
}

function MetaRow({ meta }: MetaRowProps) {
  if (!meta) return null
  const items: ReactNode[] = []
  if (meta.creator) items.push(<span key="creator">{meta.creator}</span>)
  if (meta.count !== undefined && meta.count !== null && meta.count !== '') {
    items.push(<span key="count">{meta.count} 首</span>)
  }
  if (meta.plays !== undefined && meta.plays !== null && meta.plays !== '') {
    items.push(<span key="plays">播放 {meta.plays}</span>)
  }
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
      {items.map((node, idx) => (
        <span key={idx} className="flex items-center gap-2">
          {idx > 0 && <span className="text-[var(--text-quaternary)]">·</span>}
          {node}
        </span>
      ))}
    </div>
  )
}

export const HeroBanner = memo(function HeroBanner({
  cover,
  title,
  subtitle,
  meta,
  badge,
  actions,
  className,
}: HeroBannerProps) {
  const sampledUrl = cover ? imageUrl(cover, 160) : null
  const { color } = useDominantColor(sampledUrl, { timeoutMs: 5000 })
  const backgroundStyle = useMemo(() => buildBackgroundStyle(color), [color])

  return (
    <motion.section
      data-testid="hero-banner"
      className={`hero-banner relative overflow-hidden rounded-2xl mb-6 ${className ?? ''}`}
      style={{ minHeight: 'var(--hero-height, 280px)' }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hero-gradient-mask"
        style={backgroundStyle}
      />
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-5 md:p-8 h-full">
        {cover ? (
          <Image
            src={imageUrl(cover, 240)}
            alt={title}
            width={200}
            height={200}
            priority
            className="w-40 h-40 md:w-[200px] md:h-[200px] rounded-2xl object-cover shadow-[var(--shadow-lg)] flex-shrink-0"
          />
        ) : (
          <div
            aria-hidden="true"
            data-testid="hero-banner-cover-fallback"
            className="w-40 h-40 md:w-[200px] md:h-[200px] rounded-2xl bg-[var(--bg-elevated)] flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 text-center md:text-left flex flex-col gap-3">
          {badge && (
            <span className="inline-flex self-center md:self-start text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
              {badge}
            </span>
          )}
          <h1 className="text-2xl md:text-4xl font-bold leading-tight text-[var(--text-primary)] line-clamp-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm md:text-base text-[var(--text-tertiary)] line-clamp-2">
              {subtitle}
            </p>
          )}
          <MetaRow meta={meta} />
          {actions && <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">{actions}</div>}
        </div>
      </div>
    </motion.section>
  )
})
