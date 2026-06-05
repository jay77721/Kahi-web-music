'use client'

import { useEffect, useRef, useState } from 'react'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="searchbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
].join(',')

function hasInteractiveFocus(): boolean {
  const active = document.activeElement
  if (!(active instanceof Element)) return false
  return active.closest(INTERACTIVE_SELECTOR) !== null
}

function useShortcutFocusGuard(): boolean {
  const [enabled, setEnabled] = useState(true)
  const focusOutHandleRef = useRef<number | null>(null)

  useEffect(() => {
    const updateEnabled = () => {
      focusOutHandleRef.current = null
      setEnabled(!hasInteractiveFocus())
    }

    const updateAfterFocusLeaves = () => {
      if (focusOutHandleRef.current !== null) {
        window.clearTimeout(focusOutHandleRef.current)
      }

      focusOutHandleRef.current = window.setTimeout(updateEnabled, 0)
    }

    updateEnabled()
    document.addEventListener('focusin', updateEnabled)
    document.addEventListener('focusout', updateAfterFocusLeaves)

    return () => {
      document.removeEventListener('focusin', updateEnabled)
      document.removeEventListener('focusout', updateAfterFocusLeaves)
      if (focusOutHandleRef.current !== null) {
        window.clearTimeout(focusOutHandleRef.current)
      }
    }
  }, [])

  return enabled
}

/**
 * Mounts the global keyboard shortcut listener at the application root.
 * Renders nothing — purely a side-effect component.
 */
export function GlobalShortcuts() {
  const enabled = useShortcutFocusGuard()
  useGlobalShortcuts({ enabled })
  return null
}
