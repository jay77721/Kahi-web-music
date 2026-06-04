'use client'

import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'

/**
 * Mounts the global keyboard shortcut listener at the application root.
 * Renders nothing — purely a side-effect component.
 */
export function GlobalShortcuts() {
  useGlobalShortcuts()
  return null
}
