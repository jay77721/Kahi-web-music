'use client'

import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { audioEngine } from '@/lib/audio'

const VOLUME_STEP = 0.05
const MAX_VOLUME = 1
const MIN_VOLUME = 0

const PLAY_PAUSE_KEYS = new Set([' ', 'spacebar'])
const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

/**
 * Returns true when the given event target is a text-editable element
 * (input, textarea, select, or contenteditable surface).
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (target instanceof HTMLElement) {
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return true
    }
    if (target.isContentEditable) return true
    if (target.getAttribute('contenteditable') !== null) return true
  }
  return false
}

interface UseGlobalShortcutsOptions {
  /** When false the listener is mounted but all shortcuts are ignored. */
  enabled?: boolean
}

interface ShortcutResult {
  /** True when the event was handled and default should be suppressed. */
  handled: boolean
}

/**
 * Resolves the playback action for a key. Pure & extracted for testability.
 */
export function resolveShortcut(
  key: string,
  player: {
    isPlaying: boolean
    volume: number
    setHasUserInteracted: () => void
    setVolume: (volume: number) => void
    toggleMute: () => void
    next: () => void
    prev: () => void
  },
  ui: { fullScreenPlayerOpen: boolean; setFullScreenPlayerOpen: (open: boolean) => void },
  audio: { isPlaying: () => boolean; play: () => void; pause: () => void }
): ShortcutResult {
  const lower = key.length === 1 ? key.toLowerCase() : key

  if (PLAY_PAUSE_KEYS.has(lower) || (key === ' ' || key === 'Spacebar')) {
    player.setHasUserInteracted()
    if (audio.isPlaying()) audio.pause()
    else audio.play()
    return { handled: true }
  }

  if (ARROW_KEYS.has(key)) {
    switch (key) {
      case 'ArrowRight':
        player.next()
        return { handled: true }
      case 'ArrowLeft':
        player.prev()
        return { handled: true }
      case 'ArrowUp':
        player.setVolume(Math.min(MAX_VOLUME, player.volume + VOLUME_STEP))
        return { handled: true }
      case 'ArrowDown':
        player.setVolume(Math.max(MIN_VOLUME, player.volume - VOLUME_STEP))
        return { handled: true }
      default:
        return { handled: false }
    }
  }

  if (lower === 'm') {
    player.toggleMute()
    return { handled: true }
  }

  if (lower === 'f') {
    ui.setFullScreenPlayerOpen(!ui.fullScreenPlayerOpen)
    return { handled: true }
  }

  return { handled: false }
}

/**
 * Global keyboard shortcuts for the music player.
 *
 * - Space → play / pause
 * - ArrowRight → next track
 * - ArrowLeft → previous track
 * - ArrowUp / ArrowDown → volume up / down (5% step)
 * - M → toggle mute
 * - F → toggle fullscreen player
 *
 * Shortcuts are suppressed while typing in inputs, textareas, selects,
 * or contenteditable surfaces, and when any modifier key is held.
 */
export function useGlobalShortcuts(options: UseGlobalShortcutsOptions = {}): void {
  const { enabled = true } = options
  const enabledRef = useRef(enabled)
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!enabledRef.current) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      // activeElement is the authoritative focus owner; checking only it
      // avoids a redundant DOM walk through event.target (#M5).
      if (isEditableTarget(document.activeElement)) return

      const result = resolveShortcut(
        event.key,
        usePlayerStore.getState(),
        useUIStore.getState(),
        audioEngine
      )

      if (result.handled) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
