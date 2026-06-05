'use client'

import { useEffect, type ReactNode } from 'react'
import { STORAGE_KEYS } from '@/lib/storage'
import { useUIStore } from '@/stores/uiStore'

const THEME_STORAGE_EVENT_KEY = `kahi-web-music:${STORAGE_KEYS.THEME}`

/**
 * Theme attributes written to <html>. Kept as a string union to prevent
 * accidental arbitrary values that would skip the CSS override blocks.
 */
type ThemeAttribute = 'dark' | 'light'

/** Resolves a stored theme ('system' | 'dark' | 'light') to a concrete attribute. */
function resolveTheme(stored: 'dark' | 'light' | 'system', prefersDark: boolean): ThemeAttribute {
  if (stored === 'dark' || stored === 'light') return stored
  return prefersDark ? 'dark' : 'light'
}

/**
 * Subscribes to the UI store and reflects the active theme on the
 * <html> element via the `data-theme` attribute. The CSS in
 * `styles/tokens.css` keys off this attribute to swap tokens.
 *
 * - Listens to `prefers-color-scheme` changes when the user picked
 *   "system" so the page stays in sync with OS flips.
 * - Also exposes a small `storage` event handler so multiple open
 *   tabs converge on the same theme.
 * - The function is intentionally a noop during SSR — `document` is
 *   guarded before any DOM access.
 */
function useThemeAttribute(): void {
  const theme = useUIStore((state) => state.theme)

  useEffect(() => {
    useUIStore.getState().restoreTheme()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = (nextTheme = theme): void => {
      const attr = resolveTheme(nextTheme, media.matches)
      root.setAttribute('data-theme', attr)
    }
    const onMediaChange = (): void => {
      apply()
    }

    apply()
    media.addEventListener('change', onMediaChange)

    const onStorage = (event: StorageEvent): void => {
      if (event.key === THEME_STORAGE_EVENT_KEY) {
        useUIStore.getState().restoreTheme()
        apply(useUIStore.getState().theme)
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      media.removeEventListener('change', onMediaChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [theme])
}

interface ThemeProviderProps {
  children: ReactNode
}

/** Applies the active theme attribute to <html>. */
export function ThemeProvider({ children }: ThemeProviderProps): ReactNode {
  useThemeAttribute()
  return children
}
