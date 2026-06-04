'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/stores/userStore'

/**
 * Re-hydrates the user store from localStorage on mount.
 *
 * The store's initial state is computed at module load, but that runs
 * once per JS bundle. This effect re-runs `restore()` after the client
 * takes over so the store reflects the latest persisted session
 * (handles cases where localStorage was updated by another tab or
 * where the initial read happened before the browser fully populated
 * storage). Safe to call multiple times — `restore()` always marks the
 * restoration pass complete, even when no persisted session is present.
 */
export function UserSessionRestorer(): null {
  useEffect(() => {
    useUserStore.getState().restore()
  }, [])
  return null
}
