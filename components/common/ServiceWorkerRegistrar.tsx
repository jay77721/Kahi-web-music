'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  applyServiceWorkerUpdate,
  registerServiceWorker,
} from '@/lib/sw-register'

/**
 * Mounts the Service Worker for the Kahi Music PWA shell.
 *
 * Renders nothing — purely a side-effect component placed once in the
 * root layout. When a new worker is detected, a Sonner toast offers
 * the user a one-click update.
 */
export function ServiceWorkerRegistrar() {
  const updatePromptedRef = useRef(false)

  useEffect(() => {
    const register = () => {
      void registerServiceWorker({
        onNeedRefresh: () => {
          if (updatePromptedRef.current) return
          updatePromptedRef.current = true
          offerUpdate()
        },
      })
    }

    // Register after hydration and preferably during idle time so the
    // shell's first paint and keyboard-ready controls are not delayed.
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(register, { timeout: 3000 })
      return () => {
        window.cancelIdleCallback(handle)
      }
    }

    const handle = globalThis.setTimeout(register, 0)

    return () => {
      globalThis.clearTimeout(handle)
    }
  }, [])

  return null
}

function offerUpdate(): void {
  toast('New version available', {
    description: 'Reload to apply the latest Kahi Music update.',
    duration: Number.POSITIVE_INFINITY,
    action: {
      label: 'Reload',
      onClick: () => {
        applyServiceWorkerUpdate()
        // The new worker activates on the next microtask; reload to be safe.
        window.setTimeout(() => window.location.reload(), 250)
      },
    },
    cancel: {
      label: 'Later',
      onClick: () => undefined,
    },
  })
}
