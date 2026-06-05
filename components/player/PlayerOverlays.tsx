'use client'

import { lazy, Suspense, useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'

const FullScreenPlayer = lazy(() =>
  import('@/components/player/FullScreenPlayer').then((module) => ({
    default: module.FullScreenPlayer as ComponentType,
  }))
)
const MiniPlayer = lazy(() =>
  import('@/components/player/MiniPlayer').then((module) => ({ default: module.MiniPlayer }))
)
const PlayQueue = lazy(() =>
  import('@/components/player/PlayQueue').then((module) => ({ default: module.PlayQueue }))
)

function useRememberedMount(shouldMount: boolean) {
  const [hasMounted, setHasMounted] = useState(shouldMount)

  useEffect(() => {
    if (!shouldMount || hasMounted) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true)
  }, [hasMounted, shouldMount])

  return hasMounted || shouldMount
}

/**
 * Defers overlay-style player modules until the state that can show them
 * becomes active, then keeps each one mounted after its first load.
 */
export function PlayerOverlays() {
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null)
  const isMobile = useUIStore((state) => state.isMobile)
  const fullScreenPlayerOpen = useUIStore((state) => state.fullScreenPlayerOpen)
  const playQueueOpen = useUIStore((state) => state.playQueueOpen)

  const hasCurrentTrack = currentTrackId !== null
  const shouldMountFullScreenPlayer = useRememberedMount(
    hasCurrentTrack && fullScreenPlayerOpen
  )
  const shouldMountMiniPlayer = useRememberedMount(hasCurrentTrack && isMobile)
  const shouldMountPlayQueue = useRememberedMount(playQueueOpen)

  return (
    <>
      {shouldMountFullScreenPlayer && (
        <Suspense fallback={null}>
          <FullScreenPlayer />
        </Suspense>
      )}
      {shouldMountMiniPlayer && (
        <Suspense fallback={null}>
          <MiniPlayer />
        </Suspense>
      )}
      {shouldMountPlayQueue && (
        <Suspense fallback={null}>
          <PlayQueue />
        </Suspense>
      )}
    </>
  )
}
