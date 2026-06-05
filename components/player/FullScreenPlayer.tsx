'use client'

import { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { ChevronDown, Repeat, Repeat1, Shuffle, Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { formatTime, formatArtists, imageUrl } from '@/lib/format'
import { useDominantColor } from '@/hooks/useDominantColor'
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser'
import { useReducedMotion, useReducedMotionVariants } from '@/hooks/useReducedMotion'
import { useSwipe } from '@/hooks/useSwipe'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { LyricsPanel } from '@/components/player/LyricsPanel'
import { SpectrumVisualizer } from '@/components/player/SpectrumVisualizer'
import { VinylDisc } from '@/components/player/VinylDisc'
import { Tonearm } from '@/components/player/Tonearm'

// Vinyl disc sizing — smaller on phones, larger on desktop.
const VINYL_SIZE_MOBILE = 200
const VINYL_SIZE_DESKTOP = 320

// Re-extract the dominant color no more than once per `RESAMPLE_INTERVAL_MS`.
// This keeps the UI responsive when the user scrubs the queue quickly.
const RESAMPLE_INTERVAL_MS = 5_000
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export const FullScreenPlayer = memo(function FullScreenPlayer() {
  const fullScreenPlayerOpen = useUIStore((state) => state.fullScreenPlayerOpen)
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null)

  // Defer all heavy hooks (useDominantColor, useAudioAnalyser, …) to the
  // inner component so they are only mounted while the player is open.
  // Returning null here unmounts the inner component, which triggers the
  // useEffect cleanups inside the hooks (cancel rAF, cancel in-flight
  // fetch, disconnect the WebAudio analyser node, …). Subscribe only to the
  // track id at this gate so playback ticks do not update a closed player.
  if (!fullScreenPlayerOpen || currentTrackId === null) return null

  return <FullScreenPlayerContent />
})

function FullScreenPlayerContent() {
  const rawCurrentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const duration = usePlayerStore((state) => state.duration)
  const playMode = usePlayerStore((state) => state.playMode)
  const lyrics = usePlayerStore((state) => state.lyrics)
  const next = usePlayerStore((state) => state.next)
  const prev = usePlayerStore((state) => state.prev)
  const seek = usePlayerStore((state) => state.seek)
  const cyclePlayMode = usePlayerStore((state) => state.cyclePlayMode)
  const fullScreenPlayerOpen = useUIStore((state) => state.fullScreenPlayerOpen)
  const setFullScreenPlayerOpen = useUIStore((state) => state.setFullScreenPlayerOpen)

  // The outer <FullScreenPlayer> wrapper only mounts us when there is a
  // current track, so the assertion below is always safe at runtime. We
  // use `!` instead of an early return so all hooks above stay unconditional
  // (and ESLint's rules-of-hooks stays happy).
  const currentTrack = rawCurrentTrack!

  // Only feed the hook a stable URL — we throttle updates so consecutive
  // rapid track changes don't thrash the canvas pipeline.
  const rawUrl = currentTrack?.al?.picUrl
  const [stableUrl, setStableUrl] = useState<string | null>(rawUrl ?? null)
  const lastExtractedRef = useRef<{ url: string; at: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      if (!rawUrl) {
        setStableUrl(null)
        return
      }
      // If we've extracted this URL recently, keep showing the previous color
      // and don't trigger a new extraction.
      const last = lastExtractedRef.current
      if (last && last.url === rawUrl && Date.now() - last.at < RESAMPLE_INTERVAL_MS) {
        return
      }
      setStableUrl(rawUrl)
    })

    return () => {
      cancelled = true
    }
  }, [rawUrl])

  const handleColorLoaded = useCallback((url: string) => {
    lastExtractedRef.current = { url, at: Date.now() }
  }, [])

  const coverUrl = stableUrl ? imageUrl(stableUrl, 224) : null
  const { color } = useDominantColor(coverUrl, { timeoutMs: 5000 })
  const { analyser } = useAudioAnalyser()

  // Responsive vinyl sizing — use a small/medium breakpoint similar to Tailwind's `sm`.
  const [vinylSize, setVinylSize] = useState(VINYL_SIZE_MOBILE)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const apply = () => setVinylSize(mq.matches ? VINYL_SIZE_DESKTOP : VINYL_SIZE_MOBILE)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Notify the throttler once we have a fresh color for the current url.
  useEffect(() => {
    if (color && stableUrl) handleColorLoaded(stableUrl)
  }, [color, stableUrl, handleColorLoaded])

  // Build the dynamic radial-gradient background. Fall back to the static
  // mesh gradient while the color is loading or the hook has no result.
  const dynamicStyle = useMemo<React.CSSProperties>(() => {
    if (!color) {
      return {
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(30, 215, 96, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(120, 80, 220, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 80%, rgba(30, 150, 215, 0.04) 0%, transparent 50%),
          linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-secondary) 50%, var(--bg-secondary) 100%)
        `,
        transition: 'background 800ms ease-out',
      }
    }
    return {
      background: `
        radial-gradient(ellipse at 20% 50%, ${color.oklch.replace(')', ' / 0.35)')} 0%, transparent 55%),
        radial-gradient(ellipse at 80% 20%, ${color.oklch.replace(')', ' / 0.22)')} 0%, transparent 55%),
        radial-gradient(ellipse at 50% 80%, ${color.oklch.replace(')', ' / 0.15)')} 0%, transparent 55%),
        linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-secondary) 50%, var(--bg-secondary) 100%)
      `,
      transition: 'background 800ms ease-out',
      // Expose the raw oklch for any descendant utility that wants it.
      ['--color-dynamic-bg' as string]: color.oklch,
    }
  }, [color])

  // All hooks above are unconditional so React's rules of hooks are
  // satisfied. Visibility is enforced by the outer <FullScreenPlayer>
  // wrapper, which only mounts this component when there is something
  // to show — that way every useEffect cleanup (rAF, canvas, analyser
  // disconnect) runs the moment the user closes the player.

  // Mobile-only swipe gestures: left/right switch tracks, up/down dismiss.
  // Desktop keeps using the on-screen controls and keyboard shortcuts.
  const isMobile = useIsMobile()
  const swipeRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const handleClose = useCallback(() => setFullScreenPlayerOpen(false), [setFullScreenPlayerOpen])

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    const overlay = swipeRef.current
    overlay?.focus()

    return () => {
      if (previouslyFocusedRef.current?.isConnected) {
        previouslyFocusedRef.current.focus()
      }
    }
  }, [])

  const handleOverlayKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
      return
    }

    if (event.key !== 'Tab') return

    const overlay = swipeRef.current
    if (!overlay) return

    const focusableElements = Array.from(
      overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    )

    if (focusableElements.length === 0) {
      event.preventDefault()
      overlay.focus()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
      return
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }, [handleClose])

  // Stabilise swipe handlers so useSwipe's effect doesn't tear down and
  // re-bind touch listeners on every render (#M2).
  const handleSwipeLeft = useCallback(() => {
    next()
  }, [next])
  const handleSwipeRight = useCallback(() => {
    prev()
  }, [prev])
  useSwipe(swipeRef, {
    enabled: isMobile && Boolean(currentTrack) && fullScreenPlayerOpen,
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onSwipeUp: handleClose,
    onSwipeDown: handleClose,
  })

  const handleTogglePlay = () => {
    usePlayerStore.getState().togglePlay()
  }

  const handleSeek = (time: number) => {
    seek(time)
  }

  const handleLyricClick = (time: number) => {
    seek(time)
  }

  const playModeIcon = playMode === 'repeat-one' ? Repeat1 : playMode === 'shuffle' ? Shuffle : Repeat
  const PlayModeIcon = playModeIcon
  const currentTimeLabel = formatTime(currentTime)
  const durationLabel = formatTime(duration || 0)

  // Animation variants
  const panelVariants = useReducedMotionVariants({
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.35 }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: { duration: 0.2 }
    }
  })

  const albumArtVariants = useReducedMotionVariants({
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, delay: 0.1 }
    }
  })

  const controlsVariants = useReducedMotionVariants({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, delay: 0.15 }
    }
  })

  const prefersReducedMotion = useReducedMotion()

  // Inline motion props for the header, spectrum and lyrics. When the user
  // prefers reduced motion we collapse to the final state and skip the
  // duration/delay so the section is visible immediately.
  const headerMotion = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: 0.05 } }

  const spectrumMotion = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: 0.18 } }

  const lyricsMotion = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: 0.1 } }

  return (
    <motion.div
      ref={swipeRef}
      role="dialog"
      aria-modal="true"
      aria-label="全屏播放器"
      tabIndex={-1}
      onKeyDown={handleOverlayKeyDown}
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[100] flex flex-col dynamic-bg fullscreen-content"
      style={dynamicStyle}
    >
      {/* Header */}
      <motion.div
        {...headerMotion}
        className="flex items-center justify-between px-4 py-3"
      >
        <Button variant="ghost" size="icon" className="hover:text-[var(--accent)] transition-colors" onClick={() => setFullScreenPlayerOpen(false)} aria-label="关闭">
          <ChevronDown className="w-6 h-6" />
        </Button>
        <div className="text-center flex-1">
          <p className="text-sm font-medium truncate">{currentTrack.name}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {formatArtists(currentTrack.ar || [])}
          </p>
        </div>
        <div className="w-10" />
      </motion.div>

      {/* Content: album art + lyrics */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Vinyl record with animated entrance */}
        <motion.div
          variants={albumArtVariants}
          initial="hidden"
          animate="visible"
          className="relative mb-8 vinyl-stage"
          data-testid="vinyl-stage"
        >
          <VinylDisc
            coverUrl={stableUrl ?? ''}
            isPlaying={isPlaying}
            size={vinylSize}
          />
          <Tonearm isPlaying={isPlaying} className="vinyl-stage__tonearm" />

          {isPlaying && !prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 rounded-full -z-10"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ boxShadow: '0 0 80px var(--accent-glow), 0 0 120px var(--accent-subtle)' }}
            />
          )}
          {isPlaying && prefersReducedMotion && (
            <div
              className="absolute inset-0 rounded-full -z-10"
              style={{ boxShadow: '0 0 80px var(--accent-glow), 0 0 120px var(--accent-subtle)' }}
            />
          )}
        </motion.div>

        {/* Spectrum visualizer (below cover) */}
        <motion.div
          {...spectrumMotion}
          className="w-full max-w-md -mt-2 mb-6 px-2"
        >
          <SpectrumVisualizer analyser={analyser} isPlaying={isPlaying} />
        </motion.div>

        {/* Lyrics (glassmorphism panel) */}
        <motion.div
          {...lyricsMotion}
          className="w-full flex justify-center"
        >
          <LyricsPanel
            lyrics={lyrics}
            currentTime={currentTime}
            onSeek={handleLyricClick}
          />
        </motion.div>
      </div>

      {/* Bottom controls with animation */}
      <motion.div
        variants={controlsVariants}
        initial="hidden"
        animate="visible"
        className="px-6 pb-8 space-y-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-tertiary)] w-10 text-right tabular-nums">
            {currentTimeLabel}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={(v) => handleSeek(Array.isArray(v) ? v[0] : v)}
            className="flex-1 player-slider"
            aria-label="播放进度"
          />
          <span className="text-[10px] text-[var(--text-tertiary)] w-10 tabular-nums">
            {durationLabel}
          </span>
        </div>

        <div className="flex items-center justify-center gap-6 glass rounded-full px-6 py-3 mx-auto w-fit"
          style={{ background: 'rgba(17, 17, 17, 0.5)' }}>
          <Button variant="ghost" size="icon" className="w-10 h-10 text-[var(--text-secondary)] hover:text-[var(--accent)]" onClick={cyclePlayMode} aria-label={playMode === 'repeat-one' ? '单曲循环' : playMode === 'shuffle' ? '随机播放' : '列表循环'}>
            <PlayModeIcon className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12 text-[var(--text-primary)] hover:text-[var(--accent)]" onClick={prev} aria-label="上一首">
            <SkipBack className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-glow)] hover:scale-105 transition-all duration-200"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12 text-[var(--text-primary)] hover:text-[var(--accent)]" onClick={next} aria-label="下一首">
            <SkipForward className="w-6 h-6" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
