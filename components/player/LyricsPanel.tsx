'use client'

import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { LyricLine, LyricSyllable } from '@/types'

interface LyricsPanelProps {
  lyrics: LyricLine[]
  currentTime: number
  onSeek?: (time: number) => void
}

const EMPTY_LYRICS: LyricLine[] = []
const SYLLABLE_TRANSITION_MS = 200

/**
 * LyricsPanel — glassmorphism lyrics surface for the full-screen player.
 *
 * Renders the active line with a brighter, slightly larger treatment and
 * dims the rest. When the active line carries enhanced `<mm:ss.xx>` word
 * timings, each syllable is highlighted individually as the playhead
 * crosses it; otherwise the whole line is treated as one syllable.
 * A translation line (if present) sits beneath the original in a softer
 * tone, and the combined label is announced to assistive tech.
 */
function LyricsPanelImpl({ lyrics, currentTime, onSeek }: LyricsPanelProps) {
  const activeIndex = useActiveLyricIndex(lyrics, currentTime)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const ulRef = useRef<HTMLUListElement | null>(null)
  const activeRef = useRef<HTMLLIElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  // Keep the active line visually centered by translating the <ul> instead of
  // calling `scrollIntoView` on the active <li>. Scroll-based positioning
  // forces a reflow and races with the user's wheel/touch input; transform
  // composition stays on the compositor and is just as smooth (#M3).
  useLayoutEffect(() => {
    const container = containerRef.current
    const ul = ulRef.current
    const active = activeRef.current
    if (!container || !ul || !active) return
    const containerHeight = container.clientHeight
    if (containerHeight === 0) return
    const activeCenter = active.offsetTop + active.offsetHeight / 2
    const target = containerHeight / 2
    const offset = target - activeCenter
    ul.style.transform = `translateY(${offset}px)`
  }, [activeIndex, prefersReducedMotion])

  const safeLyrics = lyrics ?? EMPTY_LYRICS
  const hasLyrics = safeLyrics.length > 0

  // When the user prefers reduced motion, render plain <li> elements without
  // the AnimatePresence choreography. The active line still uses the
  // scale + glow styling via CSS, but no transform animation runs.
  const lineTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }

  return (
    <div
      ref={containerRef}
      className={cn(
        'glass-subtle relative w-full max-w-md mx-auto',
        'rounded-2xl border border-white/10',
        'px-5 py-6 max-h-64 overflow-y-auto',
        'scrollbar-thin'
      )}
      data-testid="lyrics-panel"
    >
      {hasLyrics ? (
        <ul ref={ulRef} className="flex flex-col items-center gap-3 text-center" role="list">
          <AnimatePresence initial={false}>
            {safeLyrics.map((line, index) => {
              const isActive = index === activeIndex
              return (
                <motion.li
                  key={`${line.time}-${index}`}
                  ref={isActive ? activeRef : null}
                  data-active={isActive ? 'true' : 'false'}
                  data-time={line.time}
                  data-has-syllables={line.syllables ? 'true' : 'false'}
                  role="button"
                  tabIndex={0}
                  aria-label={buildAriaLabel(line)}
                  onClick={() => onSeek?.(line.time)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSeek?.(line.time)
                    }
                  }}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{
                    opacity: isActive ? 1 : 0.4,
                    y: 0,
                    scale: isActive ? 1.05 : 1,
                  }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={lineTransition}
                  className={cn(
                    'lyric-line cursor-pointer select-none',
                    'transition-colors duration-300 ease-out',
                    isActive
                      ? 'text-white font-medium lyric-active text-glow'
                      : 'text-white/40 hover:text-white/70',
                    'focus:outline-none focus-visible:text-white/90'
                  )}
                >
                  <SyllableText
                    line={line}
                    isActive={isActive}
                    currentTime={currentTime}
                  />
                  {line.translation ? (
                    <span
                      data-testid="lyric-translation"
                      className={cn(
                        'block text-sm mt-1 leading-snug',
                        isActive ? 'text-white/50' : 'text-white/30'
                      )}
                    >
                      {line.translation}
                    </span>
                  ) : null}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="text-white/40 text-sm py-8 text-center" role="status">
          暂无歌词
        </p>
      )}
    </div>
  )
}

interface SyllableTextProps {
  line: LyricLine
  isActive: boolean
  currentTime: number
}

/**
 * Renders the original text. When the line has word-by-word timings and is
 * the active line, paints each syllable based on whether the playhead has
 * already crossed its start time. Inactive or un-timed lines fall back to a
 * single static span.
 */
function SyllableText({ line, isActive, currentTime }: SyllableTextProps) {
  const syllables = line.syllables
  const useHighlight = isActive && Array.isArray(syllables) && syllables.length > 0

  if (!useHighlight) {
    return <span className="block leading-relaxed">{line.text}</span>
  }

  return (
    <span
      className="block leading-relaxed"
      data-testid="lyric-syllables"
      style={{ transitionDuration: `${SYLLABLE_TRANSITION_MS}ms` }}
    >
      {syllables!.map((syl, i) => (
        <Syllable
          key={`${syl.time}-${i}`}
          syllable={syl}
          isSpoken={currentTime >= syl.time}
        />
      ))}
    </span>
  )
}

interface SyllableProps {
  syllable: LyricSyllable
  isSpoken: boolean
}

/**
 * Single syllable — visually highlights once the playhead reaches it.
 * The spoken state is always carried by `data-spoken` so styles and tests
 * can introspect it without parsing inline styles. `aria-hidden` keeps the
 * syllable out of the AT readout, since the parent <li> already announces
 * the full text via its `aria-label`.
 */
function Syllable({ syllable, isSpoken }: SyllableProps) {
  return (
    <span
      data-spoken={isSpoken ? 'true' : 'false'}
      data-time={syllable.time}
      aria-hidden="true"
      className={cn(
        'lyric-syllable transition-colors ease-out',
        isSpoken ? 'text-white' : 'text-white/35'
      )}
      style={{ transitionDuration: `${SYLLABLE_TRANSITION_MS}ms` }}
    >
      {syllable.text}
    </span>
  )
}

/**
 * Build a screen-reader label that includes the translation when one is
 * present, so AT users hear both languages without depending on the
 * visual order of the children.
 */
function buildAriaLabel(line: LyricLine): string {
  if (line.translation) {
    return `${line.text} — ${line.translation}`
  }
  return line.text
}

/**
 * Resolve the index of the lyric line currently being sung.
 * Returns -1 when no line is active (e.g. before the first timestamp or
 * when `lyrics` is empty). Binary-searches for O(log n) on long tracks.
 */
function useActiveLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  return useMemo(() => {
    if (!lyrics || lyrics.length === 0) return -1
    if (currentTime < lyrics[0]!.time) return -1

    let lo = 0
    let hi = lyrics.length - 1
    let result = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const line = lyrics[mid]!
      if (line.time <= currentTime) {
        result = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return result
  }, [lyrics, currentTime])
}

export const LyricsPanel = memo(LyricsPanelImpl)
