'use client'

import { useEffect, useCallback, useRef } from 'react'

interface KeyboardShortcut {
  /** Key combination (e.g. 'Space', 'Shift+P', 'Control+K') */
  key: string
  /** Callback when the shortcut is pressed */
  handler: () => void
  /** Optional description for the shortcut */
  description?: string
  /** Whether to prevent default behavior */
  preventDefault?: boolean
  /** Only active when this condition is true */
  when?: boolean
}

interface KeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  /** Enable logging of shortcut activations */
  debug?: boolean
}

function normalizeKey(key: string): string {
  const normalizedKey = key.toLowerCase()
  return normalizedKey === ' ' || normalizedKey === 'space' ? 'space' : normalizedKey
}

/**
 * Registers global keyboard shortcuts with optional conditional activation.
 * All shortcuts are bound at the window level.
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: ' ', handler: () => togglePlay(), preventDefault: true, description: 'Play/Pause' },
 *     { key: 'ArrowRight', handler: () => nextTrack(), when: isPlaying, description: 'Next track' },
 *     { key: 'k', handler: () => toggleSearch(), description: 'Search' },
 *   ]
 * })
 * ```
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions): void {
  const { shortcuts, debug = false } = options
  const shortcutsRef = useRef(shortcuts)

  useEffect(() => {
    shortcutsRef.current = shortcuts
  })

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcutsRef.current) {
        // Check if shortcut is currently active
        if (shortcut.when === false) continue

        const parts = shortcut.key
          .toLowerCase()
          .split('+')
          .map((part) => (part === ' ' ? part : part.trim()))
        const baseKey = normalizeKey(parts[parts.length - 1] ?? '')
        const eventKey = normalizeKey(event.key)
        const wantsCtrl = parts.includes('control') || parts.includes('ctrl')
        const wantsMeta = parts.includes('meta') || parts.includes('cmd') || parts.includes('command')
        const wantsAlt = parts.includes('alt') || parts.includes('option')
        const wantsShift = parts.includes('shift')
        const hasExplicitModifier = wantsCtrl || wantsMeta || wantsAlt || wantsShift

        const matchesBaseKey = eventKey === baseKey
        const matches = hasExplicitModifier
          ? matchesBaseKey &&
            (!wantsCtrl || event.ctrlKey) &&
            (!wantsMeta || event.metaKey) &&
            (!wantsAlt || event.altKey) &&
            (!wantsShift || event.shiftKey) &&
            (wantsCtrl || !event.ctrlKey) &&
            (wantsMeta || !event.metaKey) &&
            (wantsAlt || !event.altKey) &&
            (wantsShift || !event.shiftKey)
          : matchesBaseKey

        if (matches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler()

          if (debug) {
            console.debug(`[useKeyboardShortcuts] Triggered: ${shortcut.key}`)
          }
          return // Only trigger the first matching shortcut
        }
      }
    },
    [debug]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Simple shortcut hook for a single key binding.
 */
export function useKeyPress(
  key: string,
  handler: () => void,
  options: { preventDefault?: boolean; when?: boolean } = {}
): void {
  useKeyboardShortcuts({
    shortcuts: [
      {
        key,
        handler,
        preventDefault: options.preventDefault ?? true,
        when: options.when,
      },
    ],
  })
}
