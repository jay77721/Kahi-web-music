'use client'

import { FullScreenPlayer } from '@/components/player/FullScreenPlayer'
import { MiniPlayer } from '@/components/player/MiniPlayer'
import { PlayQueue } from '@/components/player/PlayQueue'

/**
 * Mounts the three overlay-style player components in a fixed order.
 * Drop-in replacement for inlining the three imports at the bottom of
 * every page.
 *
 * Previously these were loaded via `next/dynamic` with `ssr: false`.
 * In Next.js 16 App Router, `ssr: false` inside a client component is
 * not supported and triggers an SSR fallback error
 * ("Switched to client rendering because the server rendering errored").
 * Because every page that consumes `PlayerOverlays` is already a
 * client component, the dynamic boundary provided no benefit — direct
 * imports are the correct replacement.
 */
export function PlayerOverlays() {
  return (
    <>
      <FullScreenPlayer />
      <MiniPlayer />
      <PlayQueue />
    </>
  )
}
