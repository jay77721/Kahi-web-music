'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Play, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { imageUrl } from '@/lib/format'

export type BentoSize = 'sm' | 'md' | 'lg'

interface BentoCardBaseProps {
  title: string
  subtitle?: string
  cover?: string
  icon?: LucideIcon
  size: BentoSize
  /** ARIA badge text rendered as a small pill on the top-right corner. */
  badge?: string
  /** Accent hue applied as a soft glow / overlay. Falls back to accent. */
  accent?: string
  className?: string
  children?: React.ReactNode
}

interface BentoCardLinkProps extends BentoCardBaseProps {
  href: string
  onClick?: never
}

interface BentoCardActionProps extends BentoCardBaseProps {
  href?: never
  onClick: () => void
}

type BentoCardProps = BentoCardLinkProps | BentoCardActionProps

const SIZE_TO_CLASS: Record<BentoSize, string> = {
  sm: 'col-span-6 md:col-span-3 row-span-1 min-h-[140px]',
  md: 'col-span-6 md:col-span-4 row-span-1 min-h-[160px]',
  lg: 'col-span-12 md:col-span-4 row-span-2 min-h-[336px]',
}

const TITLE_SIZE: Record<BentoSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl md:text-2xl',
}

const SUBTITLE_SIZE: Record<BentoSize, string> = {
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-sm',
}

const IMAGE_SIZES: Record<BentoSize, string> = {
  sm: '(max-width: 768px) 50vw, 25vw',
  md: '(max-width: 768px) 50vw, 33vw',
  lg: '(max-width: 768px) 100vw, 33vw',
}

/**
 * BentoCard: generic mosaic tile for the discover page.
 *
 * Visuals:
 * - 1:1 cover image with a hover scale-up + gradient mask.
 * - Title / subtitle overlay clipped to two lines on the bottom.
 * - Optional accent tint and Lucide icon.
 *
 * Accessibility:
 * - Renders as a real anchor (`href`) or button (`onClick`) so it is
 *   keyboard-focusable and operable via Enter / Space.
 * - `aria-label` is auto-built from title + subtitle so screen readers
 *   announce the full context.
 */
export function BentoCard(props: BentoCardProps) {
  const {
    title,
    subtitle,
    cover,
    icon: Icon,
    size,
    badge,
    accent = 'var(--accent)',
    className,
    children,
  } = props

  const ariaLabel = subtitle ? `${title}: ${subtitle}` : title

  const inner = (
    <motion.div
      className={cn(
        'group relative w-full h-full overflow-hidden rounded-2xl',
        'bg-white/5 hover:bg-white/10',
        'border border-white/5 hover:border-white/15',
        'shadow-sm hover:shadow-xl',
        'transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        SIZE_TO_CLASS[size]
      )}
      style={{ ['--card-accent' as string]: accent }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
    >
      {cover ? (
        <>
          <Image
            src={imageUrl(cover, size === 'lg' ? 400 : 200)}
            alt=""
            fill
            sizes={IMAGE_SIZES[size]}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.85) 100%)',
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, ${accent}33 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Hover blur veil */}
      <div className="absolute inset-0 backdrop-blur-0 group-hover:backdrop-blur-[2px] transition-[backdrop-filter] duration-500 pointer-events-none" />

      {/* Content */}
      <div className="relative h-full w-full p-4 flex flex-col justify-end">
        {Icon && (
          <div
            className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
        )}

        {badge && (
          <span
            className="absolute top-3 right-3 px-2 py-0.5 text-[10px] rounded-full font-medium bg-black/50 text-white/90 backdrop-blur-sm"
            aria-hidden="true"
          >
            {badge}
          </span>
        )}

        <h3
          className={cn(
            'font-semibold text-white leading-tight line-clamp-2',
            TITLE_SIZE[size]
          )}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className={cn(
              'mt-1 text-white/70 line-clamp-2',
              SUBTITLE_SIZE[size]
            )}
          >
            {subtitle}
          </p>
        )}

        {children}
      </div>

      {/* Hover play badge (non-interactive, purely visual cue) */}
      <div
        className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        style={{ background: accent, color: '#000' }}
        aria-hidden="true"
      >
        <Play className="w-3.5 h-3.5" fill="currentColor" />
      </div>
    </motion.div>
  )

  if ('href' in props && props.href) {
    return (
      <Link
        href={props.href}
        aria-label={ariaLabel}
        className={cn('block focus:outline-none', className)}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={ariaLabel}
      className={cn(
        'block w-full text-left appearance-none border-0 p-0 bg-transparent cursor-pointer',
        'focus:outline-none',
        className
      )}
    >
      {inner}
    </button>
  )
}
